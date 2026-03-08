/**
 * 宠物品种识别 API (通过代理)
 */

export interface PetBreedResult {
  species: string;
  breed: string;
  color: string;
  features: string;
  confidence: number;
}

/**
 * 调用本地代理识别宠物图片
 */
export async function identifyPetFromImage(imageUrl: string, model: string = 'qwen2.5-vl-32b-instruct'): Promise<PetBreedResult | null> {
  try {
    const res = await fetch('/api/identify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl, model }),
    });

    if (!res.ok) {
      console.error('识别 API 错误', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    
    return {
      species: data.species || 'unknown',
      breed: data.breed || 'unknown',
      color: data.color || '',
      features: data.features || '',
      confidence: data.confidence || 0.5,
    };
  } catch (e) {
    console.error('识别请求失败:', e);
    return null;
  }
}
