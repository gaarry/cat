import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** 读取 POST body（JSON），超限时排空不 destroy，避免客户端 ERR_CONNECTION_RESET */
function readJsonBody(req: import('http').IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    let overLimit = false
    req.on('data', (chunk: Buffer) => {
      if (overLimit) return
      total += chunk.length
      if (total > maxBytes) {
        overLimit = true
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (overLimit) {
        reject(new Error('body too large'))
        return
      }
      resolve(Buffer.concat(chunks).toString())
    })
    req.on('error', reject)
  })
}

function sendJson(res: import('http').ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

/** 与 api/identify.ts 相同的识别逻辑，供本地开发使用 */
async function localIdentify(body: Record<string, unknown>) {
  const apiKey = process.env.QWEN_API_KEY
  if (!apiKey) return { status: 500, data: { error: 'Missing API key' } }
  const imageUrl = body.imageUrl as string | undefined
  if (!imageUrl || typeof imageUrl !== 'string') return { status: 400, data: { error: 'Missing imageUrl' } }
  const model = (body.model as string) || 'qwen2.5-vl-32b-instruct'
  const prompt = `你是宠物视觉识别助手。请基于图片中“可见信息”做结构化识别，并严格输出 JSON（不要 markdown、不要解释、不要多余文本）。

输出要求（全部中文）：
1. species：物种（猫/狗/鹦鹉/兔子/猪等）
2. breed：品种中文名（如英国短毛猫、金毛寻回犬、虎皮鹦鹉）；不确定时给最可能品种，不要编造稀有品种
3. color：毛色/羽色/肤色与花纹细节，至少包含 4 个维度并合并成一句：
   - 主色
   - 次色
   - 花纹/斑块/条纹位置（如额头、背部、四肢、尾巴、胸口）
   - 鼻子/耳缘/爪垫/眼周等局部颜色特征
4. features：外貌特征，至少 6 个要点并合并成一句，优先包含：
   - 脸型与口鼻部
   - 眼睛形状/颜色/神态
   - 耳朵形状与位置
   - 体型比例（瘦长/敦实/短腿等）
   - 毛发长度与质感（短毛/长毛/蓬松/顺滑）
   - 独特标记（泪痕、白袜、项圈痕迹、尾尖颜色等）
5. confidence：0~1 的小数，表示整体判断置信度

约束：
- 只能根据图中可见信息判断，不要脑补看不见的内容
- 若遮挡严重，在 features 中点明“部分区域被遮挡”
- 保持简洁但信息密度高

返回格式（必须完全是 JSON 对象）：
{"species":"猫","breed":"英国短毛猫","color":"主色蓝灰，胸口与四爪有白色，背部毛色更深，鼻周偏深灰，眼周有浅色过渡","features":"圆脸，嘴套饱满，眼睛大而圆偏金色，耳朵小且耳尖圆，短毛且质地厚实，体型敦实，尾巴中等长度且尾尖略深色","confidence":0.89}`
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }, { type: 'text', text: prompt }] }],
    }),
  })
  const data = (await response.json()) as Record<string, unknown>
  const content = (data?.choices as Array<{ message?: { content?: string } }>)?.[0]?.message?.content
  if (content) {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) return { status: 200, data: JSON.parse(jsonMatch[0]) }
  }
  return { status: 500, data: { error: '识别失败', details: data } }
}

