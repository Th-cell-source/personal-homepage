export interface LocalPath {
  label: string;
  path: string;
  note: string;
  kind: "folder" | "file";
}

const WORK = "D:\\Users\\田昊\\Documents\\deepseek-harness\\default-workspace";

/** 本机真实路径：只用于展示与生成启动脚本，不会上传到任何地方 */
export const localPaths: LocalPath[] = [
  { label: "训练代码", path: `${WORK}\\training`, note: "8 个训练脚本与数据准备", kind: "folder" },
  { label: "训练产物", path: `${WORK}\\training\\artifacts`, note: "指标 JSON、损失曲线、生成样例", kind: "folder" },
  { label: "模型目录", path: `${WORK}\\backend\\models`, note: "zhiyu_tiny_2000 / zhiyu_linwan", kind: "folder" },
  { label: "后端源码", path: `${WORK}\\backend`, note: "FastAPI 应用与 MiniGPT 运行时", kind: "folder" },
  { label: "前端源码", path: `${WORK}\\frontend`, note: "React 工作台", kind: "folder" },
  { label: "课程设计报告", path: `${WORK}\\报告\\课程设计报告.docx`, note: "28 页，模板合规", kind: "file" },
  { label: "实践日志（7 天）", path: `${WORK}\\docs\\实践日志-7天`, note: "10-20 ~ 10-28", kind: "folder" },
  { label: "个人主页工程", path: "D:\\personal-homepage", note: "Vite + React + TS（本页源码）", kind: "folder" },
  { label: "插件工程", path: "D:\\ecom-img-downloader", note: "Chrome 扩展 + 官网", kind: "folder" },
  { label: "课程实验（MiniMind）", path: "D:\\minimind", note: "三个课程模型与训练日志", kind: "folder" },
];

/** 生成 Windows 批处理：双击后按顺序打开资源管理器 / 报告 / VS Code */
export function buildLauncher(): string {
  const folders = localPaths.filter((item) => item.kind === "folder");
  const files = localPaths.filter((item) => item.kind === "file");

  const lines = [
    "@echo off",
    "chcp 65001 >nul",
    "title 智语 Chat · 打开本地训练文件与源码",
    "echo 正在打开训练文件、模型与源码目录……",
    "",
    ...folders.map((item) => `start "" explorer "${item.path}"`),
    "",
    ...files.map((item) => `start "" "${item.path}"`),
    "",
    "rem 如果装了 VS Code，再打开两个工程",
    "where code >nul 2>nul",
    `if %errorlevel%==0 start "" code "${WORK}"`,
    "if %errorlevel%==0 start \"\" code \"D:\\personal-homepage\"",
    "",
    "echo 已全部打开。按任意键关闭本窗口。",
    "pause >nul",
    "",
  ];

  return lines.join("\r\n");
}
