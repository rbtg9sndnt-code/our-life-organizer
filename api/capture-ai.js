export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { image = '', text = '' } = req.body || {};
    if (!image && !text) return res.status(400).json({ error: 'No capture supplied' });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });

    const content = [{
      type: 'input_text',
      text: `You are the general-purpose AI inbox for a life-organizer app. Understand ANY capture the user throws at you: screenshots, photos, products, shopping items, recipes, social-media posts, messages, documents, receipts, places, travel ideas, tasks, reminders, notes, memes, links, or anything else. Never reject an image just because it is not a recipe. If you are unsure, classify it as "other" and still return a useful title and summary.

Return ONLY valid JSON with exactly these keys:
{
  "title": "short useful title",
  "category": "recipe|product|shopping|idea|note|task|event|travel|document|message|other",
  "summary": "one or two sentence explanation of what this capture is",
  "extractedText": "important visible text, if any",
  "suggestedDestination": "Notes & Ideas|Plan|Money|Recipes|Folders|Inbox",
  "confidence": "high|medium|low"
}

The user's accompanying note is: ${text || '(none)'}`
    }];
    if (image) content.push({ type: 'input_image', image_url: image });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        input: [{ role: 'user', content }],
        max_output_tokens: 900
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'OpenAI request failed' });
    const raw = data.output_text || '';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }
    if (!parsed || typeof parsed !== 'object') {
      parsed = {
        title: text ? text.slice(0, 80) : 'Unsorted capture',
        category: 'other',
        summary: 'AI returned an unstructured result, but the capture can still be saved.',
        extractedText: '',
        suggestedDestination: 'Inbox',
        confidence: 'low'
      };
    }
    return res.status(200).json({
      title: String(parsed.title || 'Unsorted capture'),
      category: String(parsed.category || 'other'),
      summary: String(parsed.summary || 'Saved as a general capture.'),
      extractedText: String(parsed.extractedText || ''),
      suggestedDestination: String(parsed.suggestedDestination || 'Inbox'),
      confidence: String(parsed.confidence || 'low')
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Capture AI failed' });
  }
}
