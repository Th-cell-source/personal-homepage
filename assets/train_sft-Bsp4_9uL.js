const r=`"""第 3 步：指令微调（SFT）。\r
\r
与预训练的区别：数据是"问题 -> 回答"成对样本，只在回答部分计算损失（问题部分 mask 为 -100）。\r
产物：training/artifacts/sft/{best.pt, metrics.json, loss_curve.png, samples.md}\r
"""\r
\r
from __future__ import annotations\r
\r
import argparse\r
import json\r
import random\r
import time\r
\r
import torch\r
\r
from training import common\r
from training.minigpt import MiniGPT, load_checkpoint, save_checkpoint\r
\r
EPOCHS = 5\r
BATCH = 4\r
BLOCK = 192\r
LR = 8e-4\r
\r
PROBE_QUESTIONS = [\r
    "你是谁？",\r
    "什么是物联网？",\r
    "为什么用字节级 BPE 分词？",\r
    "答辩要注意什么？",\r
]\r
\r
\r
def build_example(tok, rec: dict, block: int) -> tuple[list[int], list[int]]:\r
    prefix = f"<|user|>{rec['user']}"\r
    answer = f"<|assistant|>{rec['assistant']}<|end|>"\r
    ids_prompt = common.encode(tok, prefix)\r
    ids_answer = common.encode(tok, answer)\r
    ids = (ids_prompt + ids_answer)[: block + 1]\r
    # 关键：位置 t 的标签必须是"下一个"词元 ids[t+1]，否则模型只会学会复制输入。\r
    # 问题部分与句尾都置 -100，不参与损失。\r
    labels = ([-100] * (len(ids_prompt) - 1) + ids_answer + [-100])[: len(ids)]\r
    return ids, labels\r
\r
\r
def make_batch(rows, tok, block, device, pad_id: int):\r
    xs, ys = [], []\r
    for rec in rows:\r
        x, y = build_example(tok, rec, block)\r
        xs.append(x)\r
        ys.append(y)\r
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
    parser = argparse.ArgumentParser()\r
    parser.add_argument("--init", default="best.pt", help="预训练检查点文件名（best.pt / last.pt）")\r
    parser.add_argument("--out", default="sft", help="输出目录名")\r
    args = parser.parse_args()\r
\r
    device = common.setup()\r
    tok = common.load_tokenizer()\r
    out_dir = common.ARTIFACTS / args.out\r
    pad_id = tok.convert_tokens_to_ids("<pad>")\r
\r
    rows = [json.loads(ln) for ln in (common.DATA / "sft.jsonl").read_text(encoding="utf-8").splitlines() if ln.strip()]\r
    random.Random(2026).shuffle(rows)\r
    n_val = max(6, len(rows) // 10)\r
    val_rows, train_rows = rows[:n_val], rows[n_val:]\r
    print(f"指令样本 {len(rows)} 条（训练 {len(train_rows)} / 验证 {len(val_rows)}）")\r
\r
    model, _ = load_checkpoint(common.ARTIFACTS / "pretrain" / args.init)\r
    model.to(device).train()\r
    print(f"从预训练检查点继续，参数量 {model.num_params() / 1e6:.2f}M")\r
\r
    opt = torch.optim.AdamW(model.parameters(), lr=LR, betas=(0.9, 0.95), weight_decay=0.01)\r
    steps_per_epoch = max(1, len(train_rows) // BATCH)\r
    total_steps = steps_per_epoch * EPOCHS\r
    history: list[dict] = []\r
    best_val = float("inf")\r
    started = time.time()\r
    step = 0\r
\r
    for epoch in range(1, EPOCHS + 1):\r
        random.Random(100 + epoch).shuffle(train_rows)\r
        for i in range(0, len(train_rows) - BATCH + 1, BATCH):\r
            rows_batch = train_rows[i : i + BATCH]\r
            xb, yb = make_batch(rows_batch, tok, BLOCK, device, pad_id)\r
            _, loss = model(xb, yb)\r
            opt.zero_grad(set_to_none=True)\r
            loss.backward()\r
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)\r
            for g in opt.param_groups:\r
                g["lr"] = common.cosine_lr(step, total_steps, LR, 5)\r
            opt.step()\r
            step += 1\r
            print(f"epoch {epoch} step {step}/{total_steps} loss {loss.item():.4f}", flush=True)\r
\r
        # 每轮结束在验证集上评估，只对回答部分算损失，指标更贴近实际效果\r
        model.eval()\r
        with torch.no_grad():\r
            val_loss = 0.0\r
            for i in range(0, len(val_rows), BATCH):\r
                xb, yb = make_batch(val_rows[i : i + BATCH], tok, BLOCK, device, pad_id)\r
                _, l = model(xb, yb)\r
                val_loss += l.item()\r
            val_loss /= max(1, (len(val_rows) + BATCH - 1) // BATCH)\r
        val_ppl = float(torch.exp(torch.tensor(val_loss)))\r
        print(f"  ↳ 验证损失 {val_loss:.4f}（困惑度 {val_ppl:.2f}）", flush=True)\r
        row = {"step": step, "epoch": epoch, "train_loss": round(loss.item(), 4),\r
               "val_loss": round(val_loss, 4), "val_ppl": round(val_ppl, 2)}\r
        history.append(row)\r
        if val_loss < best_val:\r
            best_val = val_loss\r
            save_checkpoint(\r
                model,\r
                out_dir / "best.pt",\r
                extra={"stage": "sft", "epoch": epoch, "val_loss": val_loss, "num_params": model.num_params()},\r
            )\r
        model.train()\r
\r
    samples = []\r
    for q in PROBE_QUESTIONS:\r
        ans = common.sample_answer(model, tok, q, device, max_new_tokens=80, temperature=0.7)\r
        samples.append({"question": q, "answer": ans})\r
        print(f"\\nQ: {q}\\nA: {ans}\\n")\r
\r
    (out_dir).mkdir(parents=True, exist_ok=True)\r
    (out_dir / "samples.md").write_text(\r
        "\\n\\n".join(f"**Q：{s['question']}**\\n\\nA：{s['answer']}" for s in samples), encoding="utf-8"\r
    )\r
    metrics = {\r
        "stage": "sft",\r
        "epochs": EPOCHS,\r
        "batch_size": BATCH,\r
        "lr": LR,\r
        "train_samples": len(train_rows),\r
        "val_samples": len(val_rows),\r
        "steps": total_steps,\r
        "best_val_loss": round(best_val, 4),\r
        "best_val_ppl": round(float(torch.exp(torch.tensor(best_val))), 2),\r
        "elapsed_sec": round(time.time() - started, 1),\r
        "device": str(device),\r
    }\r
    common.save_metrics(out_dir / "metrics.json", metrics)\r
    common.draw_loss_curve(history, out_dir / "loss_curve.png", "指令微调损失曲线（SFT）")\r
    print(json.dumps(metrics, ensure_ascii=False, indent=2))\r
\r
\r
if __name__ == "__main__":\r
    main()\r
`;export{r as default};
