import { Reveal } from "./Reveal";

type Status = "live" | "local" | "pending";

interface Action {
  label: string;
  href?: string;
  note?: string;
}

interface Deliverable {
  index: string;
  title: string;
  kind: string;
  status: Status;
  statusText: string;
  desc: string;
  actions: Action[];
}

const items: Deliverable[] = [
  {
    index: "01",
    title: "个人网站",
    kind: "静态站点 · React",
    status: "live",
    statusText: "已上线",
    desc: "你正在看的这个站。Vite + React + TypeScript，带登录、资料编辑、训练文件展示，托管在 GitHub Pages。",
    actions: [{ label: "打开网站", href: "https://th-cell-source.github.io/personal-homepage/" }],
  },
  {
    index: "02",
    title: "智语 Chat（AI 对话模型）",
    kind: "本地系统 · 自训练模型",
    status: "local",
    statusText: "本机运行",
    desc: "175 万参数中文小模型 + 多模型对话系统。模型跑在本机 CPU 上，需要先启动服务，所以给的是本机地址。",
    actions: [
      { label: "打开智语 Chat", href: "http://127.0.0.1:5173", note: "先运行「启动智语Chat」" },
      { label: "接口文档", href: "http://127.0.0.1:8010/docs" },
    ],
  },
  {
    index: "03",
    title: "电商图片下载助手",
    kind: "Chrome 扩展 + 官网",
    status: "live",
    statusText: "已上线",
    desc: "电商详情页一键抓图，支持预览、单张下载与 ZIP 打包；官网提供安装包下载与使用说明。",
    actions: [
      { label: "打开官网", href: "https://th-cell-source.github.io/ecom-img-downloader/index.html" },
      { label: "下载扩展", href: "https://th-cell-source.github.io/ecom-img-downloader/ecom-img-downloader.zip" },
    ],
  },
  {
    index: "04",
    title: "秒搭（国内零代码平台）",
    kind: "无代码应用",
    status: "pending",
    statusText: "链接待补",
    desc: "用百度秒搭生成的「图片水印助手」。生成并发布后，把秒搭给的公网地址填到这里。",
    actions: [{ label: "操作指引", href: "#local", note: "见 docs/零代码平台操作指引.md" }],
  },
  {
    index: "05",
    title: "Bolt（国外零代码平台）",
    kind: "无代码应用",
    status: "pending",
    statusText: "环境报错待重试",
    desc: "用 Bolt 生成的「AI 翻译助手」。当前 WebContainer 启动超时，按排查步骤处理后再生成。",
    actions: [{ label: "排查步骤", href: "#local", note: "无痕窗口 / 清缓存 / 单文件模板" }],
  },
];

const STATUS_LABEL: Record<Status, string> = {
  live: "已上线",
  local: "本机运行",
  pending: "待补齐",
};

/** 五样成果的集中入口 */
export function Deliverables() {
  return (
    <section className="section" id="deliverables">
      <div className="wrap">
        <Reveal className="section__head" as="header">
          <span className="section__idx">07</span>
          <h2 className="section__title">成果入口</h2>
          <span className="section__line" />
          <span className="section__note">five deliverables</span>
        </Reveal>

        <div className="deliverables">
          {items.map((item, index) => (
            <Reveal className="deliverable" as="article" key={item.index} delay={index * 70}>
              <div className="deliverable__top">
                <span className="deliverable__index">{item.index}</span>
                <span className={`badge badge--${item.status}`}>{STATUS_LABEL[item.status]}</span>
              </div>
              <h3>{item.title}</h3>
              <span className="deliverable__kind">{item.kind}</span>
              <p>{item.desc}</p>
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
          秒搭与 Bolt 属于平台生成的应用，链接要在各自平台发布后才有，拿到后填进第 4、5 项。
        </Reveal>
      </div>
    </section>
  );
}
