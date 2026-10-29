# AGENT.md — AI 协作规范

本项目是 **Vite + React 18 + TypeScript** 单页应用。以下规则供 AI 助手与人协作时遵守；文档与代码冲突时，以本文件为准并同步修正代码。

## 一、技术约定（硬性）

| 项 | 规定 |
| --- | --- |
| 框架 | React 18 函数组件 + Hooks；禁止 class 组件 |
| 语言 | TypeScript 严格模式；禁止 `any`（确需时写 `unknown` + 收窄） |
| 构建 | Vite 5；`base` 固定 `/personal-homepage/`，不要改 |
| 样式 | 纯 CSS（`app/src/styles/global.css`）+ CSS 变量；禁止 Tailwind/styled-components/CSS-in-JS |
| 组件库 | 不引入（antd/MUI 等会破坏视觉一致性） |
| 图标 | 内联 SVG 或字符符号；禁止图标库 |
| 数据 | 页面文案与列表统一放 `app/src/data/profile.ts`，组件里不写死文案 |

## 二、视觉规范

| 项 | 规定 |
| --- | --- |
| 背景 | 深空蓝黑 `#05070d`，不得改回浅色底或大面积白卡片 |
| 强调色 | 青 `#00f0ff`、洋红 `#ff2d95`；文字渐变用 `--grad`，按钮用更饱和的 `--grad-btn` |
| 文字色 | 主 `#e8fbff`、次 `#a9c6d3`、弱 `#6d8798`；禁止大面积纯黑纯白 |
| 边框 | 1px、透明度 0.08–0.16；禁止粗边框与重阴影 |
| 圆角 | 卡片 12–14px、按钮 9px（配 `clip-path` 切角）、徽标 99px |
| 字体 | 只用系统字体栈；等宽用于编号、日期、标签、终端 |
| 禁止 | 彩虹渐变、外部字体/CDN、动图、自动轮播 |

## 三、目录与命名

```
app/src/
├── components/   组件，一个文件一个组件，PascalCase
├── hooks/        useXxx.ts，一个文件一个 Hook
├── data/         profile.ts（唯一数据源）
└── styles/       global.css（唯一入口，main.tsx 引入）
```

- 组件：`export function Xxx()` 具名导出（`App.tsx` 用 default）。
- 类名沿用 BEM：块 `.proj`、元素 `.proj__link`、修饰 `.proj--muted`。
- 新增样式先加/复用 `:root` 变量，禁止在组件里写魔法色值。
- 缩进 2 空格；导入顺序：react → 第三方 → 本地（hooks/data/components → styles）。

## 四、React 规范

- 状态最小化：能用 `useMemo` 派生就不要 `useState` 存一份。
- 副作用必须有清理函数（事件监听、`IntersectionObserver`、`requestAnimationFrame`）。
- 滚动/指针监听一律 `{ passive: true }`。
- 列表渲染必须有稳定 `key`（用业务字段，不用下标）。
- 不在渲染期做 DOM 查询；需要元素用 `ref`。
- 严格模式双调用必须幂等（不要在 effect 里累加全局状态）。

## 五、数据与持久化

- 个人信息唯一来源是 `ProfileContext`，组件只能 `useProfile()` 读取，禁止再直接 import `profile` 常量。
- 持久化只允许 `localStorage`（key 带前缀 `tianhao:`），读写必须 try/catch；与默认值相同则不写库。
- 大文件（训练源码等）用 `?raw` 动态导入，不要静态 import，避免撑大首屏包。

## 六、登录与权限

- 站点必须先登录（`LoginPage`），未登录时主页组件不得进入 DOM。
- 口令只允许存 PBKDF2-SHA256 哈希（含随机盐与迭代次数），**禁止明文、禁止可逆加密**；明文只允许出现在交付说明里供老师验收。
- 登录状态：sessionStorage 存本次会话；localStorage 只存「记住登录」的过期时间戳（7 天）。
- 任何"前端校验"都不是服务端鉴权：文档与答辩里必须如实说明可被绕过，真正的鉴权在智语 Chat 后端（bcrypt + 令牌）。

## 七、性能与无障碍

- 动画循环：DPR ≤ 2、节点数上限、`visibilitychange` 暂停。
- 新增动效必须同时处理 `prefers-reduced-motion: reduce`。
- 交互元素用 `a`/`button`，加 `aria-label` 或可见文字；保留 `:focus-visible` 焦点环。
- 文本对比度 ≥ 4.5:1；装饰性元素加 `aria-hidden`。
- 断点：1024px（两栏转单栏）、720px（折叠导航）、480px（字号收紧）。

## 八、构建与发布

```bash
npm install
npm run dev            # http://localhost:5174/personal-homepage/
npm run build          # tsc --noEmit && vite build
npm run publish:pages  # 构建并把 dist/ 拷到仓库根目录（Pages 托管 root）
```

- 发布必须走 `publish:pages`，不要手改根目录的 `index.html` 与 `assets/`（会被下次构建覆盖）。
- 每次改完在 1440×900 与 390×844 两个尺寸检查横向溢出。

## 九、提交规则

- 每完成一个可验证的改动就提交：`git add -A && git commit -m "动宾短语"`。
- 提交信息用中文动宾结构：「拆分项目卡片组件」「修正移动端导航折叠」。
- 大改动前先提交保底；禁止 `force push`；禁止删除远程历史。

## 十、AI 行为规范

1. 动手前先读 `App.tsx`、相关组件与 `profile.ts`，不要凭印象重写。
2. 只改用户要求的部分；发现问题先记录，不要顺手"全站美化"。
3. 改完必须说明：改了什么、为什么、怎么验证（构建通过 + 截图）。
4. 涉及删除文件、改仓库设置、推送远程，先问再做。
5. 不要编造数据：项目数字、链接、学号必须来自真实材料。

## 十一、隐私边界

- 允许：姓名、学校、学院、专业、年级、学号、指导教师、GitHub 主页、已公开的项目地址。
- 禁止：手机号、身份证号、家庭住址、课表、成绩、他人姓名与联系方式。
