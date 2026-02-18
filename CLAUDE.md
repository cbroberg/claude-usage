# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Next.js dashboard that displays Claude.ai usage limits and rate limits using unofficial internal API endpoints. It shows 5-hour session usage, weekly per-model limits, and per-model rate limits (concurrency, RPM) in a Claude-themed dark UI. Auto-polls every 30 seconds with a live countdown.

**Warning:** The Claude.ai API endpoints used are unofficial and may change without notice.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Refresh cookie from Chrome + start dev server at http://localhost:10420
npm run refresh-cookie   # Manually refresh session cookie from Chrome
```

## Setup

Requires two environment variables in `.env` (see `.env.example`):
- `CLAUDE_SESSION_COOKIE` — auto-populated by `refresh-cookie` script from Chrome, or manually from DevTools
- `CLAUDE_ORG_ID` — org UUID found in claude.ai network requests

The `predev` script runs `refresh-cookie` automatically before every `npm run dev`.

## Architecture

Next.js 15+ App Router with TypeScript and Tailwind CSS v4.

### File Layout

```
src/app/page.tsx            → Thin server component, renders Dashboard
src/app/Dashboard.tsx       → Client component with 30s polling + live countdown
src/app/api/usage/route.ts  → JSON API endpoint (GET /api/usage), force-dynamic
src/app/globals.css         → Custom theme colors and animations
src/app/layout.tsx          → Root layout with metadata
src/lib/claude-api.ts       → Server-side API client (claudeFetch, getUsage, getRateLimits)
src/lib/format.ts           → Shared formatters (formatTimeUntilReset, formatResetDate, friendlyModelName)
scripts/refresh-cookie.mjs  → Reads sessionKey from Chrome's cookie DB on macOS
```

### Key Patterns

- **Client-side polling:** `Dashboard.tsx` is a `"use client"` component that fetches `/api/usage` every 30s. On poll errors, it keeps displaying the last good data rather than showing an error screen.
- **Live countdown:** Header shows a second-by-second countdown to the next poll.
- **API proxy route:** `route.ts` exposes `/api/usage` wrapping `getUsage()` + `getRateLimits()` from the server-side API client.
- **claude-api.ts:** `claudeFetch<T>()` is a generic authenticated fetcher that injects the session cookie and replaces `{orgId}` in paths. Types (`UsageData`, `RateLimitData`) are defined here.
- **format.ts:** Shared formatters extracted for client-side use (separate from server-only `claude-api.ts`).
- **Import alias:** `@/` maps to `src/`.

### Cookie Refresh Script (macOS + Chrome)

`scripts/refresh-cookie.mjs` reads the `sessionKey` cookie directly from Chrome's SQLite cookie DB:
1. Copies the DB to `/tmp` to avoid Chrome's lock
2. Decrypts using macOS Keychain (`Chrome Safe Storage`) + AES-128-CBC
3. Writes the fresh value to `.env`

Supports `--profile "Profile 1"` flag for non-default Chrome profiles.

### Tailwind Theme

Custom color tokens defined in `globals.css` under `@theme` — all prefixed `claude-*` (e.g., `claude-bg`, `claude-accent`, `claude-red`). Usage bar colors change at 70% (yellow) and 90% (red) thresholds. CSS animations: `fade-in-up`, `progress-animate`, `pulse-soft`.
