"""MiniGPT：一个可以完全讲清楚的小型仅解码器 Transformer（PyTorch 实现）。

规模（默认配置）：3 层、4 头、隐藏维 192、上下文 192、词表约 2000，约 180 万参数。
选这么小是有意的——本机只有 CPU，小模型能在几十分钟内跑完"预训练 → 指令微调 →
LoRA 微调"的完整链路，且每一步都能在答辩时讲明白。

结构（与 GPT-2 一致，去掉了一切不必要的技巧）：
  Token Embedding + Position Embedding
  → N × [LayerNorm → 因果多头自注意力 → 残差 → LayerNorm → 前馈网络 → 残差]
  → LayerNorm → 线性输出（与词嵌入共享权重）
"""

from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass, field
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F


@dataclass
class GPTConfig:
    vocab_size: int = 2000
    block_size: int = 192
    n_layer: int = 3
    n_head: int = 4
    n_embd: int = 192
    dropout: float = 0.05
    tie_weights: bool = True
    extra: dict = field(default_factory=dict)

    def to_json(self) -> dict:
        d = asdict(self)
        d.pop("extra", None)
        return d


class CausalSelfAttention(nn.Module):
    def __init__(self, cfg: GPTConfig) -> None:
        super().__init__()
        assert cfg.n_embd % cfg.n_head == 0
        self.n_head = cfg.n_head
        self.head_dim = cfg.n_embd // cfg.n_head
        self.qkv = nn.Linear(cfg.n_embd, 3 * cfg.n_embd, bias=False)
        self.proj = nn.Linear(cfg.n_embd, cfg.n_embd, bias=False)
        self.dropout = nn.Dropout(cfg.dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        b, t, c = x.shape
        q, k, v = self.qkv(x).split(c, dim=2)
        # (B, T, C) -> (B, nh, T, hd)
        q = q.view(b, t, self.n_head, self.head_dim).transpose(1, 2)
        k = k.view(b, t, self.n_head, self.head_dim).transpose(1, 2)
        v = v.view(b, t, self.n_head, self.head_dim).transpose(1, 2)
        # 因果掩码由 SDPA 的 is_causal 完成：位置 t 只能看到 <= t 的位置
        y = F.scaled_dot_product_attention(
            q, k, v, attn_mask=None, dropout_p=self.dropout.p if self.training else 0.0, is_causal=True
        )
        y = y.transpose(1, 2).contiguous().view(b, t, c)
        return self.proj(y)


class MLP(nn.Module):
    def __init__(self, cfg: GPTConfig) -> None:
        super().__init__()
        self.fc = nn.Linear(cfg.n_embd, 4 * cfg.n_embd)
        self.proj = nn.Linear(4 * cfg.n_embd, cfg.n_embd)
        self.dropout = nn.Dropout(cfg.dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.dropout(self.proj(F.gelu(self.fc(x))))


class Block(nn.Module):
    def __init__(self, cfg: GPTConfig) -> None:
        super().__init__()
        self.ln1 = nn.LayerNorm(cfg.n_embd)
        self.attn = CausalSelfAttention(cfg)
        self.ln2 = nn.LayerNorm(cfg.n_embd)
        self.mlp = MLP(cfg)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.ln1(x))  # pre-LN + 残差
        x = x + self.mlp(self.ln2(x))
        return x


class MiniGPT(nn.Module):
    def __init__(self, cfg: GPTConfig) -> None:
        super().__init__()
        self.cfg = cfg
        self.wte = nn.Embedding(cfg.vocab_size, cfg.n_embd)
        self.wpe = nn.Embedding(cfg.block_size, cfg.n_embd)
        self.drop = nn.Dropout(cfg.dropout)
        self.blocks = nn.ModuleList(Block(cfg) for _ in range(cfg.n_layer))
        self.ln_f = nn.LayerNorm(cfg.n_embd)
        self.lm_head = nn.Linear(cfg.n_embd, cfg.vocab_size, bias=False)
        if cfg.tie_weights:
            self.lm_head.weight = self.wte.weight
        self.apply(self._init_weights)
        # 残差分支输出按 1/sqrt(2N) 缩放，深层网络更稳定
        for name, p in self.named_parameters():
            if name.endswith("proj.weight") or name.endswith("fc.weight"):
                nn.init.normal_(p, mean=0.0, std=0.02 / math.sqrt(2 * cfg.n_layer))

    @staticmethod
    def _init_weights(module: nn.Module) -> None:
        if isinstance(module, nn.Linear):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def num_params(self) -> int:
        return sum(p.numel() for p in self.parameters())

    def forward(self, idx: torch.Tensor, targets: torch.Tensor | None = None):
        b, t = idx.shape
        assert t <= self.cfg.block_size, f"序列长度 {t} 超过上下文 {self.cfg.block_size}"
        pos = torch.arange(0, t, dtype=torch.long, device=idx.device)
        x = self.drop(self.wte(idx) + self.wpe(pos))
        for block in self.blocks:
            x = block(x)
        x = self.ln_f(x)
        logits = self.lm_head(x)
        loss = None
        if targets is not None:
            # ignore_index=-100：指令微调时问题部分不计算损失
            loss = F.cross_entropy(
                logits.view(-1, logits.size(-1)), targets.view(-1), ignore_index=-100
            )
        return logits, loss

    # ------------------------------------------------------------------ #
    @torch.no_grad()
    def generate(
        self,
        idx: torch.Tensor,
        max_new_tokens: int = 80,
        temperature: float = 0.8,
        top_p: float = 0.9,
        repetition_penalty: float = 1.1,
        eos_id: int | None = None,
        stop_ids: tuple[int, ...] = (),
        on_token=None,
    ) -> torch.Tensor:
        """自回归采样生成。on_token 用于把每个新词元流式回调给上层（SSE 逐字输出）。"""
        self.eval()
        for _ in range(max_new_tokens):
            idx_cond = idx[:, -self.cfg.block_size :]
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :].float() / max(temperature, 1e-5)

            if repetition_penalty and repetition_penalty != 1.0:
                for b in range(idx.shape[0]):
                    seen = torch.unique(idx[b])
                    logits[b, seen] /= repetition_penalty
                    logits[b, seen] = torch.where(
                        logits[b, seen] < 0, logits[b, seen] * repetition_penalty, logits[b, seen]
                    )

            if top_p and top_p < 1.0:
                sorted_logits, sorted_idx = torch.sort(logits, descending=True, dim=-1)
                probs = F.softmax(sorted_logits, dim=-1)
                cum = probs.cumsum(dim=-1)
                mask = cum - probs > top_p
                sorted_logits = sorted_logits.masked_fill(mask, float("-inf"))
                logits = torch.full_like(logits, float("-inf")).scatter(1, sorted_idx, sorted_logits)

            probs = F.softmax(logits, dim=-1)
            nxt = torch.multinomial(probs, num_samples=1)
            idx = torch.cat([idx, nxt], dim=1)
            token = int(nxt[0, 0])
            if on_token is not None:
                on_token(token)
            if eos_id is not None and token == eos_id:
                break
            if token in stop_ids:
                break
        return idx


