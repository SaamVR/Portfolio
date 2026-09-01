import { NextResponse } from "next/server";
import { resolveReleaseIdentity } from "@/lib/platform/release-identity";

export async function GET() {
  const release = resolveReleaseIdentity();
  const response = NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString(), release },
    { status: 200 },
  );
  if (release) response.headers.set("x-ezcomo-release", release);
  return response;
}
