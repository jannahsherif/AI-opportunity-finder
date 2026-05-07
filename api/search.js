export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  const userMessage = messages[messages.length - 1]?.content || "";

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  try {
    // 1. FIRST CALL: The "Decision Maker"
    // We ask the AI if this is a chat or a search request.
    const decisionRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `You are a smart AI collaborator. 
            If the user is just saying hi/chatting, respond naturally and witty.
            If the user mentions an opportunity, competition, or hackathon, 
            include the string "TRIGGER_SEARCH" in your response.` },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7
      }),
    });

    const decisionData = await decisionRes.json();
    let aiResponse = decisionData.choices[0].message.content;

    // 2. SECOND STEP: If search is triggered, get live data
    let results = [];
    if (aiResponse.includes("TRIGGER_SEARCH")) {
      const searchRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: `current open competitions hackathons 2026 ${userMessage}`,
          max_results: 5
        })
      });
      const searchData = await searchRes.json();
      
      // Now, ask the AI to summarize those results into your JSON format
      const finalRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: `Format these results for Jannah. 
              Be brief and supportive. Return JSON with "message" and "results" array.` },
            { role: 'user', content: `Search Context: ${JSON.stringify(searchData.results)}` }
          ],
          response_format: { type: "json_object" }
        }),
      });
      const finalData = await finalRes.json();
      return res.status(200).json(JSON.parse(finalData.choices[0].message.content));
    }

    // 3. CHAT MODE: If no search, just return the AI's chatty response
    return res.status(200).json({ 
        message: aiResponse, 
        results: [] 
    });

  } catch (err) {
    return res.status(200).json({ message: "My brain is a bit foggy. Try again?", results: [] });
  }
}
