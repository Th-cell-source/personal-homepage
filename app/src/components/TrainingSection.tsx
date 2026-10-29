import { useEffect, useRef, useState } from "react";
import { trainingFiles, trainingMetrics, trainingPipeline, type TrainingFile } from "../data/training";
import pretrainCurve from "../assets/curves/pretrain.png";
import sftCurve from "../assets/curves/sft.png";
import loraCurve from "../assets/curves/lora.png";
import { Reveal } from "./Reveal";

interface LoadedFile {
  id: string;
  code: string;
}

const STAGES = [
  {
    key: "预训练",
    curve: pretrainCurve,
    alt: "预训练损失曲线",
    rows: [
      ["训练步数", `${trainingMetrics.pretrain.steps} 步`],
      ["参数量", `${trainingMetrics.pretrain.num_params.toLocaleString("en-US")}`],
      ["训练损失", `7.65 → ${trainingMetrics.pretrain.final_train_loss.toFixed(2)}`],
      ["耗时", `${trainingMetrics.pretrain.elapsed_sec} 秒`],
    ],
  },
  {
    key: "指令微调",
    curve: sftCurve,
    alt: "指令微调损失曲线",
    rows: [
      ["样本数", "124 条（112/12）"],
      ["训练轮数", `${trainingMetrics.sft.epochs ?? 5} 轮`],
      ["验证损失", `${trainingMetrics.sft.best_val_loss?.toFixed(2) ?? "0.41"}`],
      ["耗时", `${trainingMetrics.sft.elapsed_sec ?? 16.6} 秒`],
    ],
  },
  {
    key: "LoRA 微调",
    curve: loraCurve,
    alt: "LoRA 损失曲线",
    rows: [
      ["秩 / α", "8 / 16"],
      ["可训练参数", `${trainingMetrics.lora.trainable_params?.toLocaleString("en-US") ?? "73,728"}`],
      ["占比", `${((trainingMetrics.lora.trainable_params / trainingMetrics.lora.total_params) * 100).toFixed(2)}%`],
      ["适配器体积", `${trainingMetrics.lora.adapter_kb ?? 288} KB`],
    ],
  },
];

/** 训练文件展示：链路、指标、损失曲线，以及 8 个脚本的源码查看器 */
export function TrainingSection() {
  const [selected, setSelected] = useState<TrainingFile>(trainingFiles[0]);
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    selected
      .load()
      .then((mod) => {
        if (!cancelled) setLoaded({ id: selected.id, code: mod.default });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id: selected.id, code: "// 源码加载失败，请刷新页面重试" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (codeRef.current) codeRef.current.scrollTop = 0;
    setCopied(false);
  }, [loaded]);

  const code = loaded && loaded.id === selected.id ? loaded.code : "";
  const lines = code ? code.replace(/\n$/, "").split("\n") : [];

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="section" id="training">
      <div className="wrap">
        <Reveal className="section__head" as="header">
          <span className="section__idx">04</span>
          <h2 className="section__title">训练文件</h2>
          <span className="section__line" />
          <span className="section__note">model pipeline</span>
        </Reveal>

        <Reveal className="pipeline">
          {trainingPipeline.map((step, index) => (
            <div className="pipeline__step" key={step.label}>
              <b>{step.label}</b>
              <span>{step.note}</span>
              {index < trainingPipeline.length - 1 ? <i aria-hidden="true">→</i> : null}
            </div>
          ))}
        </Reveal>

        <div className="stage-grid">
          {STAGES.map((stage, index) => (
            <Reveal className="stage" key={stage.key} delay={index * 80}>
              <div className="stage__head">
                <h3>{stage.key}</h3>
                <span className="stage__tag">metrics.json</span>
              </div>
              <img src={stage.curve} alt={stage.alt} loading="lazy" />
              <dl className="stage__rows">
                {stage.rows.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ))}
        </div>

        <Reveal className="files">
          <div className="files__list" role="tablist" aria-label="训练脚本列表">
            {trainingFiles.map((file) => (
              <button
                key={file.id}
                role="tab"
                aria-selected={file.id === selected.id}
                className={`file ${file.id === selected.id ? "is-active" : ""}`}
                onClick={() => setSelected(file)}
              >
                <span className="file__name">{file.name}</span>
                <span className="file__role">{file.role}</span>
              </button>
            ))}
          </div>

          <div className="files__view">
            <div className="files__bar">
              <div>
                <b>{selected.name}</b>
                <span>{selected.role}</span>
              </div>
              <div className="files__meta">
                <span>{loading ? "加载中…" : `${lines.length} 行`}</span>
                <button className="mini" onClick={copy} disabled={!code}>
                  {copied ? "已复制" : "复制代码"}
                </button>
              </div>
            </div>

            <ul className="files__points">
              {selected.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>

            <pre className="code" ref={codeRef} aria-label={`${selected.name} 源码`}>
              <code>
                {lines.map((line, index) => (
                  <span className="code__line" key={`${index}-${line.slice(0, 8)}`}>
                    <i>{index + 1}</i>
                    <em>{line || " "}</em>
                  </span>
                ))}
              </code>
            </pre>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