/** 与 api/generate.ts 相同的 prompt + 生成逻辑，供本地开发使用 */
function buildPetStylePrompt(style: string, species: string, breedName: string, color: string, features: string) {
  const petDesc = [species, breedName].filter(Boolean).join(' ').trim()
  const appearance = [color, features].filter(Boolean).join('; ').trim()
  const identityAnchor = [
    `Primary subject: one ${petDesc || 'pet'}.`,
    appearance ? `Appearance cues from analysis: ${appearance}.` : '',
    'Use the uploaded reference image as the identity anchor.',
    'Keep species, face shape, ear shape, eye color, nose color, coat color and markings, body proportions, and distinctive marks consistent with the reference.',
    'Do not replace the pet with a different animal and do not change key markings.',
  ]
    .filter(Boolean)
    .join(' ')
  const quality =
    'High detail, clean composition, natural anatomy, soft cinematic lighting, single subject, centered portrait, no text, no watermark, no logo.'
  switch (style) {
    case 'ghibli':
      return `${identityAnchor} Please convert this image into an anime-style illustration inspired by the visual aesthetics of Studio Ghibli. Maintain the original composition and key elements, but reimagine them with Ghibli-style features: soft painterly textures, warm and natural color palettes, detailed backgrounds, and expressive character design. Aim for a whimsical and nostalgic atmosphere with magical realism, similar to classic Ghibli films. ${quality}`
    case 'emoji':
      return `${identityAnchor} Please convert this image into a premium 3D emoji-style portrait. Maintain the original composition and key identity traits, while reimagining the pet with rounded geometry, glossy materials, smooth soft shadows, bright but balanced colors, and a clean minimal background. Keep the expression friendly, playful, and instantly readable like a polished avatar sticker. ${quality}`
    case 'anime':
      return `${identityAnchor} Please convert this image into a high-quality Japanese anime illustration. Maintain the original composition and key features, then apply crisp line art, layered cel-shading with subtle gradients, vibrant cinematic color design, expressive eyes, and detailed fur rendering. The final image should feel like a modern anime key visual while preserving the pet's real identity. ${quality}`
    case 'simple':
      return `${identityAnchor} Please convert this image into a minimalist hand-drawn illustration. Maintain the original composition and key identity traits, then simplify forms into clean outlines, soft flat colors, light paper texture, and an uncluttered background. Keep a warm, gentle, storybook-like mood with clear silhouette readability. ${quality}`
    default:
      return `${identityAnchor} Please convert this image into a photorealistic cinematic pet portrait. Maintain the original composition and key identity traits, with realistic fur strands, accurate colors and markings, natural anatomy, and subtle facial micro-details. Use an 85mm lens look, shallow depth of field, soft studio lighting, and professional color grading for a premium editorial finish. ${quality}`
  }
}

async function localGenerate(body: Record<string, unknown>) {
  const apiKey = process.env.QWEN_API_KEY
  if (!apiKey) return { status: 500, data: { error: 'Missing API key' } }
  const { breedName, species, style, color, features, model, referenceImage } = body as Record<string, string>
  const prompt = buildPetStylePrompt(style || '', species || '', breedName || '', color || '', features || '')
  const contentWithImage: Array<{ text: string } | { image: string }> = [{ text: prompt }]
  if (referenceImage && typeof referenceImage === 'string' && referenceImage.startsWith('data:image')) {
    contentWithImage.push({ image: referenceImage })
  }
  let data: Record<string, unknown>
  let response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || 'qwen-image-2.0-pro',
      input: { messages: [{ role: 'user', content: contentWithImage }] },
    }),
  })
  data = await response.json() as Record<string, unknown>
  let imageUrl = (data.choices as any)?.[0]?.message?.content?.[0]?.image ?? (data.output as any)?.choices?.[0]?.message?.content?.[0]?.image
  if (!imageUrl && contentWithImage.length > 1) {
    response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'qwen-image-2.0-pro',
        input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
      }),
    })
    data = await response.json() as Record<string, unknown>
    imageUrl = (data.choices as any)?.[0]?.message?.content?.[0]?.image ?? (data.output as any)?.choices?.[0]?.message?.content?.[0]?.image
  }
  if (imageUrl) return { status: 200, data: { imageUrl } }
  return { status: 500, data: { error: '生成失败', details: data } }
}

