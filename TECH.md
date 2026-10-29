# 技术设计文档

## 1. 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | React 18 | 函数组件 + Hooks，`StrictMode` 下幂等 |
| 语言 | TypeScript 5 | `strict`、`noUnusedLocals`、`jsx: react-jsx` |
| 构建 | Vite 5 | `root: app`、`base: /personal-homepage/`、`outDir: dist` |
| 样式 | 原生 CSS | CSS 变量做设计令牌，Grid/Flex 布局，三个断点 |
| 图形 | Canvas 2D | 粒子连线背景，自定义 Hook 封装 |
| 部署 | GitHub Pages | `main` 根目录托管构建产物，配 `.nojekyll` |

## 2. 为什么用 React + TypeScript

- 老师明确要求不要交单文件 HTML，要用框架工程；
- 页面有 8 个区块、多个可复用卡片，组件化后改一处不影响别处；
- 数据（个人信息、技能、项目、时间线）集中在 `profile.ts`，组件只负责渲染，内容维护成本低；
- TypeScript 能在构建期挡住"props 传错、字段拼错"这类低级错误，`npm run build` 就是最便宜的测试。

## 3. 目录结构

```
personal-homepage/
├── app/                        # Vite root（源码）
│   ├── index.html              # 入口模板（含 meta / og / noscript）
│   └── src/
│       ├── main.tsx            # createRoot 挂载 + 引入全局样式
│       ├── App.tsx             # 组合区块 + 导航高亮
│       ├── components/
│       │   ├── Backdrop.tsx    # 极光 + 网格 + 粒子 + 进度条
│       │   ├── Nav.tsx         # 固定导航 + 移动端菜单
│       │   ├── Hero.tsx        # 首屏 + 终端名片 + 数据条
│       │   ├── About.tsx / Skills.tsx / Projects.tsx / Journey.tsx / Contact.tsx
│       │   ├── Footer.tsx
│       │   └── Reveal.tsx      # 进场动画包装组件
│       ├── hooks/
│       │   ├── useParticles.ts     # Canvas 粒子
│       │   └── useScrollFx.ts      # 进度条 + 区块高亮
│       ├── context/ProfileContext.tsx  # 可编辑的个人信息（localStorage）
│       ├── data/profile.ts     # 默认数据
│       ├── data/training.ts    # 训练脚本清单（?raw 懒加载）
│       ├── data/training/*.py  # 训练源码副本（8 个脚本 + 4 个指标 JSON）
│       └── styles/global.css   # 设计令牌 + 全部样式
├── scripts/copy-dist.mjs       # 构建产物 → 仓库根目录
├── index.html + assets/        # 发布产物（Pages 托管）
├── legacy/index.single-file.html  # 早期单文件版本（留档）
└── PRD.md / TECH.md / AGENT.md / README.md
```

## 4. 关键技术点

| 技术点 | 实现 | 为什么 |
| --- | --- | --- |
| 设计令牌 | `:root` 定义颜色/字体/缓动/尺寸；按钮另用更饱和的 `--grad-btn` | 换肤只改一处；文字渐变需要更亮中间色，按钮需要更饱和，拆成两条 |
| 组件拆分 | 8 个区块组件 + 2 个基础组件（Backdrop/Reveal） | 职责单一，改区块不动全局 |
| 数据与视图分离 | `profile.ts` 导出 `profile / stats / skills / projects / journey` | 改文案不用碰 JSX |
| 粒子背景 | `useParticles`：节点数按面积自适应（≤72）、距离分三档分桶绘制、DPR ≤ 2、`visibilitychange` 暂停、指针 160px 吸附 | 分桶把 O(n²) 连线压成 3 次 `stroke()`；上限保证低端机不卡 |
| 滚动进度 | `useScrollProgress`：`scrollY / (scrollHeight - innerHeight)` | 一条 2px 进度条，成本极低、反馈明确 |
| 区块高亮 | `useSectionSpy`：`IntersectionObserver` + `rootMargin: -45% 0 -50%` | 不用算 offsetTop，滚动性能好 |
| 进场动画 | `Reveal` 组件观察自身，加 `.in`；`--d` 控制错峰 | 每个元素独立触发，天然只跑一次 |
| 移动端菜单 | `useState` 控制 `.is-open`，同步 `aria-expanded` | 纯 CSS 动画，无抽屉库 |
| 减少动效 | `prefers-reduced-motion` 下只画静态一帧、关闭过渡 | 无障碍要求 |
| 无 JS 兜底 | `app/index.html` 里 `<noscript>` 强制 `.reveal` 显示 | 内容不能因脚本失败而消失 |
| 发布策略 | `npm run publish:pages` 把 `dist/` 拷到仓库根 | 复用现有 Pages（main / root）配置，不改仓库设置 |
| 个人信息编辑 | `ProfileContext` + `localStorage`（key `tianhao:profile:v1`），`sanitize` 校验字段，默认值不落库 | 纯前端无后端也能"改完还在"；默认值与本地值一致时自动清除存储 |
| 训练源码展示 | `import("./training/x.py?raw")` 动态导入，Vite 拆成独立 chunk；按行渲染带行号 | 源码约 1,100 行，不能进首屏包；点哪个加载哪个 |
| 指标与曲线 | `metrics.json` 静态导入；损失曲线 PNG 由 Vite 处理进 `assets/` | 数字直接来自训练产物，避免手抄出错 |

## 5. 构建与性能

| 指标 | 数值 |
| --- | --- |
| 构建命令 | `tsc --noEmit && vite build`（类型检查 + 打包） |
| 产物 | `index.html` 0.9 KB、CSS 20.4 KB（gzip 5.0 KB）、主 JS 169.9 KB（gzip 57.4 KB）+ 8 个源码 chunk（2–10 KB） |
| 构建耗时 | ≈1 s |
| 首屏 | 无外部请求，单页应用首帧即渲染 |
| 兼容 | Chrome/Edge 100+、Safari 15+；`clip-path`、`backdrop-filter`、`IntersectionObserver` 均在范围内 |

## 6. 本地开发

```bash
npm install
npm run dev      # http://localhost:5174/personal-homepage/
npm run build    # 类型检查 + 打包到 dist/
npm run preview  # 预览构建产物
```

## 7. 发布流程

```bash
npm run publish:pages                 # 构建并拷到根目录
git add -A && git commit -m "..."     # 提交源码与产物
git push origin main                  # 触发 Pages 自动发布
```

1. 仓库 Settings → Pages → Deploy from a branch → `main` / `(root)`
2. 约 1 分钟生效，访问 `https://th-cell-source.github.io/personal-homepage/`
3. 建议勾选 Enforce HTTPS

## 8. 后续扩展

- 深/浅主题切换：`data-theme` + 两套变量。
- 项目卡片加截图：`loading="lazy"` + `aspect-ratio` 占位，避免布局抖动。
- 单元测试：Vitest + Testing Library 覆盖 `Reveal` 与数据渲染。
- 接入 GitHub API 展示仓库列表（需缓存与限流）。
