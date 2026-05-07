<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Opportunity Finder | Jannah</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Mono&family=Outfit:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #f5f4f0;
            --accent: #00c853;
            --text: #0f0f0f;
        }
        body { font-family: 'Outfit', sans-serif; background: var(--bg); margin: 0; padding: 20px; }
        
        /* Simple Chat Styling */
        #chat { max-width: 600px; margin: 0 auto 20px; height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; background: white; border-radius: 8px; }
        .msg-user { text-align: right; color: blue; margin-bottom: 10px; font-family: 'Space Mono', monospace; font-size: 14px; }
        .msg-ai { text-align: left; color: #333; margin-bottom: 10px; background: #f0f0f0; padding: 8px; border-radius: 4px; }
        
        /* Results Grid */
        #results-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; max-width: 1000px; margin: 0 auto; }
        .result-card { background: white; padding: 20px; border-radius: 12px; border-left: 5px solid #ccc; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .result-card.red { border-left-color: #ff5252; }
        .result-card.amber { border-left-color: #ffd740; }
        .result-card.green { border-left-color: #69f0ae; }
        
        .card-title { font-weight: bold; font-size: 18px; margin-bottom: 8px; }
        .card-desc { font-size: 14px; color: #666; margin-bottom: 12px; }
        .tag { font-size: 10px; background: #eee; padding: 2px 6px; border-radius: 4px; margin-right: 4px; }
        .apply-link { display: inline-block; margin-top: 10px; color: var(--accent); font-weight: bold; text-decoration: none; }
        
        .input-area { text-align: center; margin-bottom: 40px; }
        input { padding: 12px; width: 300px; border-radius: 6px; border: 1px solid #ccc; }
        button { padding: 12px 24px; background: var(--text); color: white; border: none; border-radius: 6px; cursor: pointer; }
        
        .loading { opacity: 0.5; cursor: not-allowed; }
    </style>
</head>
<body>

    <div style="text-align:center; margin-bottom: 20px;">
        <a href="index.html" style="text-decoration:none; color: #666;">← Back to Home</a>
        <h1>Opportunity Finder <span id="status-dot">●</span></h1>
        <p id="status-text">Ready to search</p>
    </div>

    <div id="chat"></div>

    <div class="input-area">
        <input type="text" id="user-input" placeholder="e.g. AI hackathons in June...">
        <button id="send-btn" onclick="send()">Search</button>
    </div>

    <div id="results-panel" style="display:none; text-align:center;">
        <h2 id="results-count">0 found</h2>
        <div id="results-list"></div>
    </div>

    <script>
        let loading = false;
        let filters = {}; // Define empty defaults to prevent errors
        let deadline = "within 1 month";

        async function send() {
            const input = document.getElementById('user-input');
            const query = input.value.trim();
            
            if (!query || loading) return;

            // UI State
            loading = true;
            const btn = document.getElementById('send-btn');
            const statusText = document.getElementById('status-text');
            btn.classList.add('loading');
            statusText.innerText = 'Searching live web...';

            const chat = document.getElementById('chat');
            chat.innerHTML += `<div class="msg-user">${query}</div>`;
            input.value = '';

            try {
                const res = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [{ role: 'user', content: query }],
                        filters: filters,
                        deadline: deadline
                    })
                });

                const data = await res.json();

                // 1. Show AI Message
                chat.innerHTML += `<div class="msg-ai">${data.message || "Here are the results I found:"}</div>`;

                // 2. Show Results
                const list = document.getElementById('results-list');
                const panel = document.getElementById('results-panel');
                list.innerHTML = '';
                panel.style.display = 'block';
                document.getElementById('results-count').innerText = `${data.results?.length || 0} found`;

                if (data.results) {
                    data.results.forEach(item => {
                        const days = parseInt(item.daysLeft) || 30;
                        const colorClass = days < 10 ? 'red' : days < 20 ? 'amber' : 'green';
                        
                        const card = document.createElement('div');
                        card.className = `result-card ${colorClass}`;
                        card.innerHTML = `
                            <div class="card-title">${item.title}</div>
                            <div class="card-desc">${item.description}</div>
                            <div>
                                <span class="tag">${item.deadline}</span>
                                ${(item.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
                            </div>
                            <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="apply-link">Apply Now ↗</a>
                        `;
                        list.appendChild(card);
                    });
                }

                chat.scrollTop = chat.scrollHeight;
            } catch (err) {
                console.error(err);
                chat.innerHTML += `<div class="msg-ai" style="color:red">Error: Could not connect to the engine. Make sure your API route is running.</div>`;
            } finally {
                loading = false;
                btn.classList.remove('loading');
                statusText.innerText = 'Ready';
            }
        }
    </script>
</body>
</html>
