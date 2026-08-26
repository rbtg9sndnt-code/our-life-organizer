export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { image, mode = 'recipe' } = req.body || {};
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'A recipe image is required.' });
    }
    const prompt = mode === 'recipe'
      ? 'Read this recipe screenshot carefully. Return ONLY valid JSON with exactly these keys: name (string), ingredients (array of strings), notes (string). Do not invent ingredients that are not visible. If the image is not a recipe, set name to "Unrecognized recipe" and explain briefly in notes.'
      : 'Describe the contents of this image briefly.';

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: image, detail: 'high' }
          ]
        ]
      })
    });

    const json = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: json?.error?.message || 'OpenAI request failed.' });
    const text = json.output_text || '';
    let parsed;
    try { parsed = JSON.parse(text); } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    if (!parsed) return res.status(502).json({ error: 'AI returned an unreadable response.' });
    parsed.name = String(parsed.name || 'Unrecognized recipe');
    parsed.ingredients = Array.isArray(parsed.ingredients) ? parsed.ingredients.map(String) : [];
    parsed.notes = String(parsed.notes || '');
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'AI connection failed.' });
  }
}