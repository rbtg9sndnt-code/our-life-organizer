export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { image, text = '' } = req.body || {};
    if (!image) return res.status(400).json({ error: 'No image supplied' });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: `Read this recipe screenshot. Return ONLY valid JSON with keys name, ingredients, instructions, sourceNote. ingredients must be an array of strings. If the image is not a recipe, return name as "Unrecognized recipe" and empty arrays/strings. User notes: ${text}` },
            { type: 'input_image', image_url: image }
          ]
        }],
        max_output_tokens: 1200
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'OpenAI request failed' });
    const raw = data.output_text || '';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (_) {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { name: 'Unrecognized recipe', ingredients: [], instructions: '', sourceNote: raw };
    }
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Recipe AI failed' });
  }
}
