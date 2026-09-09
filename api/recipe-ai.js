export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, text = '' } = req.body || {};
    if (!image || typeof image !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(image)) {
      return res.status(400).json({ error: 'A recipe screenshot is required.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });

    const extractPrompt = `Read this recipe screenshot carefully and transcribe the recipe information that is actually visible. The screenshot may contain social-media UI, so ignore buttons, usernames, likes, comments, and other non-recipe text. Return the recipe as structured data. Do not invent missing information. If a field is not visible, return an empty string or empty array.\n\nUser note/source link: ${String(text).slice(0, 3000)}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        instructions: 'You are a careful recipe OCR and extraction assistant. Follow the requested schema exactly. Never add commentary outside the structured response.',
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: extractPrompt },
            { type: 'input_image', image_url: image }
          ]
        }],
        text: {
          format: {
            type: 'json_schema',
            name: 'recipe',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                ingredients: { type: 'array', items: { type: 'string' } },
                instructions: { type: 'string' },
                sourceNote: { type: 'string' },
                prepTime: { type: 'string' },
                totalTime: { type: 'string' },
                difficulty: { type: 'string' },
                servings: { type: 'string' }
              },
              required: ['name', 'ingredients', 'instructions', 'sourceNote', 'prepTime', 'totalTime', 'difficulty', 'servings']
            }
          }
        },
        max_output_tokens: 2200
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'OpenAI request failed'
      });
    }

    // Responses normally exposes the structured JSON through output_text.
    // Keep a fallback for alternate Responses API output shapes so a valid recipe
    // does not get rejected just because the SDK/API representation changes.
    const raw = String(data.output_text || '').trim();
    let recipe = null;
    if (raw) {
      try {
        recipe = JSON.parse(raw);
      } catch (_) {
        const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        const candidate = fenced ? fenced[1].trim() : raw;
        try { recipe = JSON.parse(candidate); } catch (_) {}
      }
    }

    if (!recipe && Array.isArray(data.output)) {
      const chunks = [];
      for (const item of data.output) {
        for (const part of (item?.content || [])) {
          if (typeof part?.text === 'string') chunks.push(part.text);
          if (typeof part?.json === 'object' && part.json) recipe = part.json;
        }
      }
      if (!recipe && chunks.length) {
        try { recipe = JSON.parse(chunks.join('').trim()); } catch (_) {}
      }
    }

    if (!recipe || typeof recipe !== 'object') {
      return res.status(502).json({ error: 'AI returned an unreadable recipe. Please try the screenshot again.' });
    }

    recipe.name = String(recipe.name || 'Unrecognized recipe');
    recipe.ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.map(String) : [];
    recipe.instructions = String(recipe.instructions || '');
    recipe.sourceNote = String(recipe.sourceNote || '');
    recipe.prepTime = String(recipe.prepTime || '');
    recipe.totalTime = String(recipe.totalTime || '');
    recipe.difficulty = String(recipe.difficulty || '');
    recipe.servings = String(recipe.servings || '');

    // Thumbnail generation is optional. A failure here must never prevent saving the recipe.
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
    } catch (_) {}

    return res.status(200).json({ ...recipe, thumbnail });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Recipe AI failed' });
  }
}
