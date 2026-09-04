import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";

export const dynamic = "force-dynamic";

export const availabilityProbeRouteDeps = {
  getSecret: () => process.env.NOTIFICATION_PROCESSOR_SECRET?.trim() ?? "",
  getSupabaseAdminClient,
};

function isAuthorized(req: Request) {
  const expected = availabilityProbeRouteDeps.getSecret();
  const provided = req.headers.get("x-notification-queue-secret")?.trim() ?? "";
  return Boolean(expected) && expected === provided;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = availabilityProbeRouteDeps.getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.rpc("record_platform_availability_success");
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      recorded: Boolean(data),
      slotStart: typeof data === "string" ? data : null,
    });
  } catch (error) {
    console.error("Platform availability probe error:", error);
    return NextResponse.json({ ok: false, error: "Core availability probe failed" }, { status: 503 });
  }
}
