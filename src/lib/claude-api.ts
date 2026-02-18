import "dotenv/config";

const CLAUDE_BASE = "https://claude.ai";

interface UsageBucket {
  utilization: number;
  resets_at: string;
}

export interface UsageData {
  five_hour: UsageBucket | null;
  seven_day: UsageBucket | null;
  seven_day_oauth_apps: UsageBucket | null;
  seven_day_opus: UsageBucket | null;
  seven_day_sonnet: UsageBucket | null;
  seven_day_cowork: UsageBucket | null;
  iguana_necktie: UsageBucket | null;
  extra_usage: UsageBucket | null;
}

interface ModelRateLimiter {
  limiter: string;
  value: number;
  source: string;
  model_group: string;
}

export interface RateLimitData {
  rate_limit_tier: string;
  tier_model_rate_limiters: ModelRateLimiter[];
}

async function claudeFetch<T>(path: string): Promise<T> {
  const cookie = process.env.CLAUDE_SESSION_COOKIE;
  if (!cookie) {
    throw new Error("CLAUDE_SESSION_COOKIE not set in .env");
  }

  const orgId = process.env.CLAUDE_ORG_ID;
  if (!orgId) {
    throw new Error("CLAUDE_ORG_ID not set in .env");
  }

  const url = `${CLAUDE_BASE}${path.replace("{orgId}", orgId)}`;

  const res = await fetch(url, {
    headers: {
      Cookie: cookie,
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Claude API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function getUsage(): Promise<UsageData> {
  return claudeFetch<UsageData>("/api/organizations/{orgId}/usage");
}

export async function getRateLimits(): Promise<RateLimitData> {
  return claudeFetch<RateLimitData>("/api/organizations/{orgId}/rate_limits");
}

export { formatTimeUntilReset, formatResetDate, friendlyModelName } from "./format";
