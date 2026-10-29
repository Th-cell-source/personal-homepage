import pretrainMetrics from "./training/pretrain_metrics.json";
import sftMetrics from "./training/sft_metrics.json";
import loraMetrics from "./training/lora_metrics.json";
import vocabReport from "./training/vocab_report.json";

export interface TrainingFile {
  id: string;
  name: string;
  role: string;
  points: string[];
  load: () => Promise<{ default: string }>;
}

/** 训练链路上的 8 个脚本：点击后在页面内查看源码（按需加载，不占首屏体积） */
export const trainingFiles: TrainingFile[] = [
  {
    id: "bpe",
    name: "bpe.py",
    role: "字节级 BPE 分词器：训练词表、编码、解码",
    points: ["256 个字节符号起步", "按合并优先级贪心编码", "解码回字节再按 UTF-8 拼接"],
    load: () => import("./training/bpe.py?raw"),
  },
  {
    id: "minigpt",
    name: "minigpt.py",
    role: "模型结构：注意力、前馈、Block、LoRA 注入与权重读写",
    points: ["GPT-2 同构 pre-LN", "4 头 × 48 维", "输出层与词嵌入共享权重"],
    load: () => import("./training/minigpt.py?raw"),
  },
  {
    id: "tokenizer",
    name: "train_tokenizer.py",
    role: "把语料喂给 BPE，导出 tokenizer.json",
    points: ["先加特殊标记再统计合并", "导出 Hugging Face Tokenizers 格式"],
    load: () => import("./training/train_tokenizer.py?raw"),
  },
  {
    id: "pretrain",
    name: "train_pretrain.py",
    role: "预训练：下一词元预测，学习率预热 + 余弦退火",
    points: ["交叉熵损失", "梯度裁剪 1.0", "每 50 步记录验证损失"],
    load: () => import("./training/train_pretrain.py?raw"),
  },
  {
    id: "sft",
    name: "train_sft.py",
    role: "指令微调：只对回答计算损失",
    points: ["标签右移一位", "问题区置 −100", "对话格式与推理严格一致"],
    load: () => import("./training/train_sft.py?raw"),
  },
  {
    id: "lora",
    name: "train_lora.py",
    role: "LoRA 角色微调：冻结原权重，只学低秩增量",
    points: ["r=8、α=16", "注入 12 个线性层", "训练后合并回原权重"],
    load: () => import("./training/train_lora.py?raw"),
  },
  {
    id: "export",
    name: "export_hf.py",
    role: "导出原生 .pt 模型目录与模型卡",
    points: ["config + model.pt + tokenizer.json", "标注支持的能力与限制"],
    load: () => import("./training/export_hf.py?raw"),
  },
  {
    id: "common",
    name: "common.py",
    role: "训练公共件：随机种子、日志、检查点、学习率调度",
    points: ["统一 seed 保证可复现", "保存/恢复检查点"],
    load: () => import("./training/common.py?raw"),
  },
];

export const trainingMetrics = { pretrain: pretrainMetrics, sft: sftMetrics, lora: loraMetrics, vocab: vocabReport };

export const trainingPipeline = [
  { label: "语料", note: "1.16 万字" },
  { label: "BPE", note: "词表 2000" },
  { label: "预训练", note: "600 步" },
  { label: "指令微调", note: "124 条" },
  { label: "LoRA", note: "73,728 参数" },
  { label: "导出 .pt", note: "2 个模型" },
  { label: "后端运行时", note: "SSE 流式" },
];
