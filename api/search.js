export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, filters, deadline } = req.body;

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const activeFilters = Object.entries(filters || {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ');

  const systemPrompt = `You are a professional Opportunity Discovery Engine. Today's date is ${todayStr}.
  
  TASK: Return a JSON list of 6 REAL opportunities based on the user's request.
  FILTERS: ${activeFilters || 'none'}. 
  DEADLINE: ${deadline || 'within 1 month'}.

  FORMAT RULES:
  1. Return ONLY raw JSON.
  2. Use "daysLeft" as a numeric string.
  3. Ensure URLs are direct links (e.g., devpost.com/hackathons).
  4. If an opportunity is expired or data is uncertain, EXCLUDE it.

  JSON STRUCTURE:
  {
    "message": "Found 6 opportunities for you.",
    "results": [
      {
        "title": "Name",
        "description": "Short summary",
        "deadline": "Closes: [Date] · [X] days left",
        "daysLeft": "5",
        "url": "https://...",
        "tags": ["AI", "Remote"]
      }
    ]
  }`;

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
        temperature: 0.2, // Lower temp reduces "creative" hallucinations
        response_format: { type: "json_object" } // Forces Groq to output JSON
      }),
    });

    const data = await response.json();
    
    // Groq returns choices[0].message.content as a string
    const content = data.choices?.[0]?.message?.content;
    
    // Parse the string into actual JSON to send back to your frontend
    const parsedContent = JSON.parse(content);

    return res.status(200).json(parsedContent);

  } catch (err) {
    console.error('Search handler error:', err);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
}
