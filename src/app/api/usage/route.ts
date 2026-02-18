import { NextResponse } from "next/server";
import { readFileSync } from "fs";

export const dynamic = "force-dynamic";

const DATA_FILE = "/tmp/claude-usage-data.json";

export async function GET() {
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "No data yet — is the fetcher running? (npm run dev starts it automatically)" },
      { status: 503 }
    );
  }
}
