"use client";

import { useEffect, useState, useCallback } from "react";
import {
  formatTimeUntilReset,
  formatResetDate,
  friendlyModelName,
} from "@/lib/format";
import type { UsageData, RateLimitData } from "@/lib/claude-api";

const POLL_INTERVAL = 30_000;

function getBarColor(utilization: number): string {
  if (utilization >= 90) return "bg-claude-red";
  if (utilization >= 70) return "bg-claude-yellow";
  return "bg-claude-blue";
}

function getBarGlow(utilization: number): string {
  if (utilization >= 90) return "shadow-[0_0_12px_rgba(212,116,116,0.4)]";
  if (utilization >= 70) return "shadow-[0_0_12px_rgba(212,184,106,0.3)]";
  return "shadow-[0_0_8px_rgba(107,163,214,0.3)]";
}

function UsageBar({
  label,
  subtitle,
  utilization,
  resetAt,
}: {
  label: string;
  subtitle?: string;
  utilization: number;
  resetAt: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <span className="text-[15px] font-medium text-claude-text">{label}</span>
          {subtitle && (
            <span className="text-[13px] text-claude-text-dim ml-2">{subtitle}</span>
          )}
        </div>
        <span
          className={`text-[14px] font-mono tabular-nums ${
            utilization >= 90
              ? "text-claude-red"
              : utilization >= 70
              ? "text-claude-yellow"
              : "text-claude-text-muted"
          }`}
        >
          {Math.round(utilization)}% used
        </span>
      </div>

      <div className="relative h-2 bg-claude-surface rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${getBarColor(utilization)} ${getBarGlow(utilization)} transition-all duration-700`}
          style={{ width: `${Math.min(utilization, 100)}%` }}
        />
      </div>

      <div className="flex justify-between mt-1.5">
        <span className="text-[12px] text-claude-text-dim">
          {formatTimeUntilReset(resetAt)}
        </span>
        <span className="text-[12px] text-claude-text-dim">
          {formatResetDate(resetAt)}
        </span>
      </div>
    </div>
  );
}

function RateLimitCard({
  modelGroup,
  limiters,
}: {
  modelGroup: string;
  limiters: { limiter: string; value: number }[];
}) {
  return (
    <div className="bg-claude-surface/60 rounded-xl p-4 border border-claude-border/50 hover:border-claude-border transition-colors">
      <h3 className="text-[14px] font-medium text-claude-accent mb-3">
        {friendlyModelName(modelGroup)}
      </h3>
      <div className="space-y-2">
        {limiters.map((l) => (
          <div key={l.limiter} className="flex items-center justify-between">
            <span className="text-[13px] text-claude-text-muted">
              {l.limiter === "concurrents"
                ? "Concurrent"
                : l.limiter === "raw_thinking_requests_per_minute"
                ? "Thinking RPM"
                : l.limiter.replace(/_/g, " ")}
            </span>
            <span className="text-[14px] font-mono text-claude-text tabular-nums">
              {l.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-claude-surface rounded-2xl p-8 max-w-lg w-full border border-claude-border text-center">
        <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
        <h2 className="text-lg font-medium text-claude-text mb-2">Connection Error</h2>
        <p className="text-[14px] text-claude-text-muted mb-6">{message}</p>
        <div className="bg-claude-sidebar rounded-lg p-4 text-left">
          <p className="text-[13px] text-claude-text-dim font-mono mb-2">
            # Add to .env in project root:
          </p>
          <p className="text-[13px] text-claude-accent font-mono">
            CLAUDE_SESSION_COOKIE=&quot;sessionKey=sk-ant-...&quot;
          </p>
          <p className="text-[13px] text-claude-accent font-mono mt-1">
            CLAUDE_ORG_ID=&quot;your-org-uuid&quot;
          </p>
        </div>
      </div>
    </div>
  );
}

interface ApiResponse {
  usage: UsageData;
  rateLimits: RateLimitData;
  timestamp: string;
  error?: string;
}

export default function Dashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (error) return <ErrorState message={error} />;
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-claude-green pulse-soft" />
        <span className="text-[13px] text-claude-text-dim ml-2">Loading...</span>
      </div>
    );
  }

  const { usage, rateLimits } = data;

  const modelGroups = new Map<string, { limiter: string; value: number }[]>();
  for (const rl of rateLimits.tier_model_rate_limiters) {
    const existing = modelGroups.get(rl.model_group) || [];
    existing.push({ limiter: rl.limiter, value: rl.value });
    modelGroups.set(rl.model_group, existing);
  }

  const usageBars = [
    usage.five_hour && { label: "Current session", subtitle: "5-hour window", ...usage.five_hour },
    usage.seven_day && { label: "All models", subtitle: "Weekly limit", ...usage.seven_day },
    usage.seven_day_sonnet && { label: "Sonnet only", subtitle: "Weekly limit", ...usage.seven_day_sonnet },
    usage.seven_day_opus && { label: "Opus only", subtitle: "Weekly limit", ...usage.seven_day_opus },
    usage.seven_day_cowork && { label: "Cowork", subtitle: "Weekly limit", ...usage.seven_day_cowork },
    usage.extra_usage && { label: "Extra usage", subtitle: "Overflow", ...usage.extra_usage },
  ].filter(Boolean) as { label: string; subtitle: string; utilization: number; resets_at: string }[];

  const timestamp = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
    : "";

  return (
    <div className="min-h-screen bg-claude-bg">
      <div className="fixed inset-x-0 top-0 h-48 bg-gradient-to-b from-claude-sidebar/80 to-transparent pointer-events-none" />

      <main className="relative max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="fade-in-up mb-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-claude-accent/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-claude-accent">
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
            </div>
            <h1 className="text-xl font-medium text-claude-text tracking-tight">
              Usage Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2 ml-11">
            <div className="w-1.5 h-1.5 rounded-full bg-claude-green pulse-soft" />
            <p className="text-[13px] text-claude-text-dim">
              Live · {timestamp} ·{" "}
              <span className="text-claude-text-muted">
                {rateLimits.rate_limit_tier.replace("default_", "").replace(/_/g, " ")}
              </span>
              <span className="text-claude-text-dim ml-1">· 30s poll</span>
            </p>
          </div>
        </div>

        {/* Plan usage limits */}
        <section className="mb-10">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-claude-text-dim mb-5">
            Plan Usage Limits
          </h2>
          <div className="space-y-6">
            {usageBars.map((bar) => (
              <UsageBar
                key={bar.label}
                label={bar.label}
                subtitle={bar.subtitle}
                utilization={bar.utilization}
                resetAt={bar.resets_at}
              />
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-claude-border to-transparent mb-10" />

        {/* Rate limits */}
        <section>
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-claude-text-dim mb-5">
            Rate Limits by Model
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {Array.from(modelGroups.entries()).map(([modelGroup, limiters]) => (
              <RateLimitCard key={modelGroup} modelGroup={modelGroup} limiters={limiters} />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-[12px] text-claude-text-dim">
          <p>
            Data from{" "}
            <span className="font-mono text-claude-accent-dim">
              claude.ai/api/organizations/&#123;orgId&#125;/usage
            </span>
          </p>
          <p className="mt-1">Auto-refreshes every 30s · Not an official API</p>
        </footer>
      </main>
    </div>
  );
}
