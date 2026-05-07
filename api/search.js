export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, filters, deadline } = req.body;
  const userQuery = messages[messages.length - 1]?.content || "";

  // 2. Setup Real-time Date
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // 3. Step One: Live Web Search (Tavily - Free Tier)
  // This finds actual 2026 events so the AI doesn't hallucinate.
  let searchResultsContext = "";
  try {
    const searchRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `open hackathons competitions bounties 2026 ${userQuery} ${deadline}`,
        search_depth: "advanced",
        max_results: 6
      })
    });
    const searchData = await searchRes.json();
    searchResultsContext = searchData.results?.map(r => 
      `Source: ${r.title}\nContent: ${r.content}\nURL: ${r.url}`
    ).join("\n\n") || "No live search results found.";
  } catch (err) {
    console.error("Search API failed:", err);
    searchResultsContext = "Search currently unavailable. Use internal knowledge.";
  }

  // 4. Step Two: AI Processing (Groq - Llama 3)
  const systemPrompt = `You are a specialized Opportunity Finder. Today is ${todayStr}.
  
  CONTEXT FROM WEB SEARCH:
  ${searchResultsContext}

  TASK:
  Extract exactly 6 opportunities from the context above. 
  If the context is insufficient, use your verified internal knowledge for 2026.
  
  CRITICAL RULES:
  - Return ONLY valid JSON.
  - "daysLeft" must be a plain number string (e.g. "14").
  - URLs must be real and direct.
  - Sort results by soonest deadline first.

  JSON FORMAT:
  {
    "message": "A brief 1-sentence friendly greeting.",
    "results": [
      {
        "title": "Exact Name",
        "description": "1-2 sentences on prizes/focus.",
        "deadline": "Closes: Month Day, Year",
        "daysLeft": "15",
        "url": "https://...",
        "tags": ["Tag1", "Tag2"]
      }
    ]
  }`;

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.1, // Keep it factual, not creative
        response_format: { type: "json_object" }
      }),
    });

    const data = await groqResponse.json();
    
    // Safety check for Groq response
    if (!groqResponse.ok) {
        throw new Error(data.error?.message || "Groq Error");
    }

    const content = data.choices[0].message.content;
    const parsedData = JSON.parse(content);

    // 5. Final Output to Frontend
    return res.status(200).json(parsedData);

  } catch (err) {
    console.error('Final Handler Error:', err);
    return res.status(500).json({ 
      error: 'Failed to find opportunities.',
      message: "The search engine is currently under maintenance."
    });
  }
}
