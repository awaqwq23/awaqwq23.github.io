# awaqwq23.github.io

<p align="center">
  <img src="https://avatars.githubusercontent.com/u/26668842?v=4" width="120" style="border-radius: 50%;"/>
</p>

<p align="center">
  <strong>awaqwq233 的个人网站</strong><br>
  武汉大学 · 代码 · 玩具 · 生活
</p>

<p align="center">
  <a href="https://awaqwq23.github.io">🌐 访问网站</a>
  &nbsp;|&nbsp;
  <a href="https://github.com/awaqwq23">🐙 GitHub</a>
</p>

---

## 技术栈

- **Vite + React 18** — 现代前端框架
- **React Router** — 客户端路由
- **纯 CSS** — 零 UI 依赖，手写样式，支持 🌙 深色 / ☀️ 浅色主题
- **Font Awesome** — 图标库
- **Google Fonts (Inter)** — 字体
- **GitHub Actions** — 自动构建部署
- **GitHub Pages** — 免费托管

## ✨ 功能亮点

- 🌗 **深色模式** — 跟随系统或手动切换，无刷新闪烁，记忆偏好
- 🎮 **小游戏厅** — 7 款纯浏览器小游戏，成绩本地保存：
  2048 · 贪吃蛇 · 记忆翻牌 · 扫雷 · 井字棋（不败 AI）· 反应测试 · 打地鼠
- 🔖 **资料收藏** — 收藏夹 / 开发软件 / AI 工具 / 工具软件 / 图片生成 / 娱乐导航，支持搜索
- 📝 **博客系统** — 分类筛选 + 日期排序 + 标签
- 🎯 **首页数据墙** — 滚动触发的数字滚动动画
- ⬆️ **回到顶部** — 带滚动进度环
- 🚫 **404 页面** — 走丢也不怕

## 站点结构

```
├── index.html                 # Vite 入口 (含无闪烁主题初始化脚本)
├── src/
│   ├── main.jsx               # React 入口
│   ├── App.jsx                # 路由 & 布局 & 404
│   ├── App.css                # 全局样式 (深海蓝主题 + 深色模式)
│   ├── hooks/
│   │   ├── useTheme.js        # 深浅色主题切换
│   │   └── useScrollReveal.js # 滚动淡入动画
│   ├── components/
│   │   ├── Navbar.jsx         # 顶部导航栏 + 主题开关
│   │   ├── Footer.jsx         # 页脚
│   │   ├── PostCard.jsx       # 博客文章卡片
│   │   ├── ThemeToggle.jsx    # 🌙/☀️ 主题切换按钮
│   │   └── BackToTop.jsx      # 回到顶部按钮 (带进度环)
│   ├── games/                 # 🎮 小游戏组件
│   │   ├── Game2048.jsx       # 2048
│   │   ├── Snake.jsx          # 贪吃蛇
│   │   ├── Memory.jsx         # 记忆翻牌
│   │   ├── Minesweeper.jsx    # 扫雷
│   │   ├── TicTacToe.jsx      # 井字棋 (minimax 不败 AI)
│   │   ├── ReactionTest.jsx   # 反应测试
│   │   └── WhackAMole.jsx     # 打地鼠
│   └── pages/
│       ├── Home.jsx           # 首页 — 动态渐变 Hero + 数据墙 + 导航卡片 + 最新文章
│       ├── Blog.jsx           # 博客列表 — 分类筛选 + 日期排序
│       ├── Toys.jsx           # 小玩具 — 项目 / 游戏 / 资料入口
│       ├── Games.jsx          # 小游戏厅 — 7 款小游戏
│       ├── Docs.jsx           # 资料 — 6 大模块导航 + 搜索
│       └── About.jsx          # 关于我 — 个人简介 + 技能 + 时间线
├── public/
│   ├── blog/posts/            # 静态博客文章 (HTML + index.json)
│   └── materials/             # 资料页数据 (收藏夹 / 开发软件 / AI / 工具 / 图片 / 娱乐)
├── .github/workflows/deploy.yml  # GitHub Actions 自动部署
└── README.md
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📝 写博客 & 上传

### 写一篇新博客

1. 在 `public/blog/posts/` 文件夹下创建 `.html` 文件，比如 `my-first-post.html`
2. 用这个模板写文章：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文章标题 · awaqwq233</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; max-width: 720px; margin: 3rem auto; padding: 0 1.5rem; line-height: 1.9; color: #1e293b; }
    h1 { font-size: 2rem; font-weight: 800; }
    .meta { color: #94a3b8; font-size: 0.9rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0; }
    p { margin-bottom: 1.25rem; }
    pre { background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    code { background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
    a { color: #3B82F6; text-decoration: none; }
    a:hover { color: #2563EB; }
    .back { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <h1>你的文章标题</h1>
  <div class="meta">
    <span>📅 2026-07-14</span> &nbsp;·&nbsp; <span>💻 技术</span>
  </div>
  <p>这里写你的正文内容...</p>
  <div class="back">
    <a href="/#/blog">← 返回博客</a>
  </div>
</body>
</html>
```

### 注册到博客列表

编辑 `public/blog/posts/index.json`，把你的文章信息加进去：

```json
[
  {
    "title": "你的文章标题",
    "date": "2026-07-14",
    "category": "tech",
    "categoryLabel": "💻 技术",
    "tags": ["标签1", "标签2"],
    "excerpt": "文章摘要，会显示在博客列表卡片上",
    "url": "/blog/posts/my-first-post.html"
  }
]
```

**分类可选：** `tech`(技术) / `life`(生活) / `dev`(开发) / `toy`(玩具)

### 上传部署

```bash
git add .
git commit -m "feat: 添加新博客"
git push
```

GitHub Actions 会自动构建部署 ~1 分钟后网站更新 ✨

## 📅 修改历程（时间线）

打开 `src/pages/About.jsx`，找到 `timeline` 数组：

```jsx
const timeline = [
  { title: '你的事件标题', time: '时间', desc: '事件描述' },
]
```

按格式增删条目即可，按时间先后排列。中间的蓝点会自动显示。

## 配色

| 角色 | 色值 |
|------|------|
| 主色 | `#3B82F6` |
| 主色暗 | `#2563EB` |
| 深海蓝 | `#1E3A5F` |
| 点缀青 | `#06B6D4` |
| 点缀紫 | `#8B5CF6` |

## 许可证

MIT © 2025-2026 awaqwq233
