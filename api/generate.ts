// 图像生成 API 代理
export default async function handler(req) {
  const { breedName, species, style, color, features, model } = req.body;
  
  // 构建 prompt
  let prompt = '';
  switch (style) {
    case 'ghibli':
      prompt = `A cute ${species} (${breedName}), portrait, head and shoulders. Studio Ghibli art style by Hayao Miyazaki: hand-drawn 2D anime, soft watercolor texture, pastel palette, warm dreamy lighting. Big expressive eyes, gentle friendly expression, simple rounded shapes. Illustrated character sheet style, no photo-realism, whimsical and heartwarming. Clean background.`;
      break;
    case 'emoji':
      prompt = `A cute ${species} (${breedName}) avatar, emoji style, 3D rendered character, colorful, flat design, minimalist, bold colors, playful and cute, Apple Memoji aesthetic, big expressive eyes, friendly smile, rounded shapes, white background.`;
      break;
    case 'anime':
      prompt = `A cute ${species} (${breedName}), anime style, Japanese manga, large expressive eyes with highlights, intricate details, vibrant colors, clean linework, anime character portrait, kawaii aesthetic.`;
      break;
    case 'simple':
      prompt = `A cute ${species} (${breedName}), simple hand-drawn style, naive art, primitive painting, childlike drawing, warm and friendly, soft edges, gentle colors, innocent expression.`;
      break;
    default: // realistic
      prompt = `A photorealistic ${species} (${breedName}), high quality professional photography, studio lighting, shallow depth of field, extremely detailed fur texture, natural realistic colors, looking directly at camera, friendly expression, crisp clear eyes, clean solid background, photo quality.`;
  }
  
  if (color || features) {
    prompt = `A ${species} (${breedName})${color ? ` with ${color}` : ''}${features ? `, ${features}` : ''}, ` + prompt;
  }

  const apiKey = process.env.QWEN_API_KEY;
  
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'qwen-image-2.0-pro',
        input: {
          messages: [
            {
              role: 'user',
              content: [{ text: prompt }]
            }
          ]
        }
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content?.[0]?.image) {
      return {
        statusCode: 200,
        body: JSON.stringify({ imageUrl: data.choices[0].message.content[0].image })
      };
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '生成失败', details: data })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
