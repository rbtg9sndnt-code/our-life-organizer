export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message = '', data = {} } = req.body || {};
    if (!String(message).trim()) return res.status(400).json({ error: 'Message is required' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });

    const safeData = {
      plans: Array.isArray(data.plans) ? data.plans : [],
      bills: Array.isArray(data.bills) ? data.bills : [],
      pays: Array.isArray(data.pays) ? data.pays : [],
      recipes: Array.isArray(data.recipes) ? data.recipes : [],
      us: Array.isArray(data.us) ? data.us : [],
      bike: Array.isArray(data.bike) ? data.bike : [],
      folders: Array.isArray(data.folders) ? data.folders : [],
      captures: Array.isArray(data.captures) ? data.captures : [],
      goal: Number(data.goal || 0),
      billAccount: Number(data.billAccount || 0),
      safeSpendManual: data.safeSpendManual ?? null
    };

    const system = `You are the AI assistant inside the user's personal life-organizer app. You have access to the organizer data below and should use it when answering questions. Help with planning, reminders, notes, ideas, recipes, shopping, relationships, dirtbike organization, folders, and budgeting. Be practical and concise. Never claim you changed or saved data unless the app explicitly performs that action. If the user asks what they can afford, calculate from the supplied numbers and clearly state assumptions. If information is missing, ask for the minimum needed detail.

ORGANIZER DATA:
${JSON.stringify(safeData)}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        instructions: system,
        input: String(message).trim(),
        max_output_tokens: 2000
      })
    });

    const result = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: result?.error?.message || 'OpenAI request failed'
      });
    }

    // Responses API normally provides output_text. Keep a fallback so the
    // app still works if the provider returns the text only inside output[].
    let reply = String(result.output_text || '').trim();
    if (!reply && Array.isArray(result.output)) {
      const parts = [];
      for (const item of result.output) {
        if (!Array.isArray(item?.content)) continue;
        for (const content of item.content) {
          if (typeof content?.text === 'string') parts.push(content.text);
        }
      }
      reply = parts.join('\n').trim();
    }

    if (!reply) {
      return res.status(502).json({
        error: 'The AI returned no visible answer. Please try again.'
      });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'AI chat failed' });
  }
}
