const n=`"""字节级 BPE 分词器：训练 + 导出 HF 兼容的 tokenizer.json（纯标准库实现）。

为什么自己写：
  1. 课程要求"基于中文百科文本构建词表与分词器"，需要一个可以讲清楚每一步的
     最小实现，而不是黑盒调用；
  2. 中文没有空格，字节级 BPE 把 UTF-8 字节作为初始符号，任意中文都能无损还原，
     不会出现 <unk>；
  3. 产出的 tokenizer.json 是 HuggingFace \`PreTrainedTokenizerFast\` 的标准格式，
     训练好的模型可以直接被后端 \`AutoTokenizer.from_pretrained()\` 加载。

算法（与 minbpe / GPT-2 一致）：
  训练：统计相邻符号对频次 → 合并频次最高的一对 → 重复，直到词表达到目标大小
  编码：按学习到的顺序依次应用合并规则
  解码：词元查表 → 拼成字节串 → UTF-8 解码
"""

from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

# --------------------------------------------------------------------------- #
# GPT-2 风格的字节 <-> 可打印 Unicode 映射：保证 256 个字节都能出现在词表里
# --------------------------------------------------------------------------- #


def _bytes_to_unicode() -> dict[int, str]:
    bs = (
        list(range(ord("!"), ord("~") + 1))
        + list(range(ord("¡"), ord("¬") + 1))
        + list(range(ord("®"), ord("ÿ") + 1))
    )
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b)
            cs.append(256 + n)
            n += 1
    return dict(zip(bs, (chr(c) for c in cs)))


BYTE_ENCODER = _bytes_to_unicode()
BYTE_DECODER = {v: k for k, v in BYTE_ENCODER.items()}

SPECIAL_TOKENS = [
    "<pad>",
    "<unk>",
    "<bos>",
    "<eos>",
    "<|system|>",
    "<|user|>",
    "<|assistant|>",
    "<|end|>",
]


def text_to_symbols(text: str) -> list[str]:
    """文本 -> 字节级可打印字符序列（训练与编码的共同起点）。"""
    return [BYTE_ENCODER[b] for b in text.encode("utf-8")]


# --------------------------------------------------------------------------- #
# 训练
# --------------------------------------------------------------------------- #


@dataclass
class BPETrainer:
    vocab_size: int = 3000
    verbose: bool = True
    merges: dict[tuple[str, str], int] = field(default_factory=dict)
    vocab: dict[str, int] = field(default_factory=dict)

    def _init_vocab(self) -> None:
        for tok in SPECIAL_TOKENS:
            self.vocab.setdefault(tok, len(self.vocab))
        for ch in sorted(BYTE_ENCODER.values()):
            self.vocab.setdefault(ch, len(self.vocab))

    @staticmethod
    def _count_pairs(symbols: list[str], counts: Counter) -> None:
        # 注意：这里是"累加"而不是"清空"，所有文档的频次要汇总成一个全局统计
        counts.update(zip(symbols, symbols[1:]))

    @staticmethod
    def _merge(symbols: list[str], pair: tuple[str, str], new_token: str) -> list[str]:
        out: list[str] = []
        i = 0
        while i < len(symbols):
            if i < len(symbols) - 1 and symbols[i] == pair[0] and symbols[i + 1] == pair[1]:
                out.append(new_token)
                i += 2
            else:
                out.append(symbols[i])
                i += 1
        return out

    def train(self, texts: list[str]) -> "BPETrainer":
        self._init_vocab()
        # 每条文本独立训练，避免跨文档边界产生无意义合并
        docs = [text_to_symbols(t) for t in texts if t.strip()]
        counts: Counter = Counter()
        target = self.vocab_size - len(self.vocab)

        for step in range(target):
            counts.clear()
            for doc in docs:
                self._count_pairs(doc, counts)
            if not counts:
                break
            pair, freq = counts.most_common(1)[0]
            if freq < 2:  # 频次太低说明只剩噪声，提前停止
                break
            new_token = pair[0] + pair[1]
            self.merges[pair] = step
            self.vocab[new_token] = len(self.vocab)
            docs = [self._merge(doc, pair, new_token) for doc in docs]
            if self.verbose and (step + 1) % 200 == 0:
                print(f"  merge {step + 1}/{target}  pair={pair!r} freq={freq} vocab={len(self.vocab)}", flush=True)
        if self.verbose:
            print(f"  训练完成：词表 {len(self.vocab)}，合并规则 {len(self.merges)} 条", flush=True)
        return self

    # ---------------------------------------------------------------- #
    def encode(self, text: str) -> list[int]:
        symbols = text_to_symbols(text)
        while len(symbols) >= 2:
            pairs = list(zip(symbols, symbols[1:]))
            best = min(
                (p for p in pairs if p in self.merges),
                key=lambda p: self.merges[p],
                default=None,
            )
            if best is None:
                break
            symbols = self._merge(symbols, best, best[0] + best[1])
        return [self.vocab[s] for s in symbols]

    def decode(self, ids: list[int]) -> str:
        inv = {v: k for k, v in self.vocab.items()}
        raw = "".join(inv[i] for i in ids if inv.get(i) not in SPECIAL_TOKENS)
        return bytes(BYTE_DECODER[ch] for ch in raw).decode("utf-8", errors="replace")

    # ---------------------------------------------------------------- #
    def to_tokenizer_json(self, name: str = "zhiyu-bpe") -> dict:
        """导出 tokenizers 库可直接加载的 tokenizer.json（BPE + ByteLevel）。"""
        merges = [
            f"{a} {b}" for (a, b), _ in sorted(self.merges.items(), key=lambda kv: kv[1])
        ]
        added = [
            {
                "id": self.vocab[tok],
                "content": tok,
                "single_word": False,
                "lstrip": False,
                "rstrip": False,
                "normalized": False,
                "special": True,
            }
            for tok in SPECIAL_TOKENS
        ]
        return {
            "version": "1.0",
            "truncation": None,
            "padding": None,
            "added_tokens": added,
            "normalizer": None,
            # use_regex=False：整段文本作为一个块，允许"中文+标点"跨字符合并
            "pre_tokenizer": {
                "type": "ByteLevel",
                "add_prefix_space": False,
                "trim_offsets": True,
                "use_regex": False,
            },
            "post_processor": None,
            "decoder": {"type": "ByteLevel", "add_prefix_space": True, "trim_offsets": True, "use_regex": False},
            "model": {
                "type": "BPE",
                "dropout": None,
                "unk_token": None,
                "continuing_subword_prefix": None,
                "end_of_word_suffix": None,
                "fuse_unk": False,
                "byte_fallback": False,
                "vocab": self.vocab,
                "merges": merges,
            },
        }

    def save(self, out_dir: Path, chat_template: str | None = None) -> Path:
        out_dir.mkdir(parents=True, exist_ok=True)
        payload = self.to_tokenizer_json()
        (out_dir / "tokenizer.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8"
        )
        config = {
            "tokenizer_class": "PreTrainedTokenizerFast",
            "model_max_length": 1024,
            "padding_side": "right",
            "clean_up_tokenization_spaces": False,
            "bos_token": "<bos>",
            "eos_token": "<eos>",
            "unk_token": "<unk>",
            "pad_token": "<pad>",
            "add_bos_token": False,
            "add_eos_token": False,
        }
        if chat_template:
            config["chat_template"] = chat_template
        (out_dir / "tokenizer_config.json").write_text(
            json.dumps(config, ensure_ascii=False, indent=1), encoding="utf-8"
        )
        (out_dir / "special_tokens_map.json").write_text(
            json.dumps(
                {
                    "bos_token": "<bos>",
                    "eos_token": "<eos>",
                    "unk_token": "<unk>",
                    "pad_token": "<pad>",
                    "additional_special_tokens": ["<|user|>", "<|assistant|>", "<|end|>"],
                },
                ensure_ascii=False,
                indent=1,
            ),
            encoding="utf-8",
        )
        # 训练元信息，便于答辩时说明词表是怎么来的
        (out_dir / "bpe_meta.json").write_text(
            json.dumps(
                {
                    "name": "zhiyu-bpe",
                    "algorithm": "byte-level BPE (minbpe 风格)",
                    "vocab_size": len(self.vocab),
                    "num_merges": len(self.merges),
                    "special_tokens": SPECIAL_TOKENS,
                },
                ensure_ascii=False,
                indent=1,
            ),
            encoding="utf-8",
        )
        return out_dir


# --------------------------------------------------------------------------- #
# 与 transformers 对齐的校验
# --------------------------------------------------------------------------- #

CHATML_TEMPLATE = (
    "{% for m in messages %}"
    "{% if m['role'] == 'system' %}<|system|>{{ m['content'] }}"
    "{% elif m['role'] == 'user' %}<|user|>{{ m['content'] }}"
    "{% else %}<|assistant|>{{ m['content'] }}<|end|>"
    "{% endif %}{% endfor %}"
    "{% if add_generation_prompt %}<|assistant|>{% endif %}"
)


def load_corpus_texts(files: list[Path]) -> list[str]:
    texts: list[str] = []
    for f in files:
        for line in f.read_text(encoding="utf-8").splitlines():
            line = re.sub(r"\\s+", " ", line).strip()
            if line:
                texts.append(line)
    return texts
`;export{n as default};
