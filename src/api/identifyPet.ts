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
 * 带超时的 fetch
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 20000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('请求超时，请检查网络后重试');
    }
    throw e;
  }
}

/**
 * 调用本地代理识别宠物图片
 */
export async function identifyPetFromImage(imageUrl: string, model: string = 'qwen2.5-vl-32b-instruct'): Promise<PetBreedResult | null> {
  try {
    const res = await fetchWithTimeout('/api/identify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl, model }),
    }, 25000);

    if (!res.ok) {
      const errText = await res.text();
      console.error('识别 API 错误', res.status, errText);
      throw new Error(`识别失败 (${res.status})，请重试`);
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
    const msg = e instanceof Error ? e.message : '网络错误';
    console.error('识别请求失败:', msg);
    throw new Error(msg); // 抛出错误，让调用方捕获
  }
}
