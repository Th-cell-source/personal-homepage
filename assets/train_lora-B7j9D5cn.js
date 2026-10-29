const r=`"""第 4 步：LoRA 微调（学会小说人物"林晚"的语气）。\r
\r
做法：冻结 SFT 模型的全部权重，只在注意力的 qkv/proj 与前馈 fc/proj 旁注入低秩矩阵，\r
只训练这些低秩参数（通常不到全量的 1%），最后把增量合并回原权重导出。\r
产物：training/artifacts/lora/{adapter.pt, adapter_config.json, merged.pt, metrics.json, samples.md}\r
"""\r
\r
from __future__ import annotations\r
\r
import json\r
import random\r
import time\r
\r
import torch\r
\r
from training import common\r
from training.minigpt import (\r
    LoRALinear,\r
    apply_lora,\r
    load_checkpoint,\r
    lora_parameters,\r
    merge_lora,\r
    save_checkpoint,\r
)\r
\r
R = 8\r
ALPHA = 16\r
EPOCHS = 20\r
BATCH = 4\r
BLOCK = 192\r
LR = 3e-3\r
SYSTEM = "你是旧书店「长夜灯」的店主林晚。"\r
\r
PROBE_QUESTIONS = [\r
    "你最近过得好吗？",\r
    "我有点想放弃写代码了。",\r
    "你为什么一直守着这家店？",\r
    "我明天要走了。",\r
]\r
\r
\r
def build_example(tok, rec: dict, block: int) -> tuple[list[int], list[int]]:\r
    prefix = f"<|user|>{rec['user']}"\r
    answer = f"<|assistant|>{rec['assistant']}<|end|>"\r
    ids_prompt = common.encode(tok, prefix)\r
    ids_answer = common.encode(tok, answer)\r
    ids = (ids_prompt + ids_answer)[: block + 1]\r
    labels = ([-100] * (len(ids_prompt) - 1) + ids_answer + [-100])[: len(ids)]\r
    return ids, labels\r
\r
\r
def make_batch(rows, tok, block, device, pad_id: int):\r
    xs, ys = zip(*[build_example(tok, r, block) for r in rows])\r
    width = max(len(x) for x in xs)\r
    xb = torch.full((len(xs), width), pad_id, dtype=torch.long)\r
    yb = torch.full((len(ys), width), -100, dtype=torch.long)\r
    for i, (x, y) in enumerate(zip(xs, ys)):\r
        xb[i, : len(x)] = torch.tensor(x)\r
        yb[i, : len(y)] = torch.tensor(y)\r
    return xb.to(device), yb.to(device)\r
\r
\r
def main() -> None:\r
    device = common.setup()\r
    tok = common.load_tokenizer()\r
    pad_id = tok.convert_tokens_to_ids("<pad>")\r
\r
    rows = [\r
        json.loads(ln)\r
        for ln in (common.DATA / "style_sft.jsonl").read_text(encoding="utf-8").splitlines()\r
        if ln.strip()\r
    ]\r
    random.Random(7).shuffle(rows)\r
    n_val = 6\r
    val_rows, train_rows = rows[:n_val], rows[n_val:]\r
    print(f"角色对话样本 {len(rows)} 轮（训练 {len(train_rows)} / 验证 {len(val_rows)}）")\r
\r
    model, _ = load_checkpoint(common.ARTIFACTS / "sft" / "best.pt")\r
    model.to(device)\r
    total_params = model.num_params()\r
    replaced = apply_lora(model, r=R, alpha=ALPHA, targets=("qkv", "proj", "fc"))\r
    params = lora_parameters(model)\r
    trainable = sum(p.numel() for p in params)\r
    print(f"LoRA 注入 {replaced} 个线性层，可训练参数 {trainable:,} / 全量 {total_params:,} "\r
          f"（{trainable / total_params * 100:.2f}%）")\r
    for n, p in model.named_parameters():\r
        p.requires_grad = "lora_" in n\r
\r
    opt = torch.optim.AdamW(params, lr=LR, betas=(0.9, 0.95), weight_decay=0.0)\r
    steps_per_epoch = max(1, len(train_rows) // BATCH)\r
    total_steps = steps_per_epoch * EPOCHS\r
    history: list[dict] = []\r
    started = time.time()\r
    step = 0\r
\r
    for epoch in range(1, EPOCHS + 1):\r
        random.Random(200 + epoch).shuffle(train_rows)\r
        for i in range(0, len(train_rows) - BATCH + 1, BATCH):\r
            xb, yb = make_batch(train_rows[i : i + BATCH], tok, BLOCK, device, pad_id)\r
            _, loss = model(xb, yb)\r
            opt.zero_grad(set_to_none=True)\r
            loss.backward()\r
            torch.nn.utils.clip_grad_norm_(params, 1.0)\r
            for g in opt.param_groups:\r
                g["lr"] = common.cosine_lr(step, total_steps, LR, 3)\r
            opt.step()\r
            step += 1\r
            print(f"epoch {epoch} step {step}/{total_steps} loss {loss.item():.4f}", flush=True)\r
\r
        model.eval()\r
        with torch.no_grad():\r
            vx, vy = make_batch(val_rows, tok, BLOCK, device, pad_id)\r
            _, vl = model(vx, vy)\r
        print(f"  ↳ 验证损失 {vl.item():.4f}", flush=True)\r
        history.append({"step": step, "epoch": epoch, "train_loss": round(loss.item(), 4),\r
                        "val_loss": round(float(vl), 4)})\r
        model.train()\r
\r
    # 1) 保存适配器（只存 LoRA 参数，体积很小，可单独分发）\r
    out = common.ARTIFACTS / "lora"\r
    out.mkdir(parents=True, exist_ok=True)\r
    adapter = {n: p.detach().clone() for n, p in model.named_parameters() if "lora_" in n}\r
    torch.save(adapter, out / "adapter.pt")\r
    (out / "adapter_config.json").write_text(\r
        json.dumps(\r
            {\r
                "peft_type": "LORA",\r
                "task_type": "CAUSAL_LM",\r
                "r": R,\r
                "lora_alpha": ALPHA,\r
                "lora_dropout": 0.0,\r
                "target_modules": ["qkv", "proj", "fc"],\r
                "bias": "none",\r
                "base_model_name_or_path": "zhiyu-tiny-sft",\r
                "trainable_params": trainable,\r
                "total_params": total_params,\r
            },\r
            ensure_ascii=False,\r
            indent=2,\r
        ),\r
        encoding="utf-8",\r
    )\r
    print(f"适配器体积 {sum(v.numel() for v in adapter.values()) * 4 / 1024:.0f} KB")\r
\r
    # 2) 合并后导出一个可以直接推理的完整模型\r
    samples = []\r
    for q in PROBE_QUESTIONS:\r
        ans = common.sample_answer(model, tok, q, device, max_new_tokens=60, temperature=0.75)\r
        samples.append({"question": q, "answer": ans})\r
        print(f"\\nQ: {q}\\nA: {ans}\\n")\r
\r
    merged = merge_lora(model)\r
    save_checkpoint(merged, out / "merged.pt", extra={"stage": "lora-merged", "base": "sft"})\r
\r
    (out / "samples.md").write_text(\r
        "\\n\\n".join(f"**Q：{s['question']}**\\n\\nA：{s['answer']}" for s in samples), encoding="utf-8"\r
    )\r
    metrics = {\r
        "stage": "lora",\r
        "r": R,\r
        "alpha": ALPHA,\r
        "epochs": EPOCHS,\r
        "train_samples": len(train_rows),\r
        "trainable_params": trainable,\r
        "total_params": total_params,\r
        "trainable_ratio": round(trainable / total_params, 5),\r
        "final_train_loss": round(history[-1]["train_loss"], 4),\r
        "final_val_loss": round(history[-1]["val_loss"], 4),\r
        "adapter_kb": round(sum(v.numel() for v in adapter.values()) * 4 / 1024, 1),\r
        "elapsed_sec": round(time.time() - started, 1),\r
        "device": str(device),\r
    }\r
    common.save_metrics(out / "metrics.json", metrics)\r
    common.draw_loss_curve(history, out / "loss_curve.png", "LoRA 微调损失曲线（林晚语气）")\r
    print(json.dumps(metrics, ensure_ascii=False, indent=2))\r
\r
\r
if __name__ == "__main__":\r
    main()\r
`;export{r as default};