# --------------------------------------------------------------------------- #
# LoRA：冻结原权重，只训练低秩增量 ΔW = (alpha/r) · B · A
# --------------------------------------------------------------------------- #


class LoRALinear(nn.Module):
    def __init__(self, base: nn.Linear, r: int = 8, alpha: int = 16) -> None:
        super().__init__()
        self.base = base
        for p in self.base.parameters():
            p.requires_grad = False
        self.r = r
        self.alpha = alpha
        self.scaling = alpha / r
        self.lora_a = nn.Parameter(torch.zeros(r, base.in_features))
        self.lora_b = nn.Parameter(torch.zeros(base.out_features, r))
        nn.init.kaiming_uniform_(self.lora_a, a=math.sqrt(5))  # A 随机，B 置零，初始 ΔW = 0

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.base(x) + self.scaling * (x @ self.lora_a.t() @ self.lora_b.t())

    @torch.no_grad()
    def merged_weight(self) -> torch.Tensor:
        return self.base.weight + self.scaling * (self.lora_b @ self.lora_a)


def apply_lora(model: nn.Module, r: int = 8, alpha: int = 16, targets=("qkv", "proj", "fc")) -> int:
    """把名字里包含 targets 的 Linear 换成 LoRALinear，返回替换数量。"""
    replaced = 0
    for name, module in list(model.named_modules()):
        for child_name, child in list(module.named_children()):
            full = f"{name}.{child_name}" if name else child_name
            if isinstance(child, nn.Linear) and any(t in full for t in targets):
                setattr(module, child_name, LoRALinear(child, r=r, alpha=alpha))
                replaced += 1
    return replaced


def lora_parameters(model: nn.Module) -> list[nn.Parameter]:
    return [p for n, p in model.named_parameters() if "lora_" in n]


def merge_lora(model: nn.Module) -> nn.Module:
    """把 LoRA 增量合并回原始权重，推理时零额外开销。"""
    for name, module in list(model.named_modules()):
        for child_name, child in list(module.named_children()):
            if isinstance(child, LoRALinear):
                new = nn.Linear(child.base.in_features, child.base.out_features, bias=child.base.bias is not None)
                new.weight.data = child.merged_weight()
                if child.base.bias is not None:
                    new.bias.data = child.base.bias.data
                setattr(module, child_name, new)
    return model


# --------------------------------------------------------------------------- #
# 保存 / 加载
# --------------------------------------------------------------------------- #


def save_checkpoint(model: MiniGPT, path: Path, extra: dict | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {"config": model.cfg.to_json(), "state_dict": model.state_dict(), "extra": extra or {}},
        path,
    )


def load_checkpoint(path: Path) -> tuple[MiniGPT, dict]:
    ckpt = torch.load(path, map_location="cpu", weights_only=False)
    cfg = GPTConfig(**ckpt["config"])
    model = MiniGPT(cfg)
    state = {k: v for k, v in ckpt["state_dict"].items()}
    # LoRA 检查点：先把 A/B 合并进 base 权重，再加载成普通模型
    if any(k.endswith("lora_a") for k in state):
        raise ValueError("这是 LoRA 适配器检查点，请先用 merge_checkpoint() 合并")
    model.load_state_dict(state, strict=False)
    return model, ckpt.get("extra", {})


def read_config(model_dir: Path) -> dict:
    cfg_path = model_dir / "config.json"
    if cfg_path.exists():
        return json.loads(cfg_path.read_text(encoding="utf-8"))
    return {}
