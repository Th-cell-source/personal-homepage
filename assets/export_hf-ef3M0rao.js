const r=`"""第 5 步：把训练结果导出成聊天系统可直接加载的模型目录（原生 .pt 权重）。\r
\r
导出的目录结构（backend/models/<名字>/）：\r
  config.json            结构配置 + model_type = minigpt + weight_file = model.pt\r
  model.pt               原生 torch state_dict（不转 GGUF、不转 safetensors）\r
  tokenizer.json         字节级 BPE 分词器（自建 2000 词表）\r
  tokenizer_config.json / special_tokens_map.json\r
  model_card.json        展示名、训练方式、参数量等元信息（前端模型面板直接读）\r
  lora_adapter/          仅角色模型：LoRA 适配器原始文件（证明"确实用了 LoRA"）\r
\r
后端 \`LocalPtEngine\` 检测到 model_type = minigpt 后，用 \`minigpt_runtime.MiniGPTRuntime\`\r
直接 load_state_dict 推理；不经过 transformers 的模型类，因此不受 HF 版本权重布局变化影响。\r
"""\r
\r
from __future__ import annotations\r
\r
import json\r
import shutil\r
from pathlib import Path\r
\r
import torch\r
\r
from training import common\r
from training.minigpt import MiniGPT, load_checkpoint\r
\r
MODELS_DIR = Path(__file__).resolve().parent.parent / "backend" / "models"\r
\r
\r
def export(ckpt: Path, out_dir: Path, card: dict) -> Path:\r
    """把 MiniGPT 检查点导出成可被后端加载的目录。"""\r
    model, extra = load_checkpoint(ckpt)\r
    out_dir.mkdir(parents=True, exist_ok=True)\r
    cfg = {\r
        **model.cfg.to_json(),\r
        "model_type": "minigpt",\r
        "architectures": ["MiniGPT"],\r
        "weight_file": "model.pt",\r
        # 训练时用的是 <|user|>问题<|assistant|>回答<|end|>，没有 system 角色，\r
        # 因此推理侧也不会把 system 提示塞进上下文（塞了反而跑偏）\r
        "supports_system": False,\r
        "num_params": model.num_params(),\r
    }\r
    (out_dir / "config.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")\r
    torch.save(model.state_dict(), out_dir / "model.pt")\r
    for name in ("tokenizer.json", "tokenizer_config.json", "special_tokens_map.json"):\r
        shutil.copy2(common.TOKENIZER_DIR / name, out_dir / name)\r
    card = {\r
        **card,\r
        "num_params": model.num_params(),\r
        "context_length": model.cfg.block_size,\r
        "vocab_size": model.cfg.vocab_size,\r
        "architecture": "MiniGPT（3 层 / 4 头 / 192 维，GPT-2 结构，自建训练）",\r
        "weight_format": "pt",\r
        "language": ["zh"],\r
        "tokenizer": "字节级 BPE，2000 词表（自建）",\r
        "checkpoint_extra": extra,\r
    }\r
    (out_dir / "model_card.json").write_text(json.dumps(card, ensure_ascii=False, indent=2), encoding="utf-8")\r
    size_mb = sum(p.stat().st_size for p in out_dir.rglob("*") if p.is_file()) / 1024 / 1024\r
    print(f"已导出 {out_dir}  参数量 {model.num_params() / 1e6:.2f}M  体积 {size_mb:.1f}MB")\r
    return out_dir\r
\r
\r
def verify(model_dir: Path, questions: list[str]) -> list[dict]:\r
    """用后端同款运行时加载并生成，验证导出的模型真的能被系统使用。"""\r
    import sys\r
\r
    backend_root = str(Path(__file__).resolve().parent.parent / "backend")\r
    if backend_root not in sys.path:\r
        sys.path.insert(0, backend_root)\r
    from app.engines.minigpt_runtime import MiniGPTRuntime\r
\r
    runtime = MiniGPTRuntime(model_dir)\r
    results = []\r
    for q in questions:\r
        prompt = runtime.build_prompt([{"role": "user", "content": q}])\r
        text = runtime.generate(prompt, max_new_tokens=70, temperature=0.7, top_p=0.9)\r
        results.append({"question": q, "answer": text, "prompt": prompt})\r
        print(f"  Q: {q}\\n  A: {text}\\n")\r
    print(f"  运行时自检：参数量 {runtime.num_params / 1e6:.2f}M，设备 {runtime.device}")\r
    return results\r
\r
\r
def main() -> None:\r
    sft_dir = export(\r
        common.ARTIFACTS / "sft" / "best.pt",\r
        MODELS_DIR / "zhiyu_tiny_2000",\r
        {\r
            "display_name": "智语 Tiny（指令微调版）",\r
            "description": "自建 2000 词表字节级 BPE + 175 万参数 MiniGPT，中文百科语料预训练后做指令微调",\r
            "training_method": "full",\r
            "base_model": "自建 MiniGPT（从零预训练）",\r
        },\r
    )\r
    lora_dir = export(\r
        common.ARTIFACTS / "lora" / "merged.pt",\r
        MODELS_DIR / "zhiyu_linwan",\r
        {\r
            "display_name": "林晚（LoRA 角色版）",\r
            "description": "在智语 Tiny 上做 LoRA 微调，模仿小说《长夜灯》店主林晚的语气；权重已合并，推理无额外开销",\r
            "training_method": "lora",\r
            "base_model": "智语 Tiny（指令微调版）",\r
            "lora": {"r": 8, "alpha": 16, "targets": ["qkv", "proj", "fc"]},\r
        },\r
    )\r
    # 保留原始适配器，作为"确实用了 LoRA"的物证\r
    adapter_src = common.ARTIFACTS / "lora"\r
    adapter_dst = lora_dir / "lora_adapter"\r
    adapter_dst.mkdir(exist_ok=True)\r
    for name in ("adapter.pt", "adapter_config.json"):\r
        shutil.copy2(adapter_src / name, adapter_dst / name)\r
\r
    print("\\n=== 用后端同款方式（transformers）验收两个模型 ===")\r
    results = {\r
        "sft": verify(sft_dir, ["你是谁？", "什么是物联网？"]),\r
        "lora": verify(lora_dir, ["你最近过得好吗？", "我有点想放弃写代码了。"]),\r
    }\r
    (common.ARTIFACTS / "export_verify.json").write_text(\r
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"\r
    )\r
\r
\r
if __name__ == "__main__":\r
    main()\r
`;export{r as default};
