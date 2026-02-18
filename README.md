# Claude Usage Dashboard

A tiny Next.js app that displays your Claude.ai usage limits and rate limits in a Claude-inspired dark UI.

> ⚠️ This uses **unofficial internal API endpoints** from claude.ai. They may change at any time.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template
cp .env.example .env

# 3. Your org ID is already in the template
#    If it changes, find it in any claude.ai network request

# 4. Run it (auto-refreshes session cookie from Chrome)
npm run dev
```

Open [http://localhost:10420](http://localhost:10420)

## Auto Cookie Refresh (macOS + Chrome)

The session cookie is refreshed automatically every time you run `npm run dev`. The `predev` script reads the `sessionKey` cookie directly from Chrome's local cookie database — no manual copy-pasting needed.

**How it works:**
1. Copies Chrome's SQLite cookie DB to avoid lock conflicts
2. Decrypts the cookie using macOS Keychain + AES-128-CBC
3. Updates `.env` with the fresh `sessionKey`

You can also run it manually:
```bash
npm run refresh-cookie
```

> Requires being logged in to claude.ai in Chrome. Use `--profile "Profile 1"` if your Chrome profile isn't the default.

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
