import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { loadPlatformSiteName, loadPlatformSmsRuntime, sendPlatformSms } from "../_shared/platform-sms.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SEND_SMS_HOOK_SECRETS = Deno.env.get("SEND_SMS_HOOK_SECRETS") ?? "";

function verifyPayload(payload: string, headers: Record<string, string>) {
  const candidates = SEND_SMS_HOOK_SECRETS
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);

  let lastError: unknown = null;
  for (const candidate of candidates) {
    const secret = candidate.replace(/^v1,whsec_/, "");
    try {
      return new Webhook(secret).verify(payload, headers) as {
        user?: { phone?: string };
        sms?: { otp?: string };
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("SMS hook signing secret is not configured");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 400 });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SEND_SMS_HOOK_SECRETS) {
    return Response.json({ error: "SMS auth hook is not configured" }, { status: 503, headers: { "retry-after": "true" } });
  }

  try {
    const raw = await req.text();
    const verified = verifyPayload(raw, Object.fromEntries(req.headers));
    const phone = typeof verified.user?.phone === "string" ? verified.user.phone.trim() : "";
    const otp = typeof verified.sms?.otp === "string" ? verified.sms.otp.trim() : "";
    if (!phone || !/^\d{6}$/.test(otp)) {
      return Response.json({ error: "Invalid SMS auth hook payload" }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const runtime = await loadPlatformSmsRuntime(supabase, "otp");
    if (!runtime) {
      return Response.json({ error: "Platform OTP SMS is not enabled" }, { status: 503, headers: { "retry-after": "true" } });
    }
    const siteName = (await loadPlatformSiteName(supabase)).replace(/[\r\n]+/g, " ").slice(0, 60);
    const message = `${siteName}: আপনার লগইন OTP কোড ${otp}। কোডটি কাউকে জানাবেন না।`;
    await sendPlatformSms({ ...runtime, to: phone, message });
    return Response.json({}, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMS auth hook delivery failed";
    console.error("[Auth SMS] Delivery failed:", message);
    return Response.json({ error: "SMS delivery temporarily unavailable" }, { status: 503, headers: { "retry-after": "true" } });
  }
});
