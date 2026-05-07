export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, filters, deadline } = req.body;
  const userQuery = messages[messages.length - 1]?.content || "";

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // 1. Live Search (Tavily)
  let searchContext = "";
  try {
    const searchRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `active hackathons and competitions 2026 ${userQuery}`,
        search_depth: "advanced",
        max_results: 6
      })
    });
    const searchData = await searchRes.json();
    searchContext = searchData.results?.map(r => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join("\n\n");
  } catch (err) {
    console.error("Search failed");
  }

  // 2. AI Logic (Groq)
  const systemPrompt = `You are a professional Opportunity Finder. Today is ${todayStr}.
  CONTEXT: ${searchContext}
  TASK: Extract 6 open opportunities into JSON. 
  RULES: Use plain number strings for "daysLeft". Return ONLY JSON.`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userQuery }],
        response_format: { type: "json_object" },
        temperature: 0.1
      }),
    });

    const data = await groqRes.json();
    return res.status(200).json(JSON.parse(data.choices[0].message.content));
  } catch (err) {
    return res.status(500).json({ error: "API Error" });
  }
}