/** 与 api/generateBurnhair.ts 一致：burnhair DALL-E 3 图像生成，供本地开发 */
async function localGenerateBurnhair(body: Record<string, unknown>) {
  const apiKey = process.env.VITE_BURNHAIR_API_KEY || process.env.BURNHAIR_API_KEY
  if (!apiKey) return { status: 500, data: { error: 'Missing API key (VITE_BURNHAIR_API_KEY)' } }
  const { breedName, species, style, color, features, model } = body as Record<string, string>
  const petDesc = [species, breedName].filter(Boolean).join(' ').trim()
  const appearance = [color, features].filter(Boolean).join('; ').trim()
  const identityAnchor = [
    `Primary subject: one ${petDesc || 'pet'}.`,
    appearance ? `Appearance cues: ${appearance}.` : '',
    'Keep the same pet identity and preserve species, coat color, markings, face structure, ear shape, eye details, and body proportions.',
    'Do not alter key visual traits.',
  ]
    .filter(Boolean)
    .join(' ')
  const quality = 'High detail, clean composition, natural anatomy, no text, no watermark, no logo.'
  let prompt = ''
  switch (style) {
    case 'ghibli':
      prompt = `${identityAnchor} Please convert this image into an anime-style illustration inspired by the visual aesthetics of Studio Ghibli. Maintain the original composition and key elements, but reimagine them with Ghibli-style features: soft painterly textures, warm and natural color palettes, detailed backgrounds, and expressive character design. Aim for a whimsical and nostalgic atmosphere with magical realism, similar to classic Ghibli films. ${quality}`
      break
    case 'emoji':
      prompt = `${identityAnchor} Please convert this image into a premium 3D emoji-style portrait. Maintain the original composition and key identity traits, while reimagining the pet with rounded geometry, glossy materials, smooth soft shadows, bright but balanced colors, and a clean minimal background. Keep the expression friendly, playful, and instantly readable like a polished avatar sticker. ${quality}`
      break
    case 'anime':
      prompt = `${identityAnchor} Please convert this image into a high-quality Japanese anime illustration. Maintain the original composition and key features, then apply crisp line art, layered cel-shading with subtle gradients, vibrant cinematic color design, expressive eyes, and detailed fur rendering. The final image should feel like a modern anime key visual while preserving the pet's real identity. ${quality}`
      break
    case 'simple':
      prompt = `${identityAnchor} Please convert this image into a minimalist hand-drawn illustration. Maintain the original composition and key identity traits, then simplify forms into clean outlines, soft flat colors, light paper texture, and an uncluttered background. Keep a warm, gentle, storybook-like mood with clear silhouette readability. ${quality}`
      break
    default:
      prompt = `${identityAnchor} Please convert this image into a photorealistic cinematic pet portrait. Maintain the original composition and key identity traits, with realistic fur strands, accurate colors and markings, natural anatomy, and subtle facial micro-details. Use an 85mm lens look, shallow depth of field, soft studio lighting, and professional color grading for a premium editorial finish. ${quality}`
  }
  const response = await fetch('https://cn-test.burn.hair/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || 'dall-e-3',
      prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    }),
  })
  const data = (await response.json()) as Record<string, unknown>
  const url = (data.data as Array<{ url?: string }>)?.[0]?.url
  if (url) return { status: 200, data: { imageUrl: url } }
  return { status: 500, data: { error: '生成失败', details: data } }
}

