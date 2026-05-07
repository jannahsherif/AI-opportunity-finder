export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send();

  const { messages } = req.body;
  const lastMessage = messages[messages.length - 1].content;

  try {
    // Determine if we should search
    const isSearchNeeded = /hackathon|competition|opportunity|find|vibe coding|bounty/i.test(lastMessage);

    let searchResults = [];
    let context = "No search performed.";

    if (isSearchNeeded) {
      const search = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: `active 2026 competitions hackathons ${lastMessage}`,
          max_results: 5
        })
      });
      const sData = await search.json();
      context = sData.results?.map(r => r.content).join("\n") || "";
    }

    // Generate Final Chat Response + JSON
    const groq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are Jannahs personal assistant. Be smart, witty, and helpful. If searching, return JSON with "message" and "results" (array). If just chatting, return JSON with "message" and empty "results".' },
          { role: 'user', content: `Context: ${context}\n\nUser said: ${lastMessage}` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const gData = await groq.json();
    return res.status(200).json(JSON.parse(gData.choices[0].message.content));

  } catch (err) {
    return res.status(200).json({ message: "I'm here, but my data feed is lagging.", results: [] });
  }
}
