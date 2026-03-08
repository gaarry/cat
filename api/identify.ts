// 图像识别 API 代理
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  try {
    const { imageUrl, model } = req.body;
    
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing API key' });
    }
    
    const prompt = '请识别这只宠物，返回JSON格式：{"species":"cat","breed":"British Shorthair","color":"blue","features":"圆脸"}';

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'qwen2.5-vl-32b-instruct',
        messages: [
          { 
            role: 'user', 
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: prompt }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.status(200).json(parsed);
      }
    }
    
    return res.status(500).json({ error: '识别失败', details: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
