# 墨页 MOYE · 官方网站

独立静态网站：主页、功能、下载中心、更新日志、帮助与 FAQ。

## 本地预览

在本站根目录执行 `python3 -m http.server 8080`，打开 http://127.0.0.1:8080/ 。无 npm 依赖。

## 免费部署

Render Static Site 指向包含本目录的 Git 仓库，Branch 为 `moye-official-web`，Build Command 为 `echo ready`，Publish Directory 为 `moye-site`（上传到仓库此子目录时）。

## 安装包说明

Windows: Moye-18.3.2-Setup-Win64.exe (SHA-256 c040b1616524e84b8f46ca3d4da52146034fba87be478dc1d16b9b11dd835194)
Android: Moye-18.3.1-Android.apk (SHA-256 15461f5ceb466a0f9afb5cfc5764843d22c6bc26a1d173fdbf1aa55a779dcaa2)

**注意：** 网站不声称已经公开托管这两个二进制文件。默认下载按钮提示文件名，不指向不存在的 URL。配置可信公开托管后，再替换 `download/index.html` 中的按钮为已核验实际可用的下载链接。

## 功能边界

目前仅支持可互通 LAN 内的书库同步；并未宣称公网账号/验证码/云端自动备份已上线；写作草稿未实现双端自动合并。展示窗口为官网视觉示意，并非实时软件截图。

## 性能和可用性

响应式布局、图片静态优化、IntersectionObserver 动效、prefers-reduced-motion、语义结构与键盘导航。

## Visual refresh v3

The v3 UI introduces a centered hero showcase, consistent 1200px content grid,
clearer mobile layouts, animated device entry, ambient background lighting,
animated editorial ribbon, section reveals and an animation replay control.
Every motion effect has a reduced-motion fallback and no external JS dependency.

Deployment source includes CSS/JS in assets and inline icon data URIs for
reliable static hosting without separate binary assets.