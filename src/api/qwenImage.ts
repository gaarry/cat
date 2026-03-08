/**
 * 图像生成 API (通过 Vercel 代理)
 */

export interface GenerateImageOptions {
  breedName: string;
  species: string;
  style?: string;
  color?: string;
  features?: string;
  model?: string;
  /** 上传的宠物照片 data URL，用于图生图参考 */
  referenceImage?: string;
}

/**
 * 调用本地代理生成图像
 */
export async function generatePetImageQwen(options: GenerateImageOptions): Promise<string | null> {
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        breedName: options.breedName,
        species: options.species,
        style: options.style,
        color: options.color,
        features: options.features,
        model: options.model,
        referenceImage: options.referenceImage,
      }),
    });

    if (!res.ok) {
      console.error('图像生成 API 错误', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    
    if (data.imageUrl) {
      return data.imageUrl;
    }
    
    if (data.error) {
      console.error('图像生成业务错误', data.error);
    }
    
    return null;
  } catch (e) {
    console.error('图像生成请求失败:', e);
    return null;
  }
}