/** burnhair GPT-4o 视觉识别，与 api/identifyBurnhair.ts 一致，供本地开发 */
async function localIdentifyBurnhair(body: Record<string, unknown>) {
  const apiKey = process.env.VITE_BURNHAIR_API_KEY || process.env.BURNHAIR_API_KEY
  if (!apiKey) return { status: 500, data: { error: 'Missing API key (VITE_BURNHAIR_API_KEY)' } }
  const imageUrl = body.imageUrl as string | undefined
  if (!imageUrl || typeof imageUrl !== 'string') return { status: 400, data: { error: 'Missing imageUrl' } }
  const model = (body.model as string) || 'gpt-4o'
  const prompt = `你是宠物视觉识别助手。请基于图片中“可见信息”做结构化识别，并严格输出 JSON（不要 markdown、不要解释、不要多余文本）。

输出要求（全部中文）：
1. species：物种（猫/狗/鹦鹉/兔子/猪等）
2. breed：品种中文名（如英国短毛猫、金毛寻回犬、虎皮鹦鹉）；不确定时给最可能品种，不要编造稀有品种
3. color：毛色/羽色/肤色与花纹细节，至少包含 4 个维度并合并成一句：
   - 主色
   - 次色
   - 花纹/斑块/条纹位置（如额头、背部、四肢、尾巴、胸口）
   - 鼻子/耳缘/爪垫/眼周等局部颜色特征
4. features：外貌特征，至少 6 个要点并合并成一句，优先包含：
   - 脸型与口鼻部
   - 眼睛形状/颜色/神态
   - 耳朵形状与位置
   - 体型比例（瘦长/敦实/短腿等）
   - 毛发长度与质感（短毛/长毛/蓬松/顺滑）
   - 独特标记（泪痕、白袜、项圈痕迹、尾尖颜色等）
5. confidence：0~1 的小数，表示整体判断置信度

约束：
- 只能根据图中可见信息判断，不要脑补看不见的内容
- 若遮挡严重，在 features 中点明“部分区域被遮挡”
- 保持简洁但信息密度高

返回格式（必须完全是 JSON 对象）：
{"species":"猫","breed":"英国短毛猫","color":"主色蓝灰，胸口与四爪有白色，背部毛色更深，鼻周偏深灰，眼周有浅色过渡","features":"圆脸，嘴套饱满，眼睛大而圆偏金色，耳朵小且耳尖圆，短毛且质地厚实，体型敦实，尾巴中等长度且尾尖略深色","confidence":0.89}`
  const response = await fetch('https://cn-test.burn.hair/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }, { type: 'text', text: prompt }] },
      ],
    }),
  })
  const data = (await response.json()) as Record<string, unknown>
  const content = (data?.choices as Array<{ message?: { content?: string } }>)?.[0]?.message?.content
  if (content) {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) return { status: 200, data: JSON.parse(jsonMatch[0]) }
  }
  return { status: 500, data: { error: '识别失败', details: data } }
}

/** 本地开发时处理 /api/identify、/api/identifyBurnhair、/api/generate、/api/generateBurnhair，避免 404 */
function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const isIdentify = req.url === '/api/identify' && req.method === 'POST'
        const isIdentifyBurnhair = req.url === '/api/identifyBurnhair' && req.method === 'POST'
        const isGenerate = req.url === '/api/generate' && req.method === 'POST'
        const isGenerateBurnhair = req.url === '/api/generateBurnhair' && req.method === 'POST'
        if (!isIdentify && !isIdentifyBurnhair && !isGenerate && !isGenerateBurnhair) return next()

        const maxBody = 10 * 1024 * 1024
        let body: Record<string, unknown>
        try {
          const raw = await readJsonBody(req, maxBody)
          body = raw ? JSON.parse(raw) : {}
        } catch (e) {
          const msg = (e as Error).message
          if (msg === 'body too large') {
            sendJson(res, 413, { error: 'Request body too large' })
          } else {
            sendJson(res, 400, { error: 'Invalid JSON body' })
          }
          return
        }

        try {
          const result = isIdentify
            ? await localIdentify(body)
            : isIdentifyBurnhair
              ? await localIdentifyBurnhair(body)
              : isGenerateBurnhair
                ? await localGenerateBurnhair(body)
                : await localGenerate(body)
          if (!res.writableEnded) sendJson(res, result.status, result.data)
        } catch (e) {
          if (!res.writableEnded) sendJson(res, 500, { error: (e as Error).message })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)
  if (!process.env.QWEN_API_KEY && process.env.VITE_QWEN_API_KEY) {
    process.env.QWEN_API_KEY = process.env.VITE_QWEN_API_KEY
  }
  return {
    plugins: [react(), localApiPlugin()],
    server: {
      proxy: {
      '/api/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
      },
      '/api/minimax': {
        target: 'https://api.minimaxi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/minimax/, ''),
      },
      '/api/burnhair': {
        target: 'https://cn-test.burn.hair',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/burnhair/, ''),
      },
    },
  },
  }
})
