"""第 5 步：把训练结果导出成聊天系统可直接加载的模型目录（原生 .pt 权重）。

导出的目录结构（backend/models/<名字>/）：
  config.json            结构配置 + model_type = minigpt + weight_file = model.pt
  model.pt               原生 torch state_dict（不转 GGUF、不转 safetensors）
  tokenizer.json         字节级 BPE 分词器（自建 2000 词表）
  tokenizer_config.json / special_tokens_map.json
  model_card.json        展示名、训练方式、参数量等元信息（前端模型面板直接读）
  lora_adapter/          仅角色模型：LoRA 适配器原始文件（证明"确实用了 LoRA"）

后端 `LocalPtEngine` 检测到 model_type = minigpt 后，用 `minigpt_runtime.MiniGPTRuntime`
直接 load_state_dict 推理；不经过 transformers 的模型类，因此不受 HF 版本权重布局变化影响。
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import torch

from training import common
from training.minigpt import MiniGPT, load_checkpoint

MODELS_DIR = Path(__file__).resolve().parent.parent / "backend" / "models"


def export(ckpt: Path, out_dir: Path, card: dict) -> Path:
    """把 MiniGPT 检查点导出成可被后端加载的目录。"""
    model, extra = load_checkpoint(ckpt)
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = {
        **model.cfg.to_json(),
        "model_type": "minigpt",
        "architectures": ["MiniGPT"],
        "weight_file": "model.pt",
        # 训练时用的是 <|user|>问题<|assistant|>回答<|end|>，没有 system 角色，
        # 因此推理侧也不会把 system 提示塞进上下文（塞了反而跑偏）
        "supports_system": False,
        "num_params": model.num_params(),
    }
    (out_dir / "config.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    torch.save(model.state_dict(), out_dir / "model.pt")
    for name in ("tokenizer.json", "tokenizer_config.json", "special_tokens_map.json"):
        shutil.copy2(common.TOKENIZER_DIR / name, out_dir / name)
    card = {
        **card,
        "num_params": model.num_params(),
        "context_length": model.cfg.block_size,
        "vocab_size": model.cfg.vocab_size,
        "architecture": "MiniGPT（3 层 / 4 头 / 192 维，GPT-2 结构，自建训练）",
        "weight_format": "pt",
        "language": ["zh"],
        "tokenizer": "字节级 BPE，2000 词表（自建）",
        "checkpoint_extra": extra,
    }
    (out_dir / "model_card.json").write_text(json.dumps(card, ensure_ascii=False, indent=2), encoding="utf-8")
    size_mb = sum(p.stat().st_size for p in out_dir.rglob("*") if p.is_file()) / 1024 / 1024
    print(f"已导出 {out_dir}  参数量 {model.num_params() / 1e6:.2f}M  体积 {size_mb:.1f}MB")
    return out_dir


def verify(model_dir: Path, questions: list[str]) -> list[dict]:
    """用后端同款运行时加载并生成，验证导出的模型真的能被系统使用。"""
    import sys

    backend_root = str(Path(__file__).resolve().parent.parent / "backend")
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)
    from app.engines.minigpt_runtime import MiniGPTRuntime

    runtime = MiniGPTRuntime(model_dir)
    results = []
    for q in questions:
        prompt = runtime.build_prompt([{"role": "user", "content": q}])
        text = runtime.generate(prompt, max_new_tokens=70, temperature=0.7, top_p=0.9)
        results.append({"question": q, "answer": text, "prompt": prompt})
        print(f"  Q: {q}\n  A: {text}\n")
    print(f"  运行时自检：参数量 {runtime.num_params / 1e6:.2f}M，设备 {runtime.device}")
    return results


def main() -> None:
    sft_dir = export(
        common.ARTIFACTS / "sft" / "best.pt",
        MODELS_DIR / "zhiyu_tiny_2000",
        {
            "display_name": "智语 Tiny（指令微调版）",
            "description": "自建 2000 词表字节级 BPE + 175 万参数 MiniGPT，中文百科语料预训练后做指令微调",
            "training_method": "full",
            "base_model": "自建 MiniGPT（从零预训练）",
        },
    )
    lora_dir = export(
        common.ARTIFACTS / "lora" / "merged.pt",
        MODELS_DIR / "zhiyu_linwan",
        {
            "display_name": "林晚（LoRA 角色版）",
            "description": "在智语 Tiny 上做 LoRA 微调，模仿小说《长夜灯》店主林晚的语气；权重已合并，推理无额外开销",
            "training_method": "lora",
            "base_model": "智语 Tiny（指令微调版）",
            "lora": {"r": 8, "alpha": 16, "targets": ["qkv", "proj", "fc"]},
        },
    )
    # 保留原始适配器，作为"确实用了 LoRA"的物证
    adapter_src = common.ARTIFACTS / "lora"
    adapter_dst = lora_dir / "lora_adapter"
    adapter_dst.mkdir(exist_ok=True)
    for name in ("adapter.pt", "adapter_config.json"):
        shutil.copy2(adapter_src / name, adapter_dst / name)

    print("\n=== 用后端同款方式（transformers）验收两个模型 ===")
    results = {
        "sft": verify(sft_dir, ["你是谁？", "什么是物联网？"]),
        "lora": verify(lora_dir, ["你最近过得好吗？", "我有点想放弃写代码了。"]),
    }
    (common.ARTIFACTS / "export_verify.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
