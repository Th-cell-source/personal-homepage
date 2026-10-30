import { useEffect, useState } from "react";
import { useSite } from "../context/SiteContext";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

const STATUS_LABEL = { live: "已上线", local: "本机运行", pending: "待补齐" } as const;

/** 五样成果的集中入口（内容全部来自管理后台） */
export function Deliverables() {
  const { site } = useSite();
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(""), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopied("路径已复制");
    } catch {
      setCopied("复制失败，请手动选择");
    }
  };

  return (
    <section className="section" id="deliverables">
      <div className="wrap">
        <SectionHead id="deliverables" />

        <div className="deliverables">
          {site.deliverables.map((item, index) => (
            <Reveal className="deliverable" as="article" key={`${item.index}-${item.title}`} delay={index * 70}>
              <div className="deliverable__top">
                <span className="deliverable__index">{item.index}</span>
                <span className={`badge badge--${item.status}`}>{STATUS_LABEL[item.status]}</span>
              </div>
              <h3>{item.title}</h3>
              <span className="deliverable__kind">{item.kind}</span>
              <p>{item.desc}</p>

              {item.path ? (
                <div className="deliverable__path">
                  <code title={item.path}>{item.path}</code>
                  <button className="mini" type="button" onClick={() => copyPath(item.path ?? "")}>
                    复制
                  </button>
                </div>
              ) : null}

              <div className="deliverable__actions">
                {item.actions.map((action) =>
                  action.href ? (
                    <a
                      className="mini"
                      key={action.label}
                      href={action.href}
                      target={action.href.startsWith("http") ? "_blank" : undefined}
                      rel={action.href.startsWith("http") ? "noreferrer" : undefined}
                      title={action.note}
                    >
                      {action.label}
                    </a>
                  ) : (
                    <span className="mini mini--off" key={action.label}>
                      {action.label}
                    </span>
                  ),
                )}
              </div>
              <span className="deliverable__status">{item.statusText}</span>
            </Reveal>
          ))}
        </div>

        <Reveal className="deliverables__note">
          说明：智语 Chat 的模型（175 万参数）跑在本机 CPU 上，没有公网部署，所以第 2 项是本机地址；
          秒搭与 Bolt 是平台生成的应用，链接在各自平台发布后生效。卡片上的路径可直接复制到资源管理器打开。
        </Reveal>

        <div className={`toast toast--inline ${copied ? "is-on" : ""}`} role="status" aria-live="polite">
          {copied}
        </div>
      </div>
    </section>
  );
}
