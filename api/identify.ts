// 图像识别 API 代理
export default async function handler(req) {
  const { imageUrl, model } = req.body;
  const apiKey = process.env.QWEN_API_KEY;
  
  const prompt = `请仔细分析这张宠物图片，识别出：1.宠物种类(cat/dog/rabbit/parrot/pig) 2.具体品种(用英文) 3.毛色花纹 4.显著外观特征。请以JSON格式返回：{"species":"cat","breed":"British Shorthair","color":"blue","features":"圆脸大眼睛"}`;

  try {
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
    
    if (data.choices && data.choices[0]?.message?.content) {
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          statusCode: 200,
          body: JSON.stringify(parsed)
        };
      }
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '识别失败', details: data })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
