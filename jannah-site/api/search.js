export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, filters, deadline } = req.body;

  const activeFilters = Object.entries(filters || {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ');

  const systemPrompt = `You are an AI opportunity finder agent. The user wants to find real opportunities (hackathons, competitions, grants, bounties, challenges, etc.) on the internet.

User's active filters: ${activeFilters || 'none'}
Deadline window preference: ${deadline || 'within 1 month'}

When the user describes what they're looking for:
1. Use web search to find REAL, currently open opportunities
2. Return results as a JSON object with this exact structure (no markdown, no extra text, just valid JSON):
{
  "message": "Brief friendly message about what you found",
  "results": [
    {
      "title": "Name of opportunity",
      "description": "1-2 sentences about it, prizes, who it's for",
      "deadline": "Last date to apply: [date] · [X] days left",
      "daysLeft": "[number] days",
      "url": "https://actual-source-url.com",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

IMPORTANT:
- Always include the real source URL for each result so users can apply
- Sort results by urgency (soonest deadline first)
- Be accurate about deadlines — if unsure, say "Deadline unconfirmed"
- daysLeft should be like "5 days" or "22 days" so urgency color-coding works
- If no results found, return results as empty array and explain in message
- Max 6 results`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
