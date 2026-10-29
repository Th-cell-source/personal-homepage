"""第 3 步：指令微调（SFT）。

与预训练的区别：数据是"问题 -> 回答"成对样本，只在回答部分计算损失（问题部分 mask 为 -100）。
产物：training/artifacts/sft/{best.pt, metrics.json, loss_curve.png, samples.md}
"""

from __future__ import annotations

import argparse
import json
import random
import time

import torch

from training import common
from training.minigpt import MiniGPT, load_checkpoint, save_checkpoint

EPOCHS = 5
BATCH = 4
BLOCK = 192
LR = 8e-4

PROBE_QUESTIONS = [
    "你是谁？",
    "什么是物联网？",
    "为什么用字节级 BPE 分词？",
    "答辩要注意什么？",
]


def build_example(tok, rec: dict, block: int) -> tuple[list[int], list[int]]:
    prefix = f"<|user|>{rec['user']}"
    answer = f"<|assistant|>{rec['assistant']}<|end|>"
    ids_prompt = common.encode(tok, prefix)
    ids_answer = common.encode(tok, answer)
    ids = (ids_prompt + ids_answer)[: block + 1]
    # 关键：位置 t 的标签必须是"下一个"词元 ids[t+1]，否则模型只会学会复制输入。
    # 问题部分与句尾都置 -100，不参与损失。
    labels = ([-100] * (len(ids_prompt) - 1) + ids_answer + [-100])[: len(ids)]
    return ids, labels


def make_batch(rows, tok, block, device, pad_id: int):
    xs, ys = [], []
    for rec in rows:
        x, y = build_example(tok, rec, block)
        xs.append(x)
        ys.append(y)
    width = max(len(x) for x in xs)
    xb = torch.full((len(xs), width), pad_id, dtype=torch.long)
    yb = torch.full((len(ys), width), -100, dtype=torch.long)
    for i, (x, y) in enumerate(zip(xs, ys)):
        xb[i, : len(x)] = torch.tensor(x)
        yb[i, : len(y)] = torch.tensor(y)
    return xb.to(device), yb.to(device)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--init", default="best.pt", help="预训练检查点文件名（best.pt / last.pt）")
    parser.add_argument("--out", default="sft", help="输出目录名")
    args = parser.parse_args()

    device = common.setup()
    tok = common.load_tokenizer()
    out_dir = common.ARTIFACTS / args.out
    pad_id = tok.convert_tokens_to_ids("<pad>")

    rows = [json.loads(ln) for ln in (common.DATA / "sft.jsonl").read_text(encoding="utf-8").splitlines() if ln.strip()]
    random.Random(2026).shuffle(rows)
    n_val = max(6, len(rows) // 10)
    val_rows, train_rows = rows[:n_val], rows[n_val:]
    print(f"指令样本 {len(rows)} 条（训练 {len(train_rows)} / 验证 {len(val_rows)}）")

    model, _ = load_checkpoint(common.ARTIFACTS / "pretrain" / args.init)
    model.to(device).train()
    print(f"从预训练检查点继续，参数量 {model.num_params() / 1e6:.2f}M")

    opt = torch.optim.AdamW(model.parameters(), lr=LR, betas=(0.9, 0.95), weight_decay=0.01)
    steps_per_epoch = max(1, len(train_rows) // BATCH)
    total_steps = steps_per_epoch * EPOCHS
    history: list[dict] = []
    best_val = float("inf")
    started = time.time()
    step = 0

    for epoch in range(1, EPOCHS + 1):
        random.Random(100 + epoch).shuffle(train_rows)
        for i in range(0, len(train_rows) - BATCH + 1, BATCH):
            rows_batch = train_rows[i : i + BATCH]
            xb, yb = make_batch(rows_batch, tok, BLOCK, device, pad_id)
            _, loss = model(xb, yb)
            opt.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            for g in opt.param_groups:
                g["lr"] = common.cosine_lr(step, total_steps, LR, 5)
            opt.step()
            step += 1
            print(f"epoch {epoch} step {step}/{total_steps} loss {loss.item():.4f}", flush=True)

        # 每轮结束在验证集上评估，只对回答部分算损失，指标更贴近实际效果
        model.eval()
        with torch.no_grad():
            val_loss = 0.0
            for i in range(0, len(val_rows), BATCH):
                xb, yb = make_batch(val_rows[i : i + BATCH], tok, BLOCK, device, pad_id)
                _, l = model(xb, yb)
                val_loss += l.item()
            val_loss /= max(1, (len(val_rows) + BATCH - 1) // BATCH)
        val_ppl = float(torch.exp(torch.tensor(val_loss)))
        print(f"  ↳ 验证损失 {val_loss:.4f}（困惑度 {val_ppl:.2f}）", flush=True)
        row = {"step": step, "epoch": epoch, "train_loss": round(loss.item(), 4),
               "val_loss": round(val_loss, 4), "val_ppl": round(val_ppl, 2)}
        history.append(row)
        if val_loss < best_val:
            best_val = val_loss
            save_checkpoint(
                model,
                out_dir / "best.pt",
                extra={"stage": "sft", "epoch": epoch, "val_loss": val_loss, "num_params": model.num_params()},
            )
        model.train()

    samples = []
    for q in PROBE_QUESTIONS:
        ans = common.sample_answer(model, tok, q, device, max_new_tokens=80, temperature=0.7)
        samples.append({"question": q, "answer": ans})
        print(f"\nQ: {q}\nA: {ans}\n")

    (out_dir).mkdir(parents=True, exist_ok=True)
    (out_dir / "samples.md").write_text(
        "\n\n".join(f"**Q：{s['question']}**\n\nA：{s['answer']}" for s in samples), encoding="utf-8"
    )
    metrics = {
        "stage": "sft",
        "epochs": EPOCHS,
        "batch_size": BATCH,
        "lr": LR,
        "train_samples": len(train_rows),
        "val_samples": len(val_rows),
        "steps": total_steps,
        "best_val_loss": round(best_val, 4),
        "best_val_ppl": round(float(torch.exp(torch.tensor(best_val))), 2),
        "elapsed_sec": round(time.time() - started, 1),
        "device": str(device),
    }
    common.save_metrics(out_dir / "metrics.json", metrics)
    common.draw_loss_curve(history, out_dir / "loss_curve.png", "指令微调损失曲线（SFT）")
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
