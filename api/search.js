export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  const userQuery = messages[messages.length - 1]?.content || "";

  try {
    // 1. Get Live Data (Tavily)
    const searchRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `active hackathons 2026 ${userQuery}`,
        max_results: 5
      })
    });
    const searchData = await searchRes.json();
    const context = searchData.results?.map(r => r.content).join("\n") || "No results found.";

    // 2. Process with AI (Groq)
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a finder. Return ONLY JSON with "message" (string) and "results" (array of objects).' },
          { role: 'user', content: `Context: ${context}\n\nQuery: ${userQuery}` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await groqRes.json();
    const rawContent = aiData.choices[0].message.content;
    
    // Safety Parse
    const finalJson = JSON.parse(rawContent);
    return res.status(200).json(finalJson);

  } catch (err) {
    console.error(err);
    // Fallback if everything breaks
    return res.status(200).json({ 
        message: "I encountered an error searching. Try again?", 
        results: [] 
    });
  }
}
