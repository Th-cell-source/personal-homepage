# 田昊 · 个人主页

大连民族大学 · 物联网工程 2024 级 · 全栈开发 / 嵌入式 / 大模型应用。

《软件开发综合实践》"个人网站开发与部署"任务交付物：纯 HTML/CSS/JS 单文件，无框架、无构建、零外部请求，部署在 GitHub Pages。

**线上地址**：<https://th-cell-source.github.io/personal-homepage/>

![桌面端预览](screenshots/preview-desktop.png)

## 页面结构

| 区块 | 内容 |
| --- | --- |
| 导航 | 固定毛玻璃条，滚动高亮当前区块，移动端折叠菜单 |
| 首屏 | 一句话主张 + 姓名/专业/方向 + 学校学号 + 两个 CTA + 终端名片 |
| 数据条 | 项目数 / 自训练模型参数 / 实训天数 / 后端测试项 |
| 关于我 | 三段介绍 + 七项事实（姓名、学校、学院专业、年级学号、指导教师、方向） |
| 技能栈 | 后端、前端、AI 大模型、嵌入式四组标签 |
| 项目作品 | 智语 Chat、电商图片下载助手、本站 |
| 实训历程 | 10-20 ~ 10-28 七天时间线 |
| 联系 | GitHub / 主页 / 学校 / 专业 |

## 技术要点

- **设计令牌**：`:root` 统一颜色、字体、缓动；按钮另用更饱和的 `--grad-btn`。
- **Canvas 粒子**：72 节点上限、距离分桶绘制、DPR 上限 2、页面隐藏暂停、指针吸附。
- **交互**：滚动进度条、`IntersectionObserver` 进场与导航高亮、`prefers-reduced-motion` 降级。
- **无 JS 兜底**：`<noscript>` 强制显示内容。

## 本地预览

```bash
# 直接双击 index.html，或起个静态服务器
python -m http.server 8080
# http://127.0.0.1:8080
```

## 文档

- [PRD.md](PRD.md) — 产品需求
- [TECH.md](TECH.md) — 技术设计
- [AGENT.md](AGENT.md) — AI 协作规范

## 部署

推送到 `main` 分支 → Settings → Pages → Deploy from a branch → `main` / root，约 1 分钟后生效。
