/**
 * MiniMax API：对话 + 图像生成（minimaxi.com 国内站）
 * 文档：https://platform.minimaxi.com/docs
 */

import type { PetProfile } from '../types/pet';
import { personalities } from '../data/personalities';

/** 开发走 Vite 代理，生产走 Vercel rewrites，均用同源 /api 避免 CORS */
const API_BASE = '/api/minimax';
const CHAT_URL = `${API_BASE}/v1/text/chatcompletion_v2`;
const IMAGE_URL = `${API_BASE}/v1/image_generation`;
/** Coding Plan 支持：MiniMax-M2.5 / MiniMax-M2.5-highspeed / MiniMax-M2.1 / MiniMax-M2 */
const CHAT_MODEL = 'MiniMax-M2.5';
const IMAGE_MODEL = 'image-01';

function getApiKey(): string {
  return import.meta.env.VITE_MINIMAX_API_KEY ?? '';
}

function buildSystemPrompt(pet: PetProfile): string {
  const personalityLabels = pet.personalityIds
    .map((id) => personalities.find((p) => p.id === id)?.label)
    .filter(Boolean) as string[];
  const traits = personalityLabels.length ? personalityLabels.join('、') : '可爱';
  return `你是用户养的宠物「${pet.name || pet.breedName}」，品种是${pet.breedName}。你的性格是：${traits}。
请用第一人称（我）回复，语气要符合宠物身份和上述性格，简短可爱，一两句话为主，可以适当用拟声词（如喵、汪、啾等）。不要以「作为AI」或「作为语言模型」自称，你就是这只宠物。`;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** MiniMax 对话 */
export async function chatWithMiniMax(
  pet: PetProfile,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未配置 MiniMax API 密钥，请在 .env.local 中设置 VITE_MINIMAX_API_KEY');

  const messages: Array<{ role: string; content: string; name?: string }> = [
    { role: 'system', content: buildSystemPrompt(pet), name: 'System' },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content, name: m.role === 'user' ? 'User' : 'Assistant' })),
    { role: 'user', content: userMessage, name: 'User' },
  ];

  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      max_completion_tokens: 256,
      temperature: 0.8,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MiniMax API 错误 ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    base_resp?: { status_code?: number; status_msg?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
    throw new Error(`MiniMax 业务错误 ${data.base_resp.status_code}: ${data.base_resp.status_msg ?? ''}`);
  }
  const content = data.choices?.[0]?.message?.content?.trim();
  if (content == null || content === '') throw new Error('MiniMax 返回内容为空');
  return content;
}

/** 宫崎骏风格宠物图像提示词 */
function buildImagePrompt(breedName: string, species: string): string {
  return (
    `A cute ${species} (${breedName}), portrait, head and shoulders. ` +
    `Studio Ghibli art style by Hayao Miyazaki: hand-drawn 2D anime, soft watercolor texture, pastel palette, warm dreamy lighting. ` +
    `Big expressive eyes, gentle friendly expression, simple rounded shapes. ` +
    `Illustrated character sheet style, no photo-realism, whimsical and heartwarming. ` +
    `Clean background, soft gradient or subtle nature.`
  );
}

export interface GenerateImageOptions {
  breedName: string;
  species: string;
}

/** MiniMax 文生图，返回 data URL 或 null */
export async function generatePetImageMiniMax(options: GenerateImageOptions): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const prompt = buildImagePrompt(options.breedName, options.species);

  const res = await fetch(IMAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      aspect_ratio: '1:1',
      response_format: 'base64',
      n: 1,
    }),
  });

  if (!res.ok) {
    console.error('MiniMax 图像 API HTTP 错误', res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as {
    base_resp?: { status_code?: number; status_msg?: string };
    data?: { image_base64?: string[]; image_urls?: string[] };
  };
  if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
    console.error('MiniMax 图像业务错误', data.base_resp);
    return null;
  }
  const b64 = data.data?.image_base64?.[0];
  if (b64) return `data:image/jpeg;base64,${b64}`;
  const url = data.data?.image_urls?.[0];
  if (url) return url;
  return null;
}
