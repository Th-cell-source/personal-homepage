# 技术设计文档

## 1. 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 结构 | HTML5 语义标签 | `header / main / section / article / footer` |
| 样式 | CSS3（自定义属性 + Grid/Flex + 媒体查询） | 单文件内联，无预处理器 |
| 交互 | 原生 JavaScript（ES5 语法，IIFE 包裹） | 无框架、无构建、无 polyfill |
| 图形 | Canvas 2D | 粒子连线背景 |
| 字体 | 系统字体栈 | 中文 PingFang/微软雅黑，等宽用 Consolas/Cascadia |
| 部署 | GitHub Pages | main 分支根目录，自动 HTTPS |

**零外部请求**：不引用任何 CDN、字体、图标库、统计脚本。断网也能完整呈现（外链跳转除外）。

## 2. 为什么选这个栈

- 页面是单页作品集，内容静态、无数据交互，上框架属于杀鸡用牛刀。
- 单文件体量 ≈ 30 KB，首屏无网络等待，Lighthouse 分数天然高。
- GitHub Pages 免费、自动 HTTPS、推送即发布，适合课程作业。
- 纯原生实现能体现"手写 CSS/JS"的基本功，答辩时每一行都能讲清楚。

## 3. 目录结构

```
personal-homepage/
├── index.html        # 页面 + 样式 + 脚本（单文件）
├── PRD.md            # 产品需求文档
├── TECH.md           # 本文件
├── AGENT.md          # AI 协作规范
├── README.md         # 仓库说明
└── screenshots/      # 预览图（README 引用）
```

## 4. 关键技术点

| 技术点 | 实现方式 | 为什么这么做 |
| --- | --- | --- |
| 设计令牌 | `:root` 里定义颜色/字体/缓动/尺寸变量，按钮区域再派生 `--grad-btn` | 换肤只改一处；按钮需要更饱和的渐变，文字渐变需要更亮的中间色，所以拆成两条 |
| 切角按钮 | `clip-path: polygon(...)` | 用纯 CSS 做出"科幻 HUD"切角，不需要图片或 SVG |
| 毛玻璃导航 | `backdrop-filter: blur(16px) saturate(140%)` + 半透明底 | 滚动时内容从导航下方透出，层次清楚 |
| 粒子背景 | Canvas 2D：72 个节点、三段距离阈值分桶画线、指针 160px 内吸附 | 分桶把 O(n²) 的连线绘制压到 3 次 `stroke()`；上限 72 个节点保证低端机不卡 |
| 高分屏 | `devicePixelRatio` 上限取 2，按 DPR 放大画布再 `setTransform` 缩放 | 避免 3x 屏上画 3 倍像素导致掉帧 |
| 页面隐藏暂停 | `visibilitychange` 里 `cancelAnimationFrame` | 切到别的标签页不空转 CPU |
| 进场动画 | `IntersectionObserver` + `.reveal.in`，用 `--d` 做错峰 | 比监听 scroll 便宜，且天然只触发一次 |
| 导航高亮 | 第二个 `IntersectionObserver`，`rootMargin: -45% 0 -50%` | 让"屏幕中线附近"的区块成为当前区块，比算 offsetTop 稳 |
| 滚动进度 | `scrollY / (scrollHeight - innerHeight)` | 一条 2px 渐变进度条，成本极低但反馈明确 |
| 减少动效 | `prefers-reduced-motion: reduce` 关闭 transition/粒子运动，只画静态一帧 | 无障碍要求，也避免晕动症用户不适 |
| 无 JS 兜底 | `<noscript>` 里强制 `.reveal { opacity: 1 }` | JS 被禁用时内容不能消失 |
| 移动端菜单 | `.nav.is-open` 切换，`aria-expanded` 同步 | 纯 CSS + 一个 class，不引入抽屉库 |
| SEO / 分享 | `description`、`og:*`、`theme-color`、语义化标题层级 | 微信/GitHub 分享时有正确标题与描述 |

## 5. 性能与兼容

| 指标 | 目标 | 实测 |
| --- | --- | --- |
| 首屏内容 | < 1s（本地） | 单文件，无阻塞请求 |
| 动画帧率 | ≥ 55fps | 节点上限 72 + 分桶绘制 |
| 横向溢出 | 0 | 1425 / 1440（1440 视口） |
| 浏览器 | Chrome/Edge 100+、Safari 15+、移动端 | `clip-path`、`backdrop-filter`、`IntersectionObserver` 均在范围内；旧浏览器降级为不透明导航、无切角 |

## 6. 部署流程

```bash
git add .
git commit -m "重做个人主页：深色科技风 + 作品集结构"
git push origin main
```

1. 仓库 Settings → Pages → Deploy from a branch → `main` / `/ (root)`
2. 等待约 1 分钟构建
3. 访问 `https://th-cell-source.github.io/personal-homepage/`
4. 建议勾选 Enforce HTTPS

## 7. 本地预览

```bash
# 方式一：直接双击 index.html（纯静态，file:// 可用）
# 方式二：起个静态服务器，避免个别浏览器的 file:// 限制
python -m http.server 8080
# 打开 http://127.0.0.1:8080
```

## 8. 后续扩展方向

- 深/浅主题切换（把 `:root` 变量抽成两套，按钮切换 `data-theme`）。
- 接入 GitHub API 展示仓库列表与 star 数（需处理缓存与限流）。
- 项目卡片补充截图缩略图（`loading="lazy"` + `aspect-ratio` 占位，避免布局抖动）。
- 增加 RSS 或文章列表（另起项目，不塞进单页）。
