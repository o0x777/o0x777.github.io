# 0x777 的博客

源码在 `master` 分支，推送后由 GitHub Actions 自动构建并发布到 <https://www.0x777.me>。基于 [Astro](https://astro.build)。

## 本地预览

```bash
npm install          # 国内网络慢可加 --registry=https://registry.npmmirror.com
npm run dev          # http://localhost:4321 ，后台运行；astro dev stop 停止
npm run build        # 生成到 dist/
```

## 写一篇新文章

每篇文章一个文件夹，图片和 Markdown 放在一起：

```
src/content/posts/
└── my-new-post/
    ├── index.md
    └── diagram.png
```

`index.md` 开头的 frontmatter：

```yaml
---
title: "文章标题"
slug: "my-new-post"          # 网址最后一段：/2026/09/24/my-new-post/
pubDate: 2026-09-24
description: "一两句话摘要，会显示在首页和搜索结果里"
categories: ["安全专题", "僵尸网络"]
tags: ["botnet", "样本分析"]
draft: false                  # true = 只在本地预览可见
---
```

正文里用相对路径引用图片：`![说明](./diagram.png)`。构建时会自动压缩成 WebP。

> 注意：不要用 Typora 默认的图片路径（`/Users/.../typora-user-images/...`）。在 Typora 里设置
> 「偏好设置 → 图像 → 插入图片时 → 复制到当前文件夹 `./`」。

## 目录结构

| 路径 | 作用 |
|---|---|
| `src/content/posts/` | 文章 |
| `src/pages/about.md` | 关于页 |
| `src/lib/site.ts` | 站点名称、简介、社交链接 |
| `src/styles/global.css` | 颜色、字体、正文排版 |
| `src/layouts/Base.astro` | 页头、导航、页脚 |
| `public/CNAME` | 自定义域名，不要删 |
