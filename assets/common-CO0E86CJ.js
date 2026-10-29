const r=`"""训练公用工具：设备、分词器加载、批次取样、学习率调度、曲线绘制、生成采样。"""\r
\r
from __future__ import annotations\r
\r
import json\r
import math\r
import os\r
import random\r
import time\r
from pathlib import Path\r
\r
import torch\r
\r
ROOT = Path(__file__).resolve().parent\r
DATA = ROOT / "data" / "processed"\r
ARTIFACTS = ROOT / "artifacts"\r
TOKENIZER_DIR = ARTIFACTS / "tokenizer"\r
\r
PROMPT_TEMPLATE = "<|user|>{q}<|assistant|>"\r
\r
\r
def setup(seed: int = 2026) -> torch.device:\r
    random.seed(seed)\r
    torch.manual_seed(seed)\r
    torch.set_num_threads(max(1, (os.cpu_count() or 4)))\r
    torch.set_float32_matmul_precision("high")\r
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")\r
\r
\r
def load_tokenizer(which: str = "tokenizer"):\r
    from transformers import AutoTokenizer\r
\r
    path = TOKENIZER_DIR if which == "tokenizer" else ARTIFACTS / which\r
    tok = AutoTokenizer.from_pretrained(str(path), use_fast=True)\r
    return tok\r
\r
\r
def encode(tok, text: str) -> list[int]:\r
    return tok(text, add_special_tokens=False)["input_ids"]\r
\r
\r
def build_stream(tok, path: Path, eos_id: int) -> torch.Tensor:\r
    """把纯文本语料编码成一条长张量（文档之间插入 <eos> 作为分隔）。"""\r
    ids: list[int] = []\r
    for line in path.read_text(encoding="utf-8").splitlines():\r
        line = line.strip()\r
        if not line:\r
            continue\r
        ids.extend(encode(tok, line))\r
        ids.append(eos_id)\r
    return torch.tensor(ids, dtype=torch.long)\r
\r
\r
def get_batch(data: torch.Tensor, block: int, batch: int, device) -> tuple[torch.Tensor, torch.Tensor]:\r
    ix = torch.randint(len(data) - block - 1, (batch,))\r
    x = torch.stack([data[i : i + block] for i in ix])\r
    y = torch.stack([data[i + 1 : i + 1 + block] for i in ix])\r
    return x.to(device), y.to(device)\r
\r
\r
def cosine_lr(step: int, total: int, base_lr: float, warmup: int, min_ratio: float = 0.1) -> float:\r
    if step < warmup:\r
        return base_lr * (step + 1) / warmup\r
    if step >= total:\r
        return base_lr * min_ratio\r
    progress = (step - warmup) / max(1, total - warmup)\r
    return base_lr * (min_ratio + (1 - min_ratio) * 0.5 * (1 + math.cos(math.pi * progress)))\r
\r
\r
@torch.no_grad()\r
def evaluate(model, data: torch.Tensor, block: int, batch: int, device, iters: int = 20) -> float:\r
    model.eval()\r
    losses = []\r
    for _ in range(iters):\r
        x, y = get_batch(data, block, batch, device)\r
        _, loss = model(x, y)\r
        losses.append(loss.item())\r
    model.train()\r
    return sum(losses) / len(losses)\r
\r
\r
def save_metrics(path: Path, metrics: dict) -> None:\r
    path.parent.mkdir(parents=True, exist_ok=True)\r
    path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")\r
\r
\r
def append_log(path: Path, row: dict) -> None:\r
    path.parent.mkdir(parents=True, exist_ok=True)\r
    with path.open("a", encoding="utf-8") as f:\r
        f.write(json.dumps(row, ensure_ascii=False) + "\\n")\r
\r
\r
# --------------------------------------------------------------------------- #\r
# 损失曲线（不依赖 matplotlib，用 Pillow 直接画，产物可直接放进报告/PPT）\r
# --------------------------------------------------------------------------- #\r
\r
\r
def draw_loss_curve(history: list[dict], out_png: Path, title: str) -> Path:\r
    from PIL import Image, ImageDraw, ImageFont\r
\r
    W, H, PAD = 1000, 560, 70\r
    img = Image.new("RGB", (W, H), "white")\r
    d = ImageDraw.Draw(img)\r
    try:\r
        font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 18)\r
        small = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 14)\r
    except OSError:\r
        font = ImageFont.load_default()\r
        small = font\r
\r
    train = [(h["step"], h["train_loss"]) for h in history if "train_loss" in h]\r
    val = [(h["step"], h["val_loss"]) for h in history if "val_loss" in h]\r
    if not train:\r
        return out_png\r
    xs = [p[0] for p in train] + [p[0] for p in val]\r
    ys = [p[1] for p in train] + [p[1] for p in val]\r
    x0, x1, y0, y1 = min(xs), max(xs) or 1, 0.0, max(ys) * 1.15\r
\r
    d.rectangle([PAD, PAD, W - 30, H - PAD], outline=(210, 214, 222))\r
    for i in range(5):\r
        gy = H - PAD - (H - 2 * PAD) * i / 4\r
        d.line([PAD, gy, W - 30, gy], fill=(238, 240, 244))\r
        d.text((12, gy - 8), f"{y1 * i / 4:.2f}", fill=(120, 126, 138), font=small)\r
\r
    def px(step: int) -> float:\r
        return PAD + (W - 30 - PAD) * (step - x0) / max(1, x1 - x0)\r
\r
    def py(loss: float) -> float:\r
        return H - PAD - (H - 2 * PAD) * loss / max(1e-9, y1)\r
\r
    if len(train) > 1:\r
        d.line([(px(s), py(l)) for s, l in train], fill=(37, 99, 235), width=3)\r
    if len(val) > 1:\r
        d.line([(px(s), py(l)) for s, l in val], fill=(239, 68, 68), width=3)\r
        for s, l in val:\r
            d.ellipse([px(s) - 4, py(l) - 4, px(s) + 4, py(l) + 4], fill=(239, 68, 68))\r
    d.text((PAD, 24), title, fill=(17, 24, 39), font=font)\r
    d.text((W - 250, 26), "训练损失", fill=(37, 99, 235), font=small)\r
    d.text((W - 160, 26), "验证损失", fill=(239, 68, 68), font=small)\r
    d.text((W // 2 - 20, H - 42), "step", fill=(120, 126, 138), font=small)\r
    out_png.parent.mkdir(parents=True, exist_ok=True)\r
    img.save(out_png)\r
    return out_png\r
\r
\r
# --------------------------------------------------------------------------- #\r
# 采样：给一个提示，生成回答（训练脚本与评测脚本共用）\r
# --------------------------------------------------------------------------- #\r
\r
\r
def build_prompt(tok, question: str, system: str | None = None) -> list[int]:\r
    text = PROMPT_TEMPLATE.format(q=question)\r
    if system:\r
        text = f"<|system|>{system}" + text\r
    return encode(tok, text)\r
\r
\r
@torch.no_grad()\r
def sample_answer(\r
    model,\r
    tok,\r
    question: str,\r
    device,\r
    max_new_tokens: int = 60,\r
    temperature: float = 0.8,\r
    top_p: float = 0.9,\r
    system: str | None = None,\r
) -> str:\r
    ids = build_prompt(tok, question, system)\r
    idx = torch.tensor([ids], dtype=torch.long, device=device)\r
    out = model.generate(\r
        idx,\r
        max_new_tokens=max_new_tokens,\r
        temperature=temperature,\r
        top_p=top_p,\r
        repetition_penalty=1.25,\r
        eos_id=tok.convert_tokens_to_ids("<|end|>"),\r
        stop_ids=(tok.convert_tokens_to_ids("<|user|>"), tok.convert_tokens_to_ids("<|assistant|>")),\r
    )\r
    new = out[0][len(ids) :].tolist()\r
    text = tok.decode(new, skip_special_tokens=True)\r
    return text.strip()\r
\r
\r
def timer() -> float:\r
    return time.time()\r
`;export{r as default};
