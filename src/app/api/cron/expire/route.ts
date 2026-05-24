import { NextRequest, NextResponse } from "next/server";
import { expireStaleReservations } from "@/lib/expiry";

// Vercel Cron: runs every minute in production
// Add to vercel.json: { "crons": [{ "path": "/api/cron/expire", "schedule": "* * * * *" }] }
export async function GET(request: NextRequest) {
  // Validate cron secret to prevent abuse
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const released = await expireStaleReservations();
  return NextResponse.json({ released, timestamp: new Date().toISOString() });
}
