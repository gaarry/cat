/**
 * 宠物品种识别 API (GPT-4V via burn.hair)
 */

const API_BASE = '/api/burnhair';
const VISION_URL = `${API_BASE}/v1/chat/completions`;

function getApiKey(): string {
  return import.meta.env.VITE_BURNHAIR_API_KEY ?? '';
}

export interface PetBreedResult {
  species: string;       // 猫 / 狗 / 兔子等
  breed: string;         // 具体品种
  color: string;         // 毛色
  features: string;      // 显著特征
  confidence: number;    // 置信度 0-1
}

/**
 * 调用 GPT-4V 识别宠物图片，返回品种和特征
 * @param imageUrl - 图片 URL (base64 或 http)
 */
export async function identifyPetFromImage(imageUrl: string): Promise<PetBreedResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('缺少 burn.hair API Key');
    return null;
  }

  const messages = [
    {
      role: 'system',
      content: `你是一个专业的宠物品种识别专家。请仔细分析用户上传的宠物图片，识别出：
1. 宠物种类（cat/dog/rabbit/parrot/pig）
2. 具体品种（如 British Shorthair, Golden Retriever 等）
3. 毛色和花纹
4. 显著外观特征

请以JSON格式返回，不要有其他内容：
{"species": "cat", "breed": "British Shorthair", "color": "blue", "features": "圆脸，大眼睛", "confidence": 0.95}`
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: '请识别这只宠物的品种和特征' },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }
  ];

  const res = await fetch(VISION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    console.error('GPT-4V API HTTP 错误', res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
    error?: { message?: string };
  };

  if (data.error) {
    console.error('GPT-4V 业务错误', data.error);
    return null;
  }

  const content = data.choices?.[0]?.message?.content ?? '';
  
  // 解析 JSON
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        species: parsed.species ?? 'unknown',
        breed: parsed.breed ?? 'unknown',
        color: parsed.color ?? '',
        features: parsed.features ?? '',
        confidence: parsed.confidence ?? 0.5,
      };
    }
  } catch (e) {
    console.error('解析 GPT 响应失败', e);
  }

  return null;
}
