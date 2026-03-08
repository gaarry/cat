import type { PetProfile } from '../types/pet';
import { personalities } from '../data/personalities';

// 官方文档示例为 https://api.deepseek.com/chat/completions（无 /v1）
// 开发时走 Vite 代理避免 CORS
const API_BASE = import.meta.env.DEV ? '/api/deepseek' : 'https://api.deepseek.com';
const CHAT_URL = `${API_BASE}/chat/completions`;
const MODEL = 'deepseek-chat';

function getApiKey(): string {
  return import.meta.env.VITE_DEEPSEEK_API_KEY ?? '';
}

function buildSystemPrompt(pet: PetProfile): string {
  const personalityLabels = pet.personalityIds
    .map((id) => personalities.find((p) => p.id === id)?.label)
    .filter(Boolean) as string[];
  const traits = personalityLabels.length ? personalityLabels.join('、') : '可爱';
  return `你是用户养的宠物「${pet.name || pet.breedName}」，品种是${pet.breedName}。你的性格是：${traits}。
请用第一人称（我）回复，语气要符合宠物身份和上述性格，简短可爱，一两句话为主，可以适当用拟声词（如喵、汪、啾等）。不要以「作为AI」或「作为语言模型」自称，你就是这只宠物。`;
}

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatWithDeepSeek(
  pet: PetProfile,
  history: ChatCompletionMessage[],
  userMessage: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('未配置 DeepSeek API 密钥，请在 .env.local 中设置 VITE_DEEPSEEK_API_KEY');
  }

  const systemPrompt = buildSystemPrompt(pet);
  const messages: ChatCompletionMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10),
    { role: 'user', content: userMessage },
  ];

  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 256,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API 错误 ${res.status}: ${err.slice(0, 200)}`);
  }

  let data: { choices?: Array<{ message?: { content?: string | null } }> };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new Error('DeepSeek 返回非 JSON，请检查网络或代理');
  }
  const content = data.choices?.[0]?.message?.content?.trim();
  if (content == null || content === '') throw new Error('DeepSeek 返回内容为空');
  return content;
}
