# 技术设计文档

## 1. 技术栈
- **前端**：纯 HTML5 + CSS3（无框架、无构建工具）
- **图标**：CSS 渐变 + emoji
- **部署**：GitHub Pages（静态托管，自动 HTTPS）
- **版本管理**：Git + GitHub

## 2. 为什么选这个栈
- 个人主页内容少，上框架（React/Vue）属于杀鸡用牛刀
- 纯静态加载最快，适合首页展示
- GitHub Pages 免费、自动部署、国内可访问

## 3. 目录结构
```
personal-homepage/
├── index.html      # 主页（单文件，内联 CSS）
├── PRD.md          # 产品需求文档
├── TECH.md         # 本文件
├── AGENT.md        # AI 开发规范
└── README.md       # 仓库说明
```

## 4. 关键技术点
| 技术点 | 实现方式 |
|---|---|
| 响应式 | CSS `@media (max-width: 480px)` 单栏变双栏 |
| 头像 | CSS 渐变圆形 + 首字 |
| 卡片阴影 | `box-shadow: 0 16px 48px rgba(31,35,41,.1)` |
| 链接跳转 | `<a target="_blank">` 新窗口打开外链 |
| HTTPS | GitHub Pages 自动启用 Enforce HTTPS |

## 5. 部署流程
1. `git push` 到 main 分支
2. 仓库 Settings → Pages → Deploy from a branch → main / root
3. 等 1 分钟自动构建，访问 `https://th-cell-source.github.io/personal-homepage/`

## 6. 后续扩展方向
- 接入 GitHub API 动态展示仓库列表
- 增加暗色模式切换按钮
- 增加项目作品展示区（卡片网格）
