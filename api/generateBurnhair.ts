// burn.hair 图像生成 API 代理 (DALL-E 3)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  try {
    const { breedName, species, style, color, features, model } = req.body;

    const petDesc = [species, breedName].filter(Boolean).join(' ').trim();
    const appearance = [color, features].filter(Boolean).join('; ').trim();
    const identityAnchor = [
      `Primary subject: one ${petDesc || 'pet'}.`,
      appearance ? `Appearance cues: ${appearance}.` : '',
      'Keep the same pet identity and preserve species, coat color, markings, face structure, ear shape, eye details, and body proportions.',
      'Do not alter key visual traits.',
    ]
      .filter(Boolean)
      .join(' ');
    const quality = 'High detail, clean composition, natural anatomy, no text, no watermark, no logo.';

    // 构建 prompt
    let prompt = '';
    switch (style) {
      case 'ghibli':
        prompt = `${identityAnchor} Please convert this image into an anime-style illustration inspired by the visual aesthetics of Studio Ghibli. Maintain the original composition and key elements, but reimagine them with Ghibli-style features: soft painterly textures, warm and natural color palettes, detailed backgrounds, and expressive character design. Aim for a whimsical and nostalgic atmosphere with magical realism, similar to classic Ghibli films. ${quality}`;
        break;
      case 'emoji':
        prompt = `${identityAnchor} Please convert this image into a premium 3D emoji-style portrait. Maintain the original composition and key identity traits, while reimagining the pet with rounded geometry, glossy materials, smooth soft shadows, bright but balanced colors, and a clean minimal background. Keep the expression friendly, playful, and instantly readable like a polished avatar sticker. ${quality}`;
        break;
      case 'anime':
        prompt = `${identityAnchor} Please convert this image into a high-quality Japanese anime illustration. Maintain the original composition and key features, then apply crisp line art, layered cel-shading with subtle gradients, vibrant cinematic color design, expressive eyes, and detailed fur rendering. The final image should feel like a modern anime key visual while preserving the pet's real identity. ${quality}`;
        break;
      case 'simple':
        prompt = `${identityAnchor} Please convert this image into a minimalist hand-drawn illustration. Maintain the original composition and key identity traits, then simplify forms into clean outlines, soft flat colors, light paper texture, and an uncluttered background. Keep a warm, gentle, storybook-like mood with clear silhouette readability. ${quality}`;
        break;
      default:
        prompt = `${identityAnchor} Please convert this image into a photorealistic cinematic pet portrait. Maintain the original composition and key identity traits, with realistic fur strands, accurate colors and markings, natural anatomy, and subtle facial micro-details. Use an 85mm lens look, shallow depth of field, soft studio lighting, and professional color grading for a premium editorial finish. ${quality}`;
    }

    const apiKey = process.env.VITE_BURNHAIR_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing API key' });
    }

    const response = await fetch('https://cn-test.burn.hair/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'dall-e-3',
        prompt: prompt,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      })
    });

    const data = await response.json();
    
    if (data.data?.[0]?.url) {
      return res.status(200).json({ imageUrl: data.data[0].url });
    }
    
    return res.status(500).json({ error: '生成失败', details: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
