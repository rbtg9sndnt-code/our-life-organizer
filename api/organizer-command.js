export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { message = '', data = {} } = req.body || {};
    const text = String(message).trim();
    if (!text) return res.status(400).json({ error: 'Message is required' });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });

    const safeData = {
      plans: Array.isArray(data.plans) ? data.plans : [],
      bills: Array.isArray(data.bills) ? data.bills : [],
      pays: Array.isArray(data.pays) ? data.pays : [],
      recipes: Array.isArray(data.recipes) ? data.recipes : [],
      us: Array.isArray(data.us) ? data.us : [],
      folders: Array.isArray(data.folders) ? data.folders : [],
      captures: Array.isArray(data.captures) ? data.captures : [],
      goal: Number(data.goal || 0), billAccount: Number(data.billAccount || 0), safeSpendManual: data.safeSpendManual ?? null
    };
    const today = new Date().toISOString().slice(0, 10);
    const system = `You are the action engine for a personal life organizer. Today is ${today}. Understand natural language commands and return ONLY valid JSON. If the user is asking you to do something, create one or more actions. If they are only giving information that should be saved, use save_capture. Never invent missing dates/times; resolve words like tomorrow using today's date. Use 24-hour time.

Allowed actions:
add_reminder {name,date,time}; delete_reminder {query}; add_bill {name,amount,date,freq}; add_pay {amount,date}; add_note {title,text}; add_recipe {name,link,notes}; save_capture {title,text,category,suggestedDestination,summary};

Return exactly: {"reply":"short confirmation or question","actions":[{"type":"...",...}]}.
If required information is missing, return actions:[] and ask a concise question. Do not say an action happened unless it is represented in actions.

CURRENT ORGANIZER DATA:\n${JSON.stringify(safeData)}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: {'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
      body: JSON.stringify({ model:'gpt-5.4-mini', instructions:system, input:text, max_output_tokens:1200 })
    });
    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({error:result?.error?.message || 'OpenAI request failed'});
    let raw = String(result.output_text || '').trim();
    if (!raw && Array.isArray(result.output)) raw = result.output.flatMap(x=>Array.isArray(x?.content)?x.content:[]).map(x=>x?.text||'').join('').trim();
    let parsed;
    try { parsed=JSON.parse(raw); } catch (_) { const m=raw.match(/\{[\s\S]*\}/); parsed=m?JSON.parse(m[0]):null; }
    if (!parsed || !Array.isArray(parsed.actions)) return res.status(502).json({error:'The AI returned an invalid command. Please try again.'});
    return res.status(200).json({reply:String(parsed.reply||''),actions:parsed.actions});
  } catch (err) { return res.status(500).json({error:err?.message || 'Command failed'}); }
}
