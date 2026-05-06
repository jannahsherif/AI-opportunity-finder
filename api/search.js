export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, filters, deadline } = req.body;
  const activeFilters = Object.entries(filters || {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ');

  const systemPrompt = `You are an AI opportunity finder. Find real, currently open opportunities (hackathons, competitions, grants, bounties) online.
Active filters: ${activeFilters || 'none'}. Deadline window: ${deadline || 'within 1 month'}.
Search the web for REAL opportunities and return ONLY valid JSON, no markdown, no extra text:
{"message":"brief friendly note","results":[{"title":"...","description":"1-2 sentences, prizes, who it's for","deadline":"Last date to apply: [date] · [X] days left","daysLeft":"[number] days","url":"https://real-url.com","tags":["tag1","tag2"]}]}
Rules: real URLs only, sort by soonest deadline first, max 6 results, daysLeft must be a number like "5 days".`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'compound-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 2000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ content: [{ type: 'text', text }] });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
