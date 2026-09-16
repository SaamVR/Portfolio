import { NextResponse } from "next/server";

const retiredResponse = () =>
  NextResponse.json(
    { error: "Phone authentication has been retired.", code: "auth_bridge_retired" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );

export async function POST() {
  return retiredResponse();
}

export async function GET() {
  return retiredResponse();
}
