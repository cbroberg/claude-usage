# Claude Usage Dashboard

A tiny Next.js app that displays your Claude.ai usage limits and rate limits in a Claude-inspired dark UI.

> ⚠️ This uses **unofficial internal API endpoints** from claude.ai. They may change at any time.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template
cp .env.example .env

# 3. Get your session cookie:
#    - Open claude.ai in Chrome
#    - DevTools (F12) → Application → Cookies → claude.ai
#    - Copy the full "sessionKey" value (starts with sk-ant-sid01-)
#    - Paste in .env as: CLAUDE_SESSION_COOKIE="sessionKey=sk-ant-sid01-..."

# 4. Your org ID is already in the template (from our reverse-engineering session)
#    If it changes, find it in any claude.ai network request

# 5. Run it
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Endpoints Discovered

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/organizations/{orgId}/usage` | GET | Session & weekly usage utilization % + reset times |
| `/api/organizations/{orgId}/rate_limits` | GET | Tier name + per-model concurrency & RPM limits |

Both require the session cookie from your browser. No API key needed.

## Tech Stack

- Next.js 15+ (App Router, Server Components)
- Tailwind CSS v4
- TypeScript
