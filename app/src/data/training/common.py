"""训练公用工具：设备、分词器加载、批次取样、学习率调度、曲线绘制、生成采样。"""

from __future__ import annotations

import json
import math
import os
import random
import time
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "processed"
ARTIFACTS = ROOT / "artifacts"
TOKENIZER_DIR = ARTIFACTS / "tokenizer"

PROMPT_TEMPLATE = "<|user|>{q}<|assistant|>"


def setup(seed: int = 2026) -> torch.device:
    random.seed(seed)
    torch.manual_seed(seed)
    torch.set_num_threads(max(1, (os.cpu_count() or 4)))
    torch.set_float32_matmul_precision("high")
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def load_tokenizer(which: str = "tokenizer"):
    from transformers import AutoTokenizer

    path = TOKENIZER_DIR if which == "tokenizer" else ARTIFACTS / which
    tok = AutoTokenizer.from_pretrained(str(path), use_fast=True)
    return tok


def encode(tok, text: str) -> list[int]:
    return tok(text, add_special_tokens=False)["input_ids"]


def build_stream(tok, path: Path, eos_id: int) -> torch.Tensor:
    """把纯文本语料编码成一条长张量（文档之间插入 <eos> 作为分隔）。"""
    ids: list[int] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        ids.extend(encode(tok, line))
        ids.append(eos_id)
    return torch.tensor(ids, dtype=torch.long)


def get_batch(data: torch.Tensor, block: int, batch: int, device) -> tuple[torch.Tensor, torch.Tensor]:
    ix = torch.randint(len(data) - block - 1, (batch,))
    x = torch.stack([data[i : i + block] for i in ix])
    y = torch.stack([data[i + 1 : i + 1 + block] for i in ix])
    return x.to(device), y.to(device)


def cosine_lr(step: int, total: int, base_lr: float, warmup: int, min_ratio: float = 0.1) -> float:
    if step < warmup:
        return base_lr * (step + 1) / warmup
    if step >= total:
        return base_lr * min_ratio
    progress = (step - warmup) / max(1, total - warmup)
    return base_lr * (min_ratio + (1 - min_ratio) * 0.5 * (1 + math.cos(math.pi * progress)))


@torch.no_grad()
def evaluate(model, data: torch.Tensor, block: int, batch: int, device, iters: int = 20) -> float:
    model.eval()
    losses = []
    for _ in range(iters):
        x, y = get_batch(data, block, batch, device)
        _, loss = model(x, y)
        losses.append(loss.item())
    model.train()
    return sum(losses) / len(losses)


def save_metrics(path: Path, metrics: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")


def append_log(path: Path, row: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


# --------------------------------------------------------------------------- #
# 损失曲线（不依赖 matplotlib，用 Pillow 直接画，产物可直接放进报告/PPT）
# --------------------------------------------------------------------------- #


def draw_loss_curve(history: list[dict], out_png: Path, title: str) -> Path:
    from PIL import Image, ImageDraw, ImageFont

    W, H, PAD = 1000, 560, 70
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 18)
        small = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 14)
    except OSError:
        font = ImageFont.load_default()
        small = font

    train = [(h["step"], h["train_loss"]) for h in history if "train_loss" in h]
    val = [(h["step"], h["val_loss"]) for h in history if "val_loss" in h]
    if not train:
        return out_png
    xs = [p[0] for p in train] + [p[0] for p in val]
    ys = [p[1] for p in train] + [p[1] for p in val]
    x0, x1, y0, y1 = min(xs), max(xs) or 1, 0.0, max(ys) * 1.15

    d.rectangle([PAD, PAD, W - 30, H - PAD], outline=(210, 214, 222))
    for i in range(5):
        gy = H - PAD - (H - 2 * PAD) * i / 4
        d.line([PAD, gy, W - 30, gy], fill=(238, 240, 244))
        d.text((12, gy - 8), f"{y1 * i / 4:.2f}", fill=(120, 126, 138), font=small)

    def px(step: int) -> float:
        return PAD + (W - 30 - PAD) * (step - x0) / max(1, x1 - x0)

    def py(loss: float) -> float:
        return H - PAD - (H - 2 * PAD) * loss / max(1e-9, y1)

    if len(train) > 1:
        d.line([(px(s), py(l)) for s, l in train], fill=(37, 99, 235), width=3)
    if len(val) > 1:
        d.line([(px(s), py(l)) for s, l in val], fill=(239, 68, 68), width=3)
        for s, l in val:
            d.ellipse([px(s) - 4, py(l) - 4, px(s) + 4, py(l) + 4], fill=(239, 68, 68))
    d.text((PAD, 24), title, fill=(17, 24, 39), font=font)
    d.text((W - 250, 26), "训练损失", fill=(37, 99, 235), font=small)
    d.text((W - 160, 26), "验证损失", fill=(239, 68, 68), font=small)
    d.text((W // 2 - 20, H - 42), "step", fill=(120, 126, 138), font=small)
    out_png.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_png)
    return out_png


# --------------------------------------------------------------------------- #
# 采样：给一个提示，生成回答（训练脚本与评测脚本共用）
# --------------------------------------------------------------------------- #


def build_prompt(tok, question: str, system: str | None = None) -> list[int]:
    text = PROMPT_TEMPLATE.format(q=question)
    if system:
        text = f"<|system|>{system}" + text
    return encode(tok, text)


@torch.no_grad()
def sample_answer(
    model,
    tok,
    question: str,
    device,
    max_new_tokens: int = 60,
    temperature: float = 0.8,
    top_p: float = 0.9,
    system: str | None = None,
) -> str:
    ids = build_prompt(tok, question, system)
    idx = torch.tensor([ids], dtype=torch.long, device=device)
    out = model.generate(
        idx,
        max_new_tokens=max_new_tokens,
        temperature=temperature,
        top_p=top_p,
        repetition_penalty=1.25,
        eos_id=tok.convert_tokens_to_ids("<|end|>"),
        stop_ids=(tok.convert_tokens_to_ids("<|user|>"), tok.convert_tokens_to_ids("<|assistant|>")),
    )
    new = out[0][len(ids) :].tolist()
    text = tok.decode(new, skip_special_tokens=True)
    return text.strip()


def timer() -> float:
    return time.time()
