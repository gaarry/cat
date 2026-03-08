/**
 * 宠物品种识别 API (Qwen VL via 阿里云)
 */

function getApiKey(): string {
  return import.meta.env.VITE_QWEN_API_KEY ?? '';
}

export interface PetBreedResult {
  species: string;       // 猫 / 狗 / 兔子等
  breed: string;         // 具体品种
  color: string;         // 毛色
  features: string;      // 显著特征
  confidence: number;    // 置信度 0-1
}

/**
 * 调用 Qwen VL 识别宠物图片，返回品种和特征
 * @param imageUrl - 图片 URL (base64 或 http)
 * @param model - 视觉模型名称
 */
export async function identifyPetFromImage(imageUrl: string, model: string = 'qwen2.5-vl-32b-instruct'): Promise<PetBreedResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('缺少 Qwen API Key');
    return null;
  }

  const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: '请仔细分析这张宠物图片，识别出：1.宠物种类(cat/dog/rabbit/parrot/pig) 2.具体品种 3.毛色花纹 4.显著外观特征。请以JSON格式返回：{"species":"cat","breed":"British Shorthair","color":"blue","features":"圆脸大眼睛","confidence":0.95}' }
          ]
        }
      ]
    }),
  });

  if (!res.ok) {
    console.error('Qwen VL API HTTP 错误', res.status, await res.text());
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
    console.error('Qwen VL 业务错误', data.error);
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
    console.error('解析 Qwen 响应失败', e);
  }

  return null;
}
