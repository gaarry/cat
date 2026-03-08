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
  const prompt = `请仔细观察这张宠物照片，识别并返回 JSON，全部使用中文。

要求：
1. species：物种，中文即可，如：猫、狗、鹦鹉、兔子、猪
2. breed：品种中文名，如：英国短毛猫、金毛寻回犬、虎皮鹦鹉；若不确定可写最常见品种
3. color：毛色/肤色的详细中文描述，至少 2～3 条。例如：蓝灰色、带白色胸毛、四蹄白色、眼圈与鼻周深色、虎斑纹路 等，尽量具体
4. features：外貌特征的详细中文描述，至少 3～5 条。例如：圆脸、大而圆的眼睛、短毛、体型敦实、耳朵较小、嘴套饱满、表情温和 等，越细致越好

直接返回一个 JSON 对象，不要其他文字，格式示例：
{"species":"猫","breed":"英国短毛猫","color":"蓝灰色，胸前与四爪有白色，鼻周深色","features":"圆脸，大而圆的眼睛，短毛，体型敦实，耳朵小且圆，嘴套饱满"}`
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
  const petDesc = [species, breedName].filter(Boolean).join(' ')
  const extra = [color, features].filter(Boolean).join(', ')
  const base = extra ? `A cute ${petDesc}, ${extra}.` : `A cute ${petDesc}.`
  switch (style) {
    case 'ghibli': return `${base} Portrait, Studio Ghibli style, hand-drawn anime, pastel colors, big eyes, friendly expression.`
    case 'emoji': return `${base} 3D emoji avatar, colorful, playful, Apple Memoji style, round face.`
    case 'anime': return `${base} Anime style, Japanese manga, large eyes, vibrant colors, kawaii.`
    case 'simple': return `${base} Simple hand-drawn style, naive art, childlike drawing.`
    default: return `${base} Photorealistic, professional photography, studio lighting, cute.`
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

/** 本地开发时处理 /api/identify、/api/generate，避免 404（部署到 Vercel 时由 Vercel 执行 api/*.ts） */
function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const isIdentify = req.url === '/api/identify' && req.method === 'POST'
        const isGenerate = req.url === '/api/generate' && req.method === 'POST'
        if (!isIdentify && !isGenerate) return next()

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
          const result = isIdentify ? await localIdentify(body) : await localGenerate(body)
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
