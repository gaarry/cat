// burn.hair 图像识别 API 代理 (GPT-4o Vision)
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
    
    const apiKey = process.env.VITE_BURNHAIR_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing API key' });
    }
    
    const prompt = `你是宠物视觉识别助手。请基于图片中“可见信息”做结构化识别，并严格输出 JSON（不要 markdown、不要解释、不要多余文本）。

输出要求（全部中文）：
1. species：物种（猫/狗/鹦鹉/兔子/猪等）
2. breed：品种中文名（如英国短毛猫、金毛寻回犬、虎皮鹦鹉）；不确定时给最可能品种，不要编造稀有品种
3. color：毛色/羽色/肤色与花纹细节，至少包含 4 个维度并合并成一句：
   - 主色
   - 次色
   - 花纹/斑块/条纹位置（如额头、背部、四肢、尾巴、胸口）
   - 鼻子/耳缘/爪垫/眼周等局部颜色特征
4. features：外貌特征，至少 6 个要点并合并成一句，优先包含：
   - 脸型与口鼻部
   - 眼睛形状/颜色/神态
   - 耳朵形状与位置
   - 体型比例（瘦长/敦实/短腿等）
   - 毛发长度与质感（短毛/长毛/蓬松/顺滑）
   - 独特标记（泪痕、白袜、项圈痕迹、尾尖颜色等）
5. confidence：0~1 的小数，表示整体判断置信度

约束：
- 只能根据图中可见信息判断，不要脑补看不见的内容
- 若遮挡严重，在 features 中点明“部分区域被遮挡”
- 保持简洁但信息密度高

返回格式（必须完全是 JSON 对象）：
{"species":"猫","breed":"英国短毛猫","color":"主色蓝灰，胸口与四爪有白色，背部毛色更深，鼻周偏深灰，眼周有浅色过渡","features":"圆脸，嘴套饱满，眼睛大而圆偏金色，耳朵小且耳尖圆，短毛且质地厚实，体型敦实，尾巴中等长度且尾尖略深色","confidence":0.89}`;

    const response = await fetch('https://cn-test.burn.hair/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
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
