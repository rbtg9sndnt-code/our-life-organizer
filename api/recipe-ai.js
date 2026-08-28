export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { image, text = '' } = req.body || {};
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'A recipe screenshot is required.' });
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });

    const extractPrompt = `Read this recipe screenshot carefully. Extract only information that is visible or strongly supported by the screenshot. Return ONLY valid JSON with exactly these keys:
name (string), ingredients (array of strings), instructions (string), sourceNote (string), prepTime (string), totalTime (string), difficulty (string), servings (string).
Do not invent missing ingredients or instructions. If a field is not visible, use an empty string. If this is not a recipe, use name "Unrecognized recipe", empty ingredients/instructions, and briefly explain in sourceNote. User note: ${String(text).slice(0, 2000)}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5.6-luna',
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: extractPrompt },
            { type: 'input_image', image_url: image, detail: 'high' }
          ]
        ],
        max_output_tokens: 2200
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'OpenAI request failed' });

    const raw = data.output_text || '';
    let recipe;
    try { recipe = JSON.parse(raw); } catch (_) {
      const match = raw.match(/\{[\s\S]*\}/);
      recipe = match ? JSON.parse(match[0]) : null;
    }
    if (!recipe) return res.status(502).json({ error: 'AI returned an unreadable recipe.' });

    recipe.name = String(recipe.name || 'Unrecognized recipe');
    recipe.ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.map(String) : [];
    recipe.instructions = String(recipe.instructions || '');
    recipe.sourceNote = String(recipe.sourceNote || '');
    recipe.prepTime = String(recipe.prepTime || '');
    recipe.totalTime = String(recipe.totalTime || '');
    recipe.difficulty = String(recipe.difficulty || '');
    recipe.servings = String(recipe.servings || '');

    // Generate a clean recipe thumbnail rather than using the original screenshot.
    // If image generation is unavailable, the recipe still saves normally.
    let thumbnail = '';
    try {
      const imagePrompt = `Create a clean, appetizing food photograph for a recipe card. Dish: ${recipe.name}. Ingredients: ${recipe.ingredients.slice(0, 10).join(', ')}. Show only the finished food on a simple attractive plate or serving dish, realistic food photography, natural lighting, no text, no labels, no people, square composition.`;
      const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-image-2',
          prompt: imagePrompt,
          size: '1024x1024',
          quality: 'low',
          output_format: 'jpeg',
          output_compression: 65,
          n: 1
        })
      });
      const imageData = await imageResponse.json();
      if (imageResponse.ok) {
        const item = imageData?.data?.[0];
        if (item?.b64_json) thumbnail = `data:image/jpeg;base64,${item.b64_json}`;
        else if (item?.url) thumbnail = item.url;
      }
    } catch (_) {
      thumbnail = '';
    }

    return res.status(200).json({ ...recipe, thumbnail });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Recipe AI failed' });
  }
}
