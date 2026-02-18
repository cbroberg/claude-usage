#!/usr/bin/env node

/**
 * Playwright-based fetcher that bypasses Cloudflare bot protection.
 * Keeps a headless browser alive, polls claude.ai every 25s,
 * and writes results to /tmp/claude-usage-data.json.
 */

import "dotenv/config";
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const POLL_INTERVAL = 25_000; // slightly under the client's 30s
const DATA_FILE = "/tmp/claude-usage-data.json";
const ORG_ID = process.env.CLAUDE_ORG_ID;
const COOKIE_STR = process.env.CLAUDE_SESSION_COOKIE || "";
const BASE = "https://claude.ai";

if (!ORG_ID || !COOKIE_STR) {
  console.error("Missing CLAUDE_ORG_ID or CLAUDE_SESSION_COOKIE in .env");
  process.exit(1);
}

// Parse cookie string into Playwright cookie objects
const cookies = COOKIE_STR.split("; ").map((c) => {
  const [name, ...rest] = c.split("=");
  return { name, value: rest.join("="), domain: ".claude.ai", path: "/" };
});

async function main() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  await context.addCookies(cookies);

  // Graceful shutdown
  const cleanup = async () => {
    console.log("\nShutting down browser...");
    await browser.close();
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  async function fetchJson(url) {
    const page = await context.newPage();
    try {
      const response = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });

      // Check if we got a Cloudflare challenge — wait for it to resolve
      const content = await page.textContent("body");
      if (!content || content.includes("Just a moment")) {
        console.log("  Waiting for Cloudflare challenge...");
        await page.waitForURL(url, { timeout: 15_000 }).catch(() => {});
        await page.waitForLoadState("networkidle");
      }

      const text = await page.textContent("body");
      return JSON.parse(text);
    } finally {
      await page.close();
    }
  }

  async function poll() {
    const time = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    try {
      const [usage, rateLimits] = await Promise.all([
        fetchJson(`${BASE}/api/organizations/${ORG_ID}/usage`),
        fetchJson(`${BASE}/api/organizations/${ORG_ID}/rate_limits`),
      ]);

      const data = {
        usage,
        rateLimits,
        timestamp: new Date().toISOString(),
      };
      writeFileSync(DATA_FILE, JSON.stringify(data));
      console.log(`[${time}] Data updated`);
    } catch (e) {
      console.error(`[${time}] Fetch error:`, e.message);
    }
  }

  // Initial fetch
  await poll();

  // Poll loop
  setInterval(poll, POLL_INTERVAL);
  console.log(`Polling every ${POLL_INTERVAL / 1000}s — press Ctrl+C to stop`);
}

main();
