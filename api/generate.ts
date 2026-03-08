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
  const petDesc = [species, breedName].filter(Boolean).join(' ').trim();
  const appearance = [color, features].filter(Boolean).join('; ').trim();
  const identityAnchor = [
    `Primary subject: one ${petDesc || 'pet'}.`,
    appearance ? `Appearance cues from analysis: ${appearance}.` : '',
    'Use the uploaded reference image as the identity anchor.',
    'Keep species, face shape, ear shape, eye color, nose color, coat color and markings, body proportions, and distinctive marks consistent with the reference.',
    'Do not replace the pet with a different animal and do not change key markings.',
  ]
    .filter(Boolean)
    .join(' ');

  const quality = 'High detail, clean composition, natural anatomy, soft cinematic lighting, single subject, centered portrait, no text, no watermark, no logo.';

  switch (style) {
    case 'ghibli':
      return `${identityAnchor} Please convert this image into an anime-style illustration inspired by the visual aesthetics of Studio Ghibli. Maintain the original composition and key elements, but reimagine them with Ghibli-style features: soft painterly textures, warm and natural color palettes, detailed backgrounds, and expressive character design. Aim for a whimsical and nostalgic atmosphere with magical realism, similar to classic Ghibli films. ${quality}`;
    case 'emoji':
      return `${identityAnchor} Please convert this image into a premium 3D emoji-style portrait. Maintain the original composition and key identity traits, while reimagining the pet with rounded geometry, glossy materials, smooth soft shadows, bright but balanced colors, and a clean minimal background. Keep the expression friendly, playful, and instantly readable like a polished avatar sticker. ${quality}`;
    case 'anime':
      return `${identityAnchor} Please convert this image into a high-quality Japanese anime illustration. Maintain the original composition and key features, then apply crisp line art, layered cel-shading with subtle gradients, vibrant cinematic color design, expressive eyes, and detailed fur rendering. The final image should feel like a modern anime key visual while preserving the pet's real identity. ${quality}`;
    case 'simple':
      return `${identityAnchor} Please convert this image into a minimalist hand-drawn illustration. Maintain the original composition and key identity traits, then simplify forms into clean outlines, soft flat colors, light paper texture, and an uncluttered background. Keep a warm, gentle, storybook-like mood with clear silhouette readability. ${quality}`;
    default:
      return `${identityAnchor} Please convert this image into a photorealistic cinematic pet portrait. Maintain the original composition and key identity traits, with realistic fur strands, accurate colors and markings, natural anatomy, and subtle facial micro-details. Use an 85mm lens look, shallow depth of field, soft studio lighting, and professional color grading for a premium editorial finish. ${quality}`;
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
