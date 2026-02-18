# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Next.js dashboard that displays Claude.ai usage limits and rate limits using unofficial internal API endpoints. It shows 5-hour session usage, weekly per-model limits, and per-model rate limits (concurrency, RPM) in a Claude-themed dark UI.

**Warning:** The Claude.ai API endpoints used are unofficial and may change without notice.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:10420
```

## Setup

Requires two environment variables in `.env` (see `.env.example`):
- `CLAUDE_SESSION_COOKIE` — from browser DevTools: Application > Cookies > claude.ai > `sessionKey`
- `CLAUDE_ORG_ID` — org UUID found in claude.ai network requests

## Architecture

Next.js 15+ App Router with TypeScript and Tailwind CSS v4.

### Expected File Layout (Next.js App Router)

```
src/lib/claude-api.ts      → API client (claudeFetch, getUsage, getRateLimits, formatters)
src/app/page.tsx            → Main dashboard page (async Server Component)
src/app/api/usage/route.ts  → JSON API endpoint (GET /api/usage)
src/app/globals.css         → Custom theme colors and animations
```

### Key Patterns

- **Server-side data fetching:** `page.tsx` is an async Server Component — it calls `getUsage()` and `getRateLimits()` via `Promise.all` at render time. No client-side state or hooks.
- **API proxy route:** `route.ts` exposes a `/api/usage` JSON endpoint wrapping the same functions, marked `force-dynamic`.
- **claude-api.ts:** Central API module. `claudeFetch<T>()` is a generic authenticated fetcher that injects the session cookie and replaces `{orgId}` in paths. All API types (`UsageData`, `RateLimitData`) are defined and exported here.
- **Import alias:** `@/` maps to the project `src/` directory (e.g., `@/lib/claude-api`).

### Tailwind Theme

Custom color tokens defined in `globals.css` under `@theme` — all prefixed `claude-*` (e.g., `claude-bg`, `claude-accent`, `claude-red`). Usage bar colors change at 70% (yellow) and 90% (red) thresholds. CSS animations: `fade-in-up`, `progress-animate`, `pulse-soft`.
