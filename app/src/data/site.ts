import { aboutParagraphs } from "./profile";
import { defaultDeliverables } from "./deliverables";
import { localPaths } from "./localPaths";

export interface SiteProfile {
  name: string;
  latin: string;
  role: string;
  school: string;
  major: string;
  grade: string;
  studentId: string;
  teacher: string;
  email: string;
}

export interface HeroText {
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
  titleTail: string;
  descPrefix: string;
  descStrong: string;
  descSuffix: string;
}

export interface StatItem {
  value: string;
  unit: string;
  label: string;
}

export interface FactItem {
  label: string;
  value: string;
}

export interface SkillItem {
  icon: string;
  title: string;
  desc: string;
  tags: string[];
  hot: string[];
}

export interface ProjectItem {
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

export interface LocalPathItem {
  label: string;
  path: string;
  note: string;
  kind: "folder" | "file";
}

export interface SectionHead {
  idx: string;
  title: string;
  note: string;
}

export interface ContactText {
  title: string;
  desc: string;
}

export interface SiteData {
  profile: SiteProfile;
  hero: HeroText;
  stats: StatItem[];
  facts: FactItem[];
  about: string[];
  skills: SkillItem[];
  projects: ProjectItem[];
  journey: JourneyItem[];
  deliverables: typeof defaultDeliverables;
  locals: LocalPathItem[];
  heads: Record<string, SectionHead>;
  contact: ContactText;
}

export const defaultSite: SiteData = {
  profile: {
    name: "田昊",
    latin: "TIAN HAO",
    role: "全栈开发 / 嵌入式 / 大模型应用",
    school: "大连民族大学",
    major: "物联网工程",
    grade: "2024 级",
    studentId: "2023250718",
    teacher: "兰艳",
    email: "",
  },
  hero: {
    eyebrow: "AVAILABLE FOR INTERNSHIP · 2026",
    titleTop: "把想法做成",
    titleBottom: "能跑起来",
    titleTail: "的东西",
    descPrefix: "大连民族大学",
    descStrong: "物联网工程 2024 级",
    descSuffix:
      "。平时写 Python、Java 和前端，也焊过板子、调过单片机；最近在做的事情是从零训练一个中文小模型，再把它接进一套能用的对话系统里。",
  },
  stats: [
    { value: "3", unit: "个", label: "完整项目" },
    { value: "1.75", unit: "M", label: "自训练模型参数" },
    { value: "7", unit: "天", label: "实训日志" },
    { value: "27", unit: "项", label: "后端测试通过" },
  ],
  facts: [
    { label: "姓名", value: "田昊" },
    { label: "学校", value: "大连民族大学" },
    { label: "专业", value: "物联网工程" },
    { label: "年级 / 学号", value: "2024 级 · 2023250718" },
    { label: "指导教师", value: "兰艳" },
    { label: "方向", value: "全栈开发 / 嵌入式 / 大模型应用" },
  ],
  about: aboutParagraphs,
  skills: [
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
  ],
  projects: [
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
  ],
  journey: [
    { date: "10-20", title: "Transformer 架构与实现", desc: "对比 RMSNorm 与 LayerNorm，拆解 Block 结构，通读模型代码并逐类重写注释。" },
    { date: "10-21", title: "GPT 预训练与推理调通", desc: "数据管线、下一词元预测、学习率预热与余弦退火，跑通训练与生成。" },
    { date: "10-22", title: "监督微调与 LoRA", desc: "聊天模板、只对回答算损失、低秩注入与合并，理解参数高效微调。" },
    { date: "10-23", title: "AI 编程与零代码平台", desc: "试了零代码搭建，比较它与写代码的边界，明确什么该交给 AI、什么必须自己控。" },
    { date: "10-26", title: "AI 编程工具实战", desc: "用编辑器 + 智能体重写电商图片插件，处理 MV3、跨域与打包下载。" },
    { date: "10-27", title: "个人网站开发与部署", desc: "写 PRD、技术设计与 AGENT 规范，实现并部署到 GitHub Pages。" },
    { date: "10-28", title: "AI 聊天对话系统项目", desc: "把自训练模型接进前后端分离的对话系统，联调流式输出与账户安全。" },
  ],
  deliverables: defaultDeliverables,
  locals: localPaths.map((item) => ({ ...item })),
  heads: {
    about: { idx: "01", title: "关于我", note: "who am i" },
    skills: { idx: "02", title: "技能栈", note: "tech stack" },
    projects: { idx: "03", title: "项目作品", note: "selected works" },
    training: { idx: "04", title: "训练文件", note: "model pipeline" },
    journey: { idx: "05", title: "实训历程", note: "10.20 — 10.28" },
    locals: { idx: "06", title: "本地文件", note: "on this pc" },
    deliverables: { idx: "07", title: "成果入口", note: "five deliverables" },
    contact: { idx: "08", title: "联系", note: "contact" },
  },
  contact: {
    title: "想聊聊项目，或者一起做点什么？",
    desc: "课程作业、实习机会、技术问题都欢迎。代码基本都在 GitHub 上，插件与主页可以直接在线访问。",
  },
};
