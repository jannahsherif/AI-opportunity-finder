export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, filters, deadline } = req.body;

  // ── Inject real today's date so the model never hallucinates the year ──
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const activeFilters = Object.entries(filters || {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ');

  const systemPrompt = `You are an AI opportunity finder. Today's date is ${todayStr}. Use this date for all deadline calculations.

Find REAL, currently open opportunities (hackathons, competitions, grants, bounties) that exist on the internet RIGHT NOW.

Active filters: ${activeFilters || 'none'}. Deadline window: ${deadline || 'within 1 month'}.

CRITICAL RULES:
1. Only return opportunities with REAL, working URLs that actually exist today. Do NOT invent or guess URLs.
2. Prefer well-known platforms: devpost.com, hackerearth.com, mlcontests.com, kaggle.com, ctftime.org, replit.com/bounties, gitcoin.co, unstop.com, challengerocket.com, etc.
3. Calculate daysLeft from today (${todayStr}) to the actual deadline date. Be accurate.
4. If you are not certain an opportunity is currently open, do not include it.
5. Sort by soonest deadline first.
6. Max 6 results.

Return ONLY valid JSON, no markdown, no extra text:
{"message":"brief friendly 1-sentence note","results":[{"title":"Exact opportunity name","description":"1-2 sentences: what it is, prizes, who it is for","deadline":"Closes: [Month Day, Year] · [X] days left","daysLeft":"[number]","url":"https://real-working-url.com","tags":["tag1","tag2"]}]}

daysLeft must be a plain number string like "5" not "5 days".`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 2000,
        temperature: 0.3, // lower = more factual, fewer hallucinations
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Groq API error'
      });
    }

    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ content: [{ type: 'text', text }] });

  } catch (err) {
    console.error('Search handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
