/**
 * 图片生成 API（burn.hair，OpenAI 兼容 / DALL-E 3）
 * Base URL: https://cn-test.burn.hair/
 */

/** 开发走 Vite 代理，生产走 Vercel rewrites */
const API_BASE = '/api/burnhair';
const IMAGE_URL = `${API_BASE}/v1/images/generations`;
const MODEL = 'dall-e-3';

function getApiKey(): string {
  return import.meta.env.VITE_BURNHAIR_API_KEY ?? '';
}

type ImageStyle = 'ghibli' | 'emoji' | 'realistic' | 'anime' | 'simple';

function buildPetImagePrompt(breedName: string, species: string, style: ImageStyle): string {
  switch (style) {
    case 'ghibli':
      return (
        `A cute ${species} (${breedName}), portrait, head and shoulders. ` +
        `Studio Ghibli art style by Hayao Miyazaki: hand-drawn 2D anime, soft watercolor texture, pastel palette, warm dreamy lighting. ` +
        `Big expressive eyes, gentle friendly expression, simple rounded shapes. ` +
        `Illustrated character sheet style, no photo-realism, whimsical and heartwarming. ` +
        `Clean background, soft gradient or subtle nature.`
      );
    case 'emoji':
      return (
        `A cute ${species} (${breedName}) avatar, emoji style, ` +
        `3D rendered character, colorful, flat design, minimalist, bold colors, ` +
        `playful and cute, Apple Memoji aesthetic, big expressive eyes, ` +
        `friendly smile, rounded shapes, white background, ` +
        `digital avatar icon style, vibrant cheerful colors, high quality.`
      );
    case 'realistic':
      return (
        `A photorealistic ${species} (${breedName}), high quality professional photography, ` +
        `studio lighting, shallow depth of field, extremely detailed fur texture, ` +
        `natural realistic colors, looking directly at camera, friendly expression, ` +
        `crisp clear eyes, clean solid background, ` +
        `photo quality, realistic, life-like, 8K professional portrait, ` +
        `cute and endearing, round face, adorable.`
      );
    case 'anime':
      return (
        `A cute ${species} (${breedName}), anime style, Japanese manga, ` +
        `large expressive eyes with highlights, intricate details, vibrant colors, ` +
        `clean linework, anime character portrait, shiny hair, ` +
        `colorful background, kawaii aesthetic, polished digital art, ` +
        `head and shoulders composition, cheerful expression.`
      );
    case 'simple':
      return (
        `A cute ${species} (${breedName}), simple hand-drawn style, ` +
        `naive art, primitive painting, childlike drawing, warm and friendly, ` +
        `soft edges, gentle colors, innocent expression, ` +
        `paper texture background, folk art style, ` +
        `whimsical and endearing, simple geometric shapes.`
      );
    default:
      return (
        `A cute ${species} (${breedName}), ${style} style, ` +
        `high quality digital art, portrait, head and shoulders.`
      );
  }
}

export interface GenerateImageOptions {
  breedName: string;
  species: string;
  style?: ImageStyle;
}

/**
 * 调用 DALL-E 3 生成宠物形象，返回 data URL 或 null
 */
export async function generatePetImageBurnHair(options: GenerateImageOptions): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const style: ImageStyle = options.style || 'realistic';
  const prompt = buildPetImagePrompt(options.breedName, options.species, style);

  const res = await fetch(IMAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
      quality: 'standard',
    }),
  });

  if (!res.ok) {
    console.error('BurnHair 图像 API HTTP 错误', res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: { message?: string };
  };
  if (data.error) {
    console.error('BurnHair 图像业务错误', data.error);
    return null;
  }
  const first = data.data?.[0];
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (first?.url) return first.url;
  return null;
}
