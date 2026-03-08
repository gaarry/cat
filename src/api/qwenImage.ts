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
  referenceImage?: string;
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
 * 调用本地代理生成图像
 */
export async function generatePetImageQwen(options: GenerateImageOptions): Promise<string | null> {
  try {
    const res = await fetchWithTimeout('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    }, 60000); // 生成图片需要更长时间

    if (!res.ok) {
      const errText = await res.text();
      console.error('图像生成 API 错误', res.status, errText);
      throw new Error(`生成失败 (${res.status})，请重试`);
    }

    const data = await res.json();
    
    if (data.imageUrl) {
      return data.imageUrl;
    }
    
    if (data.error) {
      console.error('图像生成业务错误', data.error);
      throw new Error(data.error || '生成失败');
    }
    
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '网络错误';
    console.error('图像生成请求失败:', msg);
    throw new Error(msg); // 抛出错误，让调用方捕获
  }
}
