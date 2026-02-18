export function formatTimeUntilReset(resetAt: string): string {
  const now = new Date();
  const reset = new Date(resetAt);
  const diff = reset.getTime() - now.getTime();

  if (diff <= 0) return "Resetting now...";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return `Resets in ${parts.join(" ")}`;
}

export function formatResetDate(resetAt: string): string {
  const reset = new Date(resetAt);
  return reset.toLocaleDateString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function friendlyModelName(group: string): string {
  const map: Record<string, string> = {
    claude_3_5_haiku_20241022: "Haiku 3.5",
    claude_3_7_sonnet: "Sonnet 3.7",
    claude_3_haiku: "Haiku 3",
    claude_haiku_4: "Haiku 4",
    claude_sonnet_4: "Sonnet 4",
    claude_opus_4: "Opus 4",
    claude_opus_4_5: "Opus 4.5",
    claude_sonnet_4_5: "Sonnet 4.5",
    claude_haiku_4_5: "Haiku 4.5",
    claude_opus_4_6: "Opus 4.6",
  };
  return map[group] || group.replace(/_/g, " ").replace(/claude /i, "");
}
