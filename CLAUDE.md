# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Next.js dashboard that displays Claude.ai usage limits and rate limits using unofficial internal API endpoints. It shows 5-hour session usage, weekly per-model limits, and per-model rate limits (concurrency, RPM) in a Claude-themed dark UI. Auto-polls every 30 seconds with a live countdown — designed to run on an external monitor.

**Warning:** The Claude.ai API endpoints used are unofficial and may change without notice.

## Commands

```bash
npm install                      # Install dependencies
npx playwright install chromium  # Install headless browser (first time)
npm run dev                      # Refresh cookie + start fetcher & dev server
npm run refresh-cookie           # Manually refresh cookies from Chrome
npm run fetcher                  # Run Playwright fetcher standalone
```

## Setup

Requires `.env` with (see `.env.example`):
- `CLAUDE_SESSION_COOKIE` — auto-populated by `refresh-cookie` script from Chrome
- `CLAUDE_ORG_ID` — org UUID found in claude.ai network requests

## Architecture

Next.js 15+ App Router with TypeScript and Tailwind CSS v4. Uses Playwright to bypass Cloudflare bot protection.

### Data Flow

```
npm run dev
  1. predev: refresh-cookie.mjs → reads cookies from Chrome → writes .env
  2. concurrently starts:
     a. fetcher.mjs (Playwright) → polls claude.ai/api every 25s → /tmp/claude-usage-data.json
     b. next dev (port 10420) → route.ts reads JSON file → Dashboard.tsx polls /api/usage every 30s
```

### File Layout

```
src/app/page.tsx            → Thin server component, renders Dashboard
src/app/Dashboard.tsx       → Client component ("use client") with 30s polling + live countdown
src/app/api/usage/route.ts  → Reads /tmp/claude-usage-data.json, serves as GET /api/usage
src/app/globals.css         → Custom theme colors and animations
src/app/layout.tsx          → Root layout with metadata
src/lib/claude-api.ts       → Types (UsageData, RateLimitData) + re-exports formatters
src/lib/format.ts           → Shared formatters (formatTimeUntilReset, formatResetDate, friendlyModelName)
scripts/refresh-cookie.mjs  → Reads sessionKey + cf_clearance from Chrome's cookie DB on macOS
scripts/fetcher.mjs         → Playwright headless browser that polls claude.ai and writes JSON to /tmp
```

### Key Patterns

- **Playwright fetcher:** `fetcher.mjs` launches a headless Chromium that navigates to the claude.ai API endpoints. This bypasses Cloudflare's bot protection (which blocks server-side `fetch`/`curl`). The browser stays alive between polls. Results are written to `/tmp/claude-usage-data.json`.
- **File-based data passing:** The Next.js API route (`route.ts`) reads the JSON file written by the fetcher. This decouples Playwright from the Next.js process — no shared state or lifecycle concerns.
- **Client-side polling:** `Dashboard.tsx` fetches `/api/usage` every 30s. On poll errors, it keeps displaying the last good data rather than showing an error screen (uses `useRef` to track data availability without triggering re-renders).
- **Live countdown:** Header shows a second-by-second countdown to the next poll. Uses a separate `setInterval` for ticking, decoupled from the fetch interval to avoid resets.
- **Import alias:** `@/` maps to `src/`.

### Cookie Refresh Script (macOS + Chrome)

`scripts/refresh-cookie.mjs` reads cookies from Chrome's SQLite cookie DB:
1. Copies the DB to `/tmp` to avoid Chrome's lock
2. Queries both `sessionKey` and `cf_clearance` (matches host `.claude.ai` and `claude.ai`)
3. Decrypts using macOS Keychain (`Chrome Safe Storage`) + PBKDF2 + AES-128-CBC
4. Writes combined cookie string to `.env`

Supports `--profile "Profile 1"` flag for non-default Chrome profiles.

### Tailwind Theme

Custom color tokens defined in `globals.css` under `@theme` — all prefixed `claude-*` (e.g., `claude-bg`, `claude-accent`, `claude-red`). Usage bar colors change at 70% (yellow) and 90% (red) thresholds. CSS animations: `fade-in-up`, `progress-animate`, `pulse-soft`.
