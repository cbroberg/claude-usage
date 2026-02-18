# Claude Usage Dashboard

A Next.js app that displays your Claude.ai usage limits and rate limits in a Claude-inspired dark UI. Auto-polls every 30 seconds with a live countdown — designed to run on an external monitor.

> **Warning:** This uses **unofficial internal API endpoints** from claude.ai. They may change at any time.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright's Chromium (first time only)
npx playwright install chromium

# 3. Copy the env template
cp .env.example .env

# 4. Find your org ID in any claude.ai network request and add it to .env

# 5. Run it
npm run dev
```

Open [http://localhost:10420](http://localhost:10420)

## How It Works

`npm run dev` starts three things in sequence:

1. **Cookie refresh** (`predev`) — reads `sessionKey` + `cf_clearance` cookies directly from Chrome's local SQLite database, decrypts them via macOS Keychain, and writes them to `.env`
2. **Playwright fetcher** — launches a headless Chromium browser that polls the claude.ai API every 25 seconds, bypassing Cloudflare bot protection, and writes results to `/tmp/claude-usage-data.json`
3. **Next.js dev server** — serves the dashboard on port 10420, reading data from the JSON file

The dashboard client polls the Next.js API route (`/api/usage`) every 30 seconds and displays a live countdown to the next update.

## Auto Cookie Refresh (macOS + Chrome)

The `predev` script automatically extracts cookies from Chrome on every startup — no manual copy-pasting needed.

```bash
npm run refresh-cookie          # Run manually
npm run refresh-cookie -- --profile "Profile 1"  # Non-default Chrome profile
```

**How it works:**
1. Copies Chrome's SQLite cookie DB to `/tmp` to avoid lock conflicts
2. Decrypts using macOS Keychain (`Chrome Safe Storage`) + AES-128-CBC
3. Extracts both `sessionKey` and `cf_clearance` (needed for Cloudflare)
4. Updates `.env`

> Requires being logged in to claude.ai in Chrome.

## Claude.ai API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/organizations/{orgId}/usage` | Session & weekly usage utilization % + reset times |
| `/api/organizations/{orgId}/rate_limits` | Tier name + per-model concurrency & RPM limits |

Both require the session cookie from your browser. No API key needed.

## Tech Stack

- Next.js 15+ (App Router)
- Playwright (headless Chromium for Cloudflare bypass)
- Tailwind CSS v4
- TypeScript
