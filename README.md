# 专属宠物伙伴

上传宠物照片、选择品种与性格，生成宫崎骏风格的专属形象，与 TA 文字/语音聊天。

## 功能

- **上传照片**：支持上传猫咪、狗狗、鹦鹉、兔子、小猪等宠物照片
- **品种选择**：常见品种（英短、金毛、虎皮鹦鹉、垂耳兔、迷你猪等）
- **性格标签**：温柔、活泼、慵懒、高冷、粘人、调皮等
- **语音风格**：多种男女声线（温柔/活泼/慵懒/磁性等）供选择
- **专属形象**：DALL-E 3（burn.hair）生成宫崎骏风格形象
- **聊天界面**：左侧立体感宠物展示，右侧 MiniMax M2.5 对话 + 单条朗读（TTS）
- **语音通话**：预留语音通话入口（可接入豆包等实时语音 API）

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。API 密钥放在项目根目录 `.env.local`（见下方环境变量）。

## 部署到 Vercel

1. 将仓库推送到 GitHub 后，在 [Vercel](https://vercel.com) 导入该仓库并部署。
2. 在 Vercel 项目 **Settings → Environment Variables** 中配置：
   - `VITE_MINIMAX_API_KEY`：MiniMax（minimaxi.com）Coding Plan API Key，用于对话
   - `VITE_BURNHAIR_API_KEY`：burn.hair 的 API Key，用于 DALL-E 3 图像生成
3. 重新部署后生效。`vercel.json` 已配置 API 代理，生产环境请求会经 Vercel 转发，避免 CORS。

## 环境变量（本地 .env.local）

| 变量 | 说明 |
|------|------|
| `VITE_MINIMAX_API_KEY` | MiniMax 对话（Coding Plan 建议用 MiniMax-M2.5） |
| `VITE_BURNHAIR_API_KEY` | 图片生成（burn.hair / DALL-E 3） |

## 接入真实服务（可选）

1. **图像生成**  
   在 `OnboardingPage` 的「生成形象」步骤中，将 `handleGenerate` 改为调用你的图像 API（如 Replicate FLUX、Stability AI），提示词示例：`Studio Ghibli style, cute pet portrait, soft lighting, ...`，把返回图片 URL 写入 `generatedImageUrl`。

2. **对话回复**  
   在 `ChatPanel` 中把 `getMockReply()` 替换为你的 LLM 接口，根据 `pet.personalityIds`、`pet.breedName` 等构造 system prompt，使回复符合宠物性格与品种。

3. **语音通话**  
   语音通话按钮已预留。要实现类似豆包的流畅对话，可接入支持流式 TTS/STT 的 API（如豆包、阿里等），在 `isVoiceCallActive` 为 true 时建立 WebSocket/HTTP 流，实现边说边播、边说边识别。

## 技术栈

- React 19 + TypeScript + Vite
- Tailwind CSS
- Framer Motion
- Zustand
