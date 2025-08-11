// apps/web/src/app/api/health/route.ts
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "web",
    env: process.env.NODE_ENV,
    time: new Date().toISOString(),
  });
}
