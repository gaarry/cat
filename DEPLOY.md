# 提交 GitHub 并部署 Vercel

## 1. 推送到 GitHub（在项目目录执行）

仓库已初始化并完成首次提交，你只需创建远程仓库并推送：

```bash
cd /Users/xixi/文件/代码/cat

# 用 GitHub CLI 创建仓库并推送（你已配置 gh）
gh repo create cat --source=. --public --push --description "专属宠物伙伴 - MiniMax 对话 + DALL-E 3 宫崎骏风格形象"
```

若仓库已存在，只需添加 remote 并推送：

```bash
git remote add origin https://github.com/你的用户名/cat.git
git push -u origin main
```

## 2. 部署到 Vercel

**方式 A：Vercel 网页**

1. 打开 [vercel.com](https://vercel.com) 并登录
2. **Add New → Project**，从 GitHub 导入 **cat** 仓库
3. 保持默认（Framework: Vite，Build Command: `npm run build`，Output: `dist`）
4. **Environment Variables** 添加：
   - `VITE_MINIMAX_API_KEY` = 你的 MiniMax API Key
   - `VITE_BURNHAIR_API_KEY` = 你的 burn.hair API Key
5. 点击 **Deploy**

**方式 B：Vercel CLI**

```bash
npm i -g vercel
cd /Users/xixi/文件/代码/cat
vercel
# 按提示登录、关联项目，并在提示时添加上述两个环境变量
vercel --prod
```

## 3. 说明

- 项目里的 `vercel.json` 已配置 API 代理（`/api/minimax`、`/api/burnhair`），生产环境会经 Vercel 转发，避免 CORS。
- 密钥只写在 Vercel 环境变量中，不要提交到 GitHub。
