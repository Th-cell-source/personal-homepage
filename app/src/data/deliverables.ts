export type DeliverableStatus = "live" | "local" | "pending";

export interface DeliverableAction {
  label: string;
  href?: string;
  note?: string;
}

export interface Deliverable {
  index: string;
  title: string;
  kind: string;
  status: DeliverableStatus;
  statusText: string;
  desc: string;
  /** 本机文件夹路径（云端应用没有） */
  path?: string;
  actions: DeliverableAction[];
}

export const defaultDeliverables: Deliverable[] = [
  {
    index: "01",
    title: "个人网站",
    kind: "静态站点 · React",
    status: "live",
    statusText: "已上线",
    desc: "你正在看的这个站。Vite + React + TypeScript，带登录、管理后台、训练文件展示，托管在 GitHub Pages。",
    path: "D:\\personal-homepage",
    actions: [{ label: "打开网站", href: "https://th-cell-source.github.io/personal-homepage/" }],
  },
  {
    index: "02",
    title: "智语 Chat（AI 对话模型）",
    kind: "本地系统 · 自训练模型",
    status: "local",
    statusText: "本机运行",
    desc: "175 万参数中文小模型 + 多模型对话系统。模型跑在本机 CPU 上，需要先启动服务，所以给的是本机地址。",
    path: "D:\\Users\\田昊\\Documents\\deepseek-harness\\default-workspace",
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
    path: "D:\\ecom-img-downloader",
    actions: [
      { label: "打开官网", href: "https://th-cell-source.github.io/ecom-img-downloader/index.html" },
      { label: "下载扩展", href: "https://th-cell-source.github.io/ecom-img-downloader/ecom-img-downloader.zip" },
    ],
  },
  {
    index: "04",
    title: "秒搭（国内零代码平台）",
    kind: "无代码应用 · 图片水印助手",
    status: "live",
    statusText: "已发布",
    desc: "用百度秒搭生成并发布的「图片水印助手」：上传图片、自定义水印文字与位置、字号、透明度、颜色，支持平铺，一键导出 PNG。",
    actions: [
      { label: "打开应用", href: "https://app-ffoc6r7who1t.miaoda.online" },
      { label: "秒搭平台", href: "https://miaoda.com", note: "无代码生成平台" },
    ],
  },
  {
    index: "05",
    title: "Bolt（国外零代码平台）",
    kind: "无代码应用 · AI 翻译助手",
    status: "live",
    statusText: "已发布",
    desc: "用 Bolt 生成并发布的「AI 翻译助手」：中英双向翻译、自动识别语向、复制译文、字数统计，界面深色科技风。",
    actions: [
      { label: "打开应用", href: "https://chinese-english-tran-pjxs.bolt.host" },
      { label: "生成过程", href: "https://bolt.new", note: "Bolt 工作区" },
    ],
  },
];
