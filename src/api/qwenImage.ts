/**
 * 图像生成 API (Qwen Image via 阿里云)
 */

const API_BASE = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

function getApiKey(): string {
  return import.meta.env.VITE_QWEN_API_KEY ?? '';
}

type ImageStyle = 'ghibli' | 'emoji' | 'realistic' | 'anime' | 'simple';

function buildPetImagePrompt(breedName: string, species: string, style: ImageStyle, color?: string, features?: string): string {
  const baseDesc = color || features ? `${color || ''} ${features || ''}`.trim() : '';
  
  switch (style) {
    case 'ghibli':
      return (
        `A cute ${species} (${breedName})${baseDesc ? `, ${baseDesc}` : ''}, portrait, head and shoulders. ` +
        `Studio Ghibli art style by Hayao Miyazaki: hand-drawn 2D anime, soft watercolor texture, pastel palette, warm dreamy lighting. ` +
        `Big expressive eyes, gentle friendly expression, simple rounded shapes. ` +
        `Illustrated character sheet style, no photo-realism, whimsical and heartwarming. ` +
        `Clean background, soft gradient or subtle nature.`
      );
    case 'emoji':
      return (
        `A cute ${species} (${breedName})${baseDesc ? `, ${baseDesc}` : ''} avatar, emoji style, ` +
        `3D rendered character, colorful, flat design, minimalist, bold colors, ` +
        `playful and cute, Apple Memoji aesthetic, big expressive eyes, ` +
        `friendly smile, rounded shapes, white background, ` +
        `digital avatar icon style, vibrant cheerful colors, high quality.`
      );
    case 'realistic':
      return (
        `A photorealistic ${species} (${breedName})${baseDesc ? `, ${baseDesc}` : ''}, high quality professional photography, ` +
        `studio lighting, shallow depth of field, extremely detailed fur texture, ` +
        `natural realistic colors, looking directly at camera, friendly expression, ` +
        `crisp clear eyes, clean solid background, ` +
        `photo quality, realistic, life-like, 8K professional portrait, ` +
        `cute and endearing, round face, adorable.`
      );
    case 'anime':
      return (
        `A cute ${species} (${breedName})${baseDesc ? `, ${baseDesc}` : ''}, anime style, Japanese manga, ` +
        `large expressive eyes with highlights, intricate details, vibrant colors, ` +
        `clean linework, anime character portrait, shiny hair, ` +
        `colorful background, kawaii aesthetic, polished digital art, ` +
        `head and shoulders composition, cheerful expression.`
      );
    case 'simple':
      return (
        `A cute ${species} (${breedName})${baseDesc ? `, ${baseDesc}` : ''}, simple hand-drawn style, ` +
        `naive art, primitive painting, childlike drawing, warm and friendly, ` +
        `soft edges, gentle colors, innocent expression, ` +
        `paper texture background, folk art style, ` +
        `whimsical and endearing, simple geometric shapes.`
      );
    default:
      return (
        `A cute ${species} (${breedName})${baseDesc ? `, ${baseDesc}` : ''}, ${style} style, ` +
        `high quality digital art, portrait, head and shoulders.`
      );
  }
}

export interface GenerateImageOptions {
  breedName: string;
  species: string;
  style?: ImageStyle;
  color?: string;
  features?: string;
  model?: string;
}

/**
 * 调用 Qwen Image 生成宠物形象，返回图片 URL
 */
export async function generatePetImageQwen(options: GenerateImageOptions): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('缺少 Qwen API Key');
    return null;
  }

  const style: ImageStyle = options.style || 'realistic';
  const model = options.model || 'qwen-image-2.0-pro';
  const prompt = buildPetImagePrompt(options.breedName, options.species, style, options.color, options.features);

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { text: prompt }
            ]
          }
        ]
      }
    }),
  });

  if (!res.ok) {
    console.error('Qwen Image API HTTP 错误', res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: Array<{ image?: string }>;
      };
    }>;
    error?: { message?: string };
  };

  if (data.error) {
    console.error('Qwen Image 业务错误', data.error);
    return null;
  }

  const imageUrl = data.choices?.[0]?.message?.content?.[0]?.image;
  return imageUrl ?? null;
}
