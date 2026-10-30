export interface Stat {
  value: string;
  unit: string;
  label: string;
}

export interface Fact {
  label: string;
  value: string;
}

export interface Skill {
  icon: string;
  title: string;
  desc: string;
  tags: string[];
  hot: string[];
}

export interface Project {
  kind: string;
  title: string;
  desc: string;
  tags: string[];
  link: string;
  linkText: string;
  muted?: boolean;
}

export interface JourneyItem {
  date: string;
  title: string;
  desc: string;
}

export const profile = {
  name: "田昊",
  latin: "TIAN HAO",
  role: "全栈开发 / 嵌入式 / 大模型应用",
  school: "大连民族大学",
  major: "物联网工程",
  grade: "2024 级",
  studentId: "2023250718",
  teacher: "兰艳",
  github: "https://github.com/Th-cell-source",
  homepage: "https://th-cell-source.github.io/personal-homepage/",
  pluginSite: "https://th-cell-source.github.io/ecom-img-downloader/index.html",
  heroTitleTop: "把想法做成",
  heroTitleBottom: "能跑起来",
  heroTitleTail: "的东西",
  heroDescBefore: "大连民族大学",
  heroDescStrong: "物联网工程 2024 级",
  heroDescAfter:
    "。平时写 Python、Java 和前端，也焊过板子、调过单片机；最近在做的事情是从零训练一个中文小模型，再把它接进一套能用的对话系统里。",
};

export const stats: Stat[] = [
  { value: "3", unit: "个", label: "完整项目" },
  { value: "1.75", unit: "M", label: "自训练模型参数" },
  { value: "7", unit: "天", label: "实训日志" },
  { value: "27", unit: "项", label: "后端测试通过" },
];

export const aboutParagraphs: string[] = [
  "我是田昊，大连民族大学物联网工程 2024 级本科生。方向偏全栈开发 + 嵌入式：做过单片机秒表、传感器采集，也写过前后端分离的 Web 系统。",
  "这次软件开发综合实践，我把一件以前觉得“很神秘”的事拆开做了一遍：自己实现字节级 BPE 分词器，从零搭一个 GPT-2 同构的小模型，做完预训练、指令微调和 LoRA，最后把它接进一套对话系统，让它在浏览器里逐字回答。",
  "我比较在意“能不能跑”和“讲不讲得清”这两件事：每个阶段都留下指标文件和产物，报告里的数字都能指回一个具体文件；卡住的时候先复现、再量化，而不是凭感觉改代码。",
];

export const facts: Fact[] = [
  { label: "姓名", value: "田昊" },
  { label: "学校", value: "大连民族大学" },
  { label: "学院 / 专业", value: "信息与通信工程学院 · 物联网工程" },
  { label: "年级 / 学号", value: "2024 级 · 2023250718" },
  { label: "指导教师", value: "兰艳" },
  { label: "方向", value: "全栈开发 / 嵌入式 / 大模型应用" },
];

export const skills: Skill[] = [
  {
    icon: "⌘",
    title: "后端开发",
    desc: "接口设计、鉴权、流式响应与数据建模",
    tags: ["FastAPI", "SQLAlchemy", "MySQL", "JWT"],
    hot: ["Python"],
  },
  {
    icon: "◈",
    title: "前端开发",
    desc: "组件化界面、状态管理与交互细节",
    tags: ["TypeScript", "Vite", "Vue 3", "CSS"],
    hot: ["React"],
  },
  {
    icon: "◉",
    title: "AI / 大模型",
    desc: "分词、训练、微调与本地推理部署",
    tags: ["BPE", "LoRA", "Transformers"],
    hot: ["PyTorch"],
  },
  {
    icon: "▣",
    title: "嵌入式",
    desc: "单片机程序、电路仿真与传感器采集",
    tags: ["51 单片机", "Proteus", "Keil"],
    hot: ["C"],
  },
];

export const projects: Project[] = [
  {
    kind: "MAIN · AI 应用",
    title: "智语 Chat",
    desc: "自建 175 万参数中文小模型 + 多模型对话系统。自己实现字节级 BPE 分词器与 GPT-2 同构模型，完成预训练、指令微调与 LoRA 角色微调，模型以原生 .pt 接入系统，支持 SSE 流式回答。本机运行，点下面按钮直接打开。",
    tags: ["PyTorch", "FastAPI", "React", "SSE"],
    link: "http://127.0.0.1:5173",
    linkText: "打开智语 Chat →",
  },
  {
    kind: "DEPLOYED · 浏览器扩展",
    title: "电商图片下载助手",
    desc: "一个 Chrome 扩展：在电商详情页一键抓取普通图、懒加载图、srcset 与背景图，弹窗里预览勾选，支持单张下载与 ZIP 打包，全部在本地完成，不上传数据。",
    tags: ["Chrome Extension", "JavaScript", "GitHub Pages"],
    link: "https://th-cell-source.github.io/ecom-img-downloader/index.html",
    linkText: "在线官网 →",
  },
  {
    kind: "THIS PAGE · React 应用",
    title: "个人主页",
    desc: "Vite + React 18 + TypeScript 单页应用：组件化拆分、设计令牌统一主题、Canvas 粒子背景、滚动进场与导航联动。你正在看的这个页面就是。",
    tags: ["React", "TypeScript", "Vite", "Canvas"],
    link: "https://th-cell-source.github.io/personal-homepage/",
    linkText: "访问主页 →",
    muted: true,
  },
];

export const journey: JourneyItem[] = [
  { date: "10-20", title: "Transformer 架构与实现", desc: "对比 RMSNorm 与 LayerNorm，拆解 Block 结构，通读模型代码并逐类重写注释。" },
  { date: "10-21", title: "GPT 预训练与推理调通", desc: "数据管线、下一词元预测、学习率预热与余弦退火，跑通训练与生成。" },
  { date: "10-22", title: "监督微调与 LoRA", desc: "聊天模板、只对回答算损失、低秩注入与合并，理解参数高效微调。" },
  { date: "10-23", title: "AI 编程与零代码平台", desc: "试了零代码搭建，比较它与写代码的边界，明确什么该交给 AI、什么必须自己控。" },
  { date: "10-26", title: "AI 编程工具实战", desc: "用编辑器 + 智能体重写电商图片插件，处理 MV3、跨域与打包下载。" },
  { date: "10-27", title: "个人网站开发与部署", desc: "写 PRD、技术设计与 AGENT 规范，实现并部署到 GitHub Pages。" },
  { date: "10-28", title: "AI 聊天对话系统项目", desc: "把自训练模型接进前后端分离的对话系统，联调流式输出与账户安全。" },
];

export const navItems = [
  { href: "#about", label: "关于" },
  { href: "#skills", label: "技能" },
  { href: "#projects", label: "项目" },
  { href: "#training", label: "训练" },
  { href: "#journey", label: "实训" },
  { href: "#local", label: "本地" },
  { href: "#deliverables", label: "成果" },
  { href: "#contact", label: "联系" },
];
