# Git 自动部署 · www.liukui2050.com

本目录已是一个**初始化好的 Git 仓库**，104 个文件已提交，分支 `main`。
你只需加上自己的远端并推送，Vercel 会自动部署。

---

## 情况 A：Vercel 之前已关联这个仓库（最常见）

```bash
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

推完等 1–2 分钟，Vercel 自动构建上线。

> 如果远端默认分支是 `master` 而不是 `main`：
> ```bash
> git push -u origin main:master
> ```

## 情况 B：仓库里已有旧内容，需要覆盖

```bash
git remote add origin https://github.com/你的用户名/你的仓库名.git
git fetch origin
git pull origin main --allow-unrelated-histories   # 有冲突就手动保留新版
git push -u origin main
```

或者简单粗暴（**会清空远端历史**，确认无重要记录再用）：

```bash
git push -u origin main --force
```

## 情况 C：还没建仓库

1. 去 github.com 新建空仓库（**不要**勾 README / .gitignore）
2. 执行：
   ```bash
   git remote add origin https://github.com/你的用户名/新仓库名.git
   git push -u origin main
   ```
3. 打开 vercel.com → Add New → Project → Import 这个仓库
4. **Framework Preset 选 Other**，Build Command 和 Output Directory 都留空
5. Deploy

---

## 首次在 Vercel 导入时的设置

| 项目 | 值 |
|---|---|
| Framework Preset | **Other** |
| Build Command | 留空 |
| Output Directory | 留空 |
| Install Command | 留空（会自动 `npm install` 装 `@vercel/kv`） |
| Root Directory | 留空（仓库根目录） |

这几个留空很重要——本项目是纯静态 + Serverless Functions，不需要构建步骤。

---

## 域名（只在新项目时才需要）

若 Vercel 后台从没绑过 liukui2050.com：

| 主机记录 | 类型 | 值 |
|---|---|---|
| `@` | A | `76.76.21.21` |
| `www` | CNAME | `cname.vercel-dns.com` |

已绑过就不用再动，部署完自动生效。

---

## 验证

```
https://www.liukui2050.com/                 → 新标题「文明互鉴 · 思辨點亮」
https://www.liukui2050.com/maps/            → 90 张卡 + 右侧滑条
https://www.liukui2050.com/api/deity-stats  → 埋点统计
```

第三个返回 `{"ok":true,...}` 说明 Serverless Functions 正常。
若返回 404，说明 Functions 没生效（通常是 Root Directory 配错）。

看到旧页面就按 `Ctrl+Shift+R` 强制刷新。

---

## 本次更新内容

- 首页文案：主标题改「文明互鉴 · 思辨點亮」，副标题与第 4 张卡描述新增"与澳門共鸣"
- 全站埋点统一：96 页各配唯一 slug（原 92 张地图页全是 `map`，无法区分）
- 修复天后页、总图页的重复注入（事件会翻倍）
- 新增 89 全球華人廟宇總圖（770 座）、90 世界遺產基督教堂（335 座）
- 88 主神主页新增右侧上下滑条 + 每 10 位刻度锚点
- 10 座新加坡庙宇地区/年份/坐标更正（43 条 / 18 页）
- overlay iframe 改懒加载（主页加载不再请求 88 个地图页）
