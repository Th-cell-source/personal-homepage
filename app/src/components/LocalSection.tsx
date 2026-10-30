import { useEffect, useMemo, useState } from "react";
import { useSite } from "../context/SiteContext";
import { buildLauncher } from "../data/localPaths";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

/** 本地文件：集中列出电脑上的项目路径，可一键生成启动脚本或复制路径 */
export function LocalSection() {
  const { site } = useSite();
  const [protocol, setProtocol] = useState("https:");
  const [copied, setCopied] = useState("");
  const launcher = useMemo(() => buildLauncher(site.locals), [site.locals]);

  useEffect(() => {
    setProtocol(window.location.protocol);
  }, []);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(""), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const canOpenDirectly = protocol === "file:";

  const downloadLauncher = () => {
    const blob = new Blob([launcher], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "打开全部本地文件.bat";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setCopied("脚本已下载");
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`${label} 路径已复制`);
    } catch {
      setCopied("复制失败，请手动选择路径");
    }
  };

  return (
    <section className="section" id="local">
      <div className="wrap">
        <SectionHead id="locals" />

        <Reveal className="local">
          <div className="local__intro">
            <p>
              下面是我电脑上训练文件与源码的真实位置。<strong>网页不能直接打开本机资源管理器</strong>
              （浏览器拦截 <code>file://</code> 跳转），所以给两种一键方式：
            </p>
            <ol>
              <li>
                <b>下载启动脚本</b>：双击生成的 <code>打开全部本地文件.bat</code>，会一次性打开各目录，装了 VS Code 还会打开工程。
              </li>
              <li>
                <b>复制路径</b>：点右侧「复制」，在资源管理器地址栏按 <kbd>Ctrl</kbd> + <kbd>L</kbd> 粘贴回车。
              </li>
            </ol>
            <div className="local__actions">
              <button className="btn btn--primary" type="button" onClick={downloadLauncher}>
                下载「打开全部本地文件.bat」
              </button>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => copy(site.locals[0]?.path ?? "", site.locals[0]?.label ?? "训练代码")}
              >
                复制第一个路径
              </button>
            </div>
            {canOpenDirectly ? (
              <p className="local__hint is-ok">检测到页面是从本地打开的，下面的「打开」可以直接跳转。</p>
            ) : (
              <p className="local__hint">
                当前页面来自 <code>{protocol}//</code>，浏览器不允许直接跳转本地路径——用上面的脚本或复制路径即可。
              </p>
            )}
          </div>

          <div className="local__list">
            {site.locals.map((item) => (
              <div className="local__row" key={`${item.label}-${item.path}`}>
                <div className="local__meta">
                  <b>{item.label}</b>
                  <span>{item.note}</span>
                </div>
                <code className="local__path" title={item.path}>
                  {item.path}
                </code>
                <div className="local__row-actions">
                  {canOpenDirectly ? (
                    <a className="mini" href={`file:///${item.path.replace(/\\/g, "/")}`} target="_blank" rel="noreferrer">
                      打开
                    </a>
                  ) : null}
                  <button className="mini" type="button" onClick={() => copy(item.path, item.label)}>
                    复制
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={`toast toast--inline ${copied ? "is-on" : ""}`} role="status" aria-live="polite">
            {copied}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
