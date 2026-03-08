// 图像生成 API 代理（支持参考图 + 宠物信息 prompt）
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

/** 宠物信息 + 风格 拼成完整描述，用于 prompt */
function buildPetStylePrompt(style, species, breedName, color, features) {
  const petDesc = [species, breedName].filter(Boolean).join(' ');
  const extra = [color, features].filter(Boolean).join(', ');
  const base = extra ? `A cute ${petDesc}, ${extra}.` : `A cute ${petDesc}.`;

  switch (style) {
    case 'ghibli':
      return `${base} Portrait, Studio Ghibli style, hand-drawn anime, pastel colors, big eyes, friendly expression.`;
    case 'emoji':
      return `${base} 3D emoji avatar, colorful, playful, Apple Memoji style, round face.`;
    case 'anime':
      return `${base} Anime style, Japanese manga, large eyes, vibrant colors, kawaii.`;
    case 'simple':
      return `${base} Simple hand-drawn style, naive art, childlike drawing.`;
    default:
      return `${base} Photorealistic, professional photography, studio lighting, cute.`;
  }
}

export default async function handler(req, res) {
  try {
    const { breedName, species, style, color, features, model, referenceImage } = req.body;

    const prompt = buildPetStylePrompt(style, species, breedName, color || '', features || '');

    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing API key' });
    }

    const contentWithImage: ({ text: string } | { image: string })[] = [{ text: prompt }];
    if (referenceImage && typeof referenceImage === 'string' && referenceImage.startsWith('data:image')) {
      contentWithImage.push({ image: referenceImage });
    }

    let data;
    let response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'qwen-image-2.0-pro',
        input: {
          messages: [{ role: 'user', content: contentWithImage }]
        }
      })
    });

    data = await response.json();

    let imageUrl = data.choices?.[0]?.message?.content?.[0]?.image ||
                  data.output?.choices?.[0]?.message?.content?.[0]?.image;

    if (!imageUrl && contentWithImage.length > 1) {
      response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'qwen-image-2.0-pro',
          input: {
            messages: [{ role: 'user', content: [{ text: prompt }] }]
          }
        })
      });
      data = await response.json();
      imageUrl = data.choices?.[0]?.message?.content?.[0]?.image ||
                data.output?.choices?.[0]?.message?.content?.[0]?.image;
    }

    if (imageUrl) {
      return res.status(200).json({ imageUrl });
    }

    return res.status(500).json({ error: '生成失败', details: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
