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
    
    // 构建 prompt
    let prompt = '';
    switch (style) {
      case 'ghibli':
        prompt = `A cute ${species} (${breedName}), portrait, Studio Ghibli style, hand-drawn anime, pastel colors, big eyes, friendly expression.`;
        break;
      case 'emoji':
        prompt = `A cute ${species} (${breedName}), 3D emoji avatar, colorful, playful, Apple Memoji style, round face.`;
        break;
      case 'anime':
        prompt = `A cute ${species} (${breedName}), anime style, Japanese manga, large eyes, vibrant colors, kawaii.`;
        break;
      case 'simple':
        prompt = `A cute ${species} (${breedName}), simple hand-drawn style, naive art, childlike drawing.`;
        break;
      default:
        prompt = `A photorealistic ${species} (${breedName}), professional photography, studio lighting, cute.`;
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
