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
    
    const prompt = `请仔细观察这张宠物照片，识别并返回 JSON，全部使用中文。

要求：
1. species：物种，中文即可，如：猫、狗、鹦鹉、兔子、猪
2. breed：品种中文名，如：英国短毛猫、金毛寻回犬、虎皮鹦鹉；若不确定可写最常见品种
3. color：毛色/肤色的详细中文描述，至少 2～3 条。例如：蓝灰色、带白色胸毛、四蹄白色、眼圈与鼻周深色、虎斑纹路 等，尽量具体
4. features：外貌特征的详细中文描述，至少 3～5 条。例如：圆脸、大而圆的眼睛、短毛、体型敦实、耳朵较小、嘴套饱满、表情温和 等，越细致越好

直接返回一个 JSON 对象，不要其他文字，格式示例：
{"species":"猫","breed":"英国短毛猫","color":"蓝灰色，胸前与四爪有白色，鼻周深色","features":"圆脸，大而圆的眼睛，短毛，体型敦实，耳朵小且圆，嘴套饱满"}`;

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
