/**
 * DeepSeek 图像生成 API
 * 官方文档未明确列出图像接口时，尝试 OpenAI 兼容格式与常见格式，失败则返回 null 由上层降级。
 */

const API_BASE = import.meta.env.DEV
  ? '/api/deepseek/v1'
  : 'https://api.deepseek.com/v1';

function getApiKey(): string {
  return import.meta.env.VITE_DEEPSEEK_API_KEY ?? '';
}

/** 宫崎骏/吉卜力风格提示词 */
export function buildPetImagePrompt(breedName: string, species: string): string {
  const style =
    'Studio Ghibli style, Miyazaki anime, soft lighting, warm colors, cute pet portrait, gentle watercolor feel, whimsical, high quality';
  return `A cute ${species} pet, breed: ${breedName}. ${style}. Single character, centered, friendly expression.`;
}

export interface GenerateImageOptions {
  /** 品种名，用于提示词 */
  breedName: string;
  /** 物种，如 cat / dog */
  species: string;
}

/**
 * 调用 DeepSeek 图像生成接口。
 * 若当前账号/接口不支持图像生成，返回 null（上层用上传照片降级）。
 */
export async function generatePetImage(options: GenerateImageOptions): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const prompt = buildPetImagePrompt(options.breedName, options.species);

  // 尝试 1：OpenAI 兼容格式 /v1/images/generations（部分厂商采用）
  const url1 = `${API_BASE}/images/generations`;
  try {
    const res1 = await fetch(url1, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-image',
        prompt,
        n: 1,
        size: '512x512',
        response_format: 'b64_json',
      }),
    });
    if (res1.ok) {
      const data = (await res1.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
      const first = data.data?.[0];
      if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
      if (first?.url) return first.url;
    }
  } catch {
    // 忽略，尝试下一种
  }

  // 尝试 2：常见格式 /v1/image/generate（单数）
  const url2 = `${API_BASE.replace(/\/v1$/, '')}/image/generate`;
  try {
    const res2 = await fetch(url2, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        style: 'anime',
        resolution: '512x512',
        num_images: 1,
      }),
    });
    if (res2.ok) {
      const data = (await res2.json()) as {
        data?: Array<{ url?: string; b64_json?: string }>;
        image_url?: string;
        b64_json?: string;
      };
      if (data.image_url) return data.image_url;
      if (data.b64_json) return `data:image/png;base64,${data.b64_json}`;
      const first = data.data?.[0];
      if (first?.url) return first.url;
      if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
    }
  } catch {
    // 忽略
  }

  return null;
}
