"""第 1 步：在中文百科 + 小说对话语料上训练字节级 BPE 词表与分词器。

产物：training/artifacts/tokenizer/{tokenizer.json, tokenizer_config.json, bpe_meta.json}
      training/artifacts/tokenizer/vocab_report.json（词表样例与压缩率，答辩可用）
"""

from __future__ import annotations

import json
from pathlib import Path

from training.bpe import CHATML_TEMPLATE, BPETrainer, load_corpus_texts
from training.common import ARTIFACTS, ROOT, TOKENIZER_DIR

RAW = ROOT / "data" / "raw"
VOCAB_SIZE = 2000


def main() -> None:
    files = [
        RAW / "baike_zh.txt",
        RAW / "baike_zh_2.txt",
        RAW / "novel_dialog.txt",
        RAW / "novel_dialog_2.txt",
    ]
    texts = load_corpus_texts(files)
    total_chars = sum(len(t) for t in texts)
    total_bytes = sum(len(t.encode("utf-8")) for t in texts)
    print(f"语料：{len(texts)} 段，{total_chars} 字，{total_bytes} 字节")

    trainer = BPETrainer(vocab_size=VOCAB_SIZE, verbose=True).train(texts)
    TOKENIZER_DIR.mkdir(parents=True, exist_ok=True)
    trainer.save(TOKENIZER_DIR, CHATML_TEMPLATE)

    # 压缩率：字节数 / 词元数，越大说明词元越"值钱"
    sample = "物联网是指通过信息传感设备把任何物品与互联网连接起来的网络。"
    ids = trainer.encode(sample)
    report = {
        "vocab_size": len(trainer.vocab),
        "num_merges": len(trainer.merges),
        "special_tokens": ["<pad>", "<unk>", "<bos>", "<eos>", "<|system|>", "<|user|>", "<|assistant|>", "<|end|>"],
        "corpus_chars": total_chars,
        "corpus_bytes": total_bytes,
        "sample_text": sample,
        "sample_tokens": len(ids),
        "sample_bytes_per_token": round(len(sample.encode()) / len(ids), 2),
        "corpus_bytes_per_token": round(total_bytes / max(1, len(trainer.encode("\n".join(texts)))), 2),
        "longest_tokens": sorted(trainer.vocab, key=len, reverse=True)[:15],
    }
    (TOKENIZER_DIR / "vocab_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print("分词器已保存到", TOKENIZER_DIR)


if __name__ == "__main__":
    main()
