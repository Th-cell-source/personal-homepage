"""第 4 步：LoRA 微调（学会小说人物"林晚"的语气）。

做法：冻结 SFT 模型的全部权重，只在注意力的 qkv/proj 与前馈 fc/proj 旁注入低秩矩阵，
只训练这些低秩参数（通常不到全量的 1%），最后把增量合并回原权重导出。
产物：training/artifacts/lora/{adapter.pt, adapter_config.json, merged.pt, metrics.json, samples.md}
"""

from __future__ import annotations

import json
import random
import time

import torch

from training import common
from training.minigpt import (
    LoRALinear,
    apply_lora,
    load_checkpoint,
    lora_parameters,
    merge_lora,
    save_checkpoint,
)

R = 8
ALPHA = 16
EPOCHS = 20
BATCH = 4
BLOCK = 192
LR = 3e-3
SYSTEM = "你是旧书店「长夜灯」的店主林晚。"

PROBE_QUESTIONS = [
    "你最近过得好吗？",
    "我有点想放弃写代码了。",
    "你为什么一直守着这家店？",
    "我明天要走了。",
]


def build_example(tok, rec: dict, block: int) -> tuple[list[int], list[int]]:
    prefix = f"<|user|>{rec['user']}"
    answer = f"<|assistant|>{rec['assistant']}<|end|>"
    ids_prompt = common.encode(tok, prefix)
    ids_answer = common.encode(tok, answer)
    ids = (ids_prompt + ids_answer)[: block + 1]
    labels = ([-100] * (len(ids_prompt) - 1) + ids_answer + [-100])[: len(ids)]
    return ids, labels


def make_batch(rows, tok, block, device, pad_id: int):
    xs, ys = zip(*[build_example(tok, r, block) for r in rows])
    width = max(len(x) for x in xs)
    xb = torch.full((len(xs), width), pad_id, dtype=torch.long)
    yb = torch.full((len(ys), width), -100, dtype=torch.long)
    for i, (x, y) in enumerate(zip(xs, ys)):
        xb[i, : len(x)] = torch.tensor(x)
        yb[i, : len(y)] = torch.tensor(y)
    return xb.to(device), yb.to(device)


def main() -> None:
    device = common.setup()
    tok = common.load_tokenizer()
    pad_id = tok.convert_tokens_to_ids("<pad>")

    rows = [
        json.loads(ln)
        for ln in (common.DATA / "style_sft.jsonl").read_text(encoding="utf-8").splitlines()
        if ln.strip()
    ]
    random.Random(7).shuffle(rows)
    n_val = 6
    val_rows, train_rows = rows[:n_val], rows[n_val:]
    print(f"角色对话样本 {len(rows)} 轮（训练 {len(train_rows)} / 验证 {len(val_rows)}）")

    model, _ = load_checkpoint(common.ARTIFACTS / "sft" / "best.pt")
    model.to(device)
    total_params = model.num_params()
    replaced = apply_lora(model, r=R, alpha=ALPHA, targets=("qkv", "proj", "fc"))
    params = lora_parameters(model)
    trainable = sum(p.numel() for p in params)
    print(f"LoRA 注入 {replaced} 个线性层，可训练参数 {trainable:,} / 全量 {total_params:,} "
          f"（{trainable / total_params * 100:.2f}%）")
    for n, p in model.named_parameters():
        p.requires_grad = "lora_" in n

    opt = torch.optim.AdamW(params, lr=LR, betas=(0.9, 0.95), weight_decay=0.0)
    steps_per_epoch = max(1, len(train_rows) // BATCH)
    total_steps = steps_per_epoch * EPOCHS
    history: list[dict] = []
    started = time.time()
    step = 0

    for epoch in range(1, EPOCHS + 1):
        random.Random(200 + epoch).shuffle(train_rows)
        for i in range(0, len(train_rows) - BATCH + 1, BATCH):
            xb, yb = make_batch(train_rows[i : i + BATCH], tok, BLOCK, device, pad_id)
            _, loss = model(xb, yb)
            opt.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(params, 1.0)
            for g in opt.param_groups:
                g["lr"] = common.cosine_lr(step, total_steps, LR, 3)
            opt.step()
            step += 1
            print(f"epoch {epoch} step {step}/{total_steps} loss {loss.item():.4f}", flush=True)

        model.eval()
        with torch.no_grad():
            vx, vy = make_batch(val_rows, tok, BLOCK, device, pad_id)
            _, vl = model(vx, vy)
        print(f"  ↳ 验证损失 {vl.item():.4f}", flush=True)
        history.append({"step": step, "epoch": epoch, "train_loss": round(loss.item(), 4),
                        "val_loss": round(float(vl), 4)})
        model.train()

    # 1) 保存适配器（只存 LoRA 参数，体积很小，可单独分发）
    out = common.ARTIFACTS / "lora"
    out.mkdir(parents=True, exist_ok=True)
    adapter = {n: p.detach().clone() for n, p in model.named_parameters() if "lora_" in n}
    torch.save(adapter, out / "adapter.pt")
    (out / "adapter_config.json").write_text(
        json.dumps(
            {
                "peft_type": "LORA",
                "task_type": "CAUSAL_LM",
                "r": R,
                "lora_alpha": ALPHA,
                "lora_dropout": 0.0,
                "target_modules": ["qkv", "proj", "fc"],
                "bias": "none",
                "base_model_name_or_path": "zhiyu-tiny-sft",
                "trainable_params": trainable,
                "total_params": total_params,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"适配器体积 {sum(v.numel() for v in adapter.values()) * 4 / 1024:.0f} KB")

    # 2) 合并后导出一个可以直接推理的完整模型
    samples = []
    for q in PROBE_QUESTIONS:
        ans = common.sample_answer(model, tok, q, device, max_new_tokens=60, temperature=0.75)
        samples.append({"question": q, "answer": ans})
        print(f"\nQ: {q}\nA: {ans}\n")

    merged = merge_lora(model)
    save_checkpoint(merged, out / "merged.pt", extra={"stage": "lora-merged", "base": "sft"})

    (out / "samples.md").write_text(
        "\n\n".join(f"**Q：{s['question']}**\n\nA：{s['answer']}" for s in samples), encoding="utf-8"
    )
    metrics = {
        "stage": "lora",
        "r": R,
        "alpha": ALPHA,
        "epochs": EPOCHS,
        "train_samples": len(train_rows),
        "trainable_params": trainable,
        "total_params": total_params,
        "trainable_ratio": round(trainable / total_params, 5),
        "final_train_loss": round(history[-1]["train_loss"], 4),
        "final_val_loss": round(history[-1]["val_loss"], 4),
        "adapter_kb": round(sum(v.numel() for v in adapter.values()) * 4 / 1024, 1),
        "elapsed_sec": round(time.time() - started, 1),
        "device": str(device),
    }
    common.save_metrics(out / "metrics.json", metrics)
    common.draw_loss_curve(history, out / "loss_curve.png", "LoRA 微调损失曲线（林晚语气）")
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
