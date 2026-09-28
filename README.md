# The Lab by January

An editorial playground where we test how AI writes the news. You pick a real story from today's January feed, add house rules, and see how the article changes. Built in 3 hours at the Google hackathon with Gemini.

**Live demo:** _add Cloud Run link here_

## What it does

January turns many news sources into one neutral story. The Lab lets our editors try new writing and fact-finding rules on real stories without touching the live app.

1. **Pick a story** from today's feed. Stories are read live and read-only from our database.
2. **Set your rules**
   - **Step 1, Find the facts** (Gemini Flash): how strict fact-checking is, how many key facts to pull out, and how to handle disputed claims.
   - **Step 2, Write the article** (Gemini Pro): headline style, tone, length, standfirst, key points and framing.
   - Every rule group has a "Make your own rule" option, and a rule can apply to all stories or only to one category (for example sports).
3. **Compare.** Your version appears side by side with a Gemini baseline that uses no rules, so you only see what your rules changed.
4. **Preview on iPhone.** Both versions render in the real January app design, including sources, disputed claims and light/dark mode.

## Safety

- Read-only access to the January feed (GET requests only). Nothing here can write to our database or change the live pipeline.
- API keys live only in server-side secrets. They are never in the code or the browser.
- Cost guardrails: per-user rate limits, response caching and a hard monthly spend cap on the Google Cloud project.

## Tech

React, TypeScript, Vite and Tailwind on the frontend. A small Express server (`server.ts`) calls Gemini with structured JSON output and proxies the Supabase feed. Deployed on Google Cloud Run through AI Studio Build.

## Run locally

Needs Node 20+.

```bash
npm install
```

Create a `.env.local` file (never commit it):

```
GEMINI_API_KEY=your_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

Then:

```bash
npm run dev
```

## About January

January is a news app that brings every side of a story together in one neutral article. This repo is a hackathon prototype and is separate from the January production app.
