"""第 2 步：预训练（下一词元预测）。

数据：training/data/processed/pretrain_train.txt（验证集独立，不参与训练）
模型：MiniGPT，约 175 万参数，CPU 可训
产物：training/artifacts/pretrain/{best.pt, metrics.json, loss_curve.png, train.log.jsonl}
"""

from __future__ import annotations

import json
import time

import torch

from training import common
from training.minigpt import GPTConfig, MiniGPT, save_checkpoint

STEPS = 600
BATCH = 8
BLOCK = 192
LR = 2.5e-3
WARMUP = 60
EVAL_EVERY = 50
# 语料只有万字级，前几十步验证损失最低往往是因为"还没学到东西"，因此从 60% 进度
# 之后才开始比较检查点；这是小语料下常见的做法，报告里也如实写了。
CKPT_MIN_STEP = int(STEPS * 0.6)
OUT = common.ARTIFACTS / "pretrain"


def main() -> None:
    device = common.setup()
    tok = common.load_tokenizer()
    eos = tok.convert_tokens_to_ids("<eos>")
    train_data = common.build_stream(tok, common.DATA / "pretrain_train.txt", eos)
    val_data = common.build_stream(tok, common.DATA / "pretrain_val.txt", eos)
    print(f"训练集 {len(train_data)} 词元 / 验证集 {len(val_data)} 词元 / 设备 {device}")

    cfg = GPTConfig(vocab_size=len(tok), block_size=BLOCK, n_layer=3, n_head=4, n_embd=192, dropout=0.1)
    model = MiniGPT(cfg).to(device)
    print(f"参数量：{model.num_params() / 1e6:.2f}M")

    decay = [p for p in model.parameters() if p.requires_grad and p.dim() >= 2]
    no_decay = [p for p in model.parameters() if p.requires_grad and p.dim() < 2]
    opt = torch.optim.AdamW(
        [{"params": decay, "weight_decay": 0.05}, {"params": no_decay, "weight_decay": 0.0}],
        lr=LR,
        betas=(0.9, 0.95),
    )

    history: list[dict] = []
    best_val = float("inf")
    log_path = OUT / "train.log.jsonl"
    if log_path.exists():
        log_path.unlink()
    started = time.time()

    for step in range(STEPS + 1):
        lr = common.cosine_lr(step, STEPS, LR, WARMUP)
        for g in opt.param_groups:
            g["lr"] = lr
        x, y = common.get_batch(train_data, BLOCK, BATCH, device)
        _, loss = model(x, y)
        opt.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()

        if step % 10 == 0:
            row = {"step": step, "lr": round(lr, 6), "train_loss": round(loss.item(), 4)}
            print(
                f"step {step:4d}/{STEPS}  lr {lr:.2e}  loss {loss.item():.4f}  "
                f"ppl {torch.exp(loss).item():.1f}  {(time.time() - started):.0f}s",
                flush=True,
            )
        else:
            row = {"step": step, "train_loss": round(loss.item(), 4)}

        if step % EVAL_EVERY == 0 and step > 0:
            val_loss = common.evaluate(model, val_data, BLOCK, BATCH, device)
            row["val_loss"] = round(val_loss, 4)
            row["val_ppl"] = round(float(torch.exp(torch.tensor(val_loss))), 2)
            print(f"  ↳ 验证损失 {val_loss:.4f}（困惑度 {row['val_ppl']}）", flush=True)
            if step >= CKPT_MIN_STEP and val_loss < best_val:
                best_val = val_loss
                save_checkpoint(
                    model,
                    OUT / "best.pt",
                    extra={"stage": "pretrain", "step": step, "val_loss": val_loss, "num_params": model.num_params()},
                )
                print(f"  ↳ 保存最优检查点 val_loss={val_loss:.4f}", flush=True)
        history.append(row)
        common.append_log(log_path, row)

    total = time.time() - started
    save_checkpoint(
        model, OUT / "last.pt", extra={"stage": "pretrain-last", "step": STEPS, "num_params": model.num_params()}
    )
    metrics = {
        "stage": "pretrain",
        "steps": STEPS,
        "batch_size": BATCH,
        "block_size": BLOCK,
        "lr": LR,
        "vocab_size": len(tok),
        "num_params": model.num_params(),
        "train_tokens": int(len(train_data)),
        "val_tokens": int(len(val_data)),
        "best_val_loss": round(best_val, 4),
        "best_val_ppl": round(float(torch.exp(torch.tensor(best_val))), 2),
        "final_train_loss": round(history[-1].get("train_loss", 0), 4),
        "elapsed_sec": round(total, 1),
        "device": str(device),
    }
    common.save_metrics(OUT / "metrics.json", metrics)
    common.draw_loss_curve(history, OUT / "loss_curve.png", "预训练损失曲线（MiniGPT · 中文百科语料）")
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
