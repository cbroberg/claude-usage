import { NextResponse } from "next/server";
import { getUsage, getRateLimits } from "@/lib/claude-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [usage, rateLimits] = await Promise.all([
      getUsage(),
      getRateLimits(),
    ]);

    return NextResponse.json({ usage, rateLimits, timestamp: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}
