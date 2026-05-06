# Jannah Abdelhay — Personal Site + Opportunity Finder

## Project Structure

```
jannah-site/
├── api/
│   └── search.js        ← Serverless backend (keeps API key secret)
├── public/
│   ├── index.html       ← About / homepage
│   └── finder.html      ← AI Opportunity Finder
├── vercel.json          ← Routing config
└── README.md
```

## Deploy to Vercel (Free, ~5 minutes)

### Step 1 — Get your free Anthropic API key
1. Go to https://console.anthropic.com and sign up
2. Navigate to **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-...`)

### Step 2 — Put code on GitHub
1. Go to https://github.com and create a new repository (e.g. `jannah-site`)
2. Upload all these files maintaining the same folder structure
   - Easiest: drag and drop the whole folder into the GitHub UI

### Step 3 — Deploy on Vercel
1. Go to https://vercel.com and sign up with your GitHub account
2. Click **Add New Project**
3. Import your `jannah-site` GitHub repository
4. Click **Deploy** (leave all settings as default)

### Step 4 — Add your API key (CRITICAL)
1. In Vercel, go to your project → **Settings** → **Environment Variables**
2. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your key from Step 1
3. Click **Save**
4. Go to **Deployments** → click the 3 dots on your latest deploy → **Redeploy**

### Done!
Your site is now live at `https://your-project-name.vercel.app`

- Homepage: `https://your-project-name.vercel.app`
- Finder: `https://your-project-name.vercel.app/finder.html`

## Custom Domain (Optional, Free)
In Vercel → **Settings** → **Domains** → add any domain you own.
Free `.vercel.app` subdomain works forever with no custom domain needed.

## How It Works
- Frontend (HTML/CSS/JS) is served from `/public/`
- When the user searches, the frontend calls `/api/search`
- The serverless function (`api/search.js`) adds your secret API key and calls Anthropic
- Claude uses web search to find real opportunities, returns JSON with source URLs
- Results are displayed with urgency color-coding (red/amber/green) by deadline
