type SmsPurpose = "otp" | "transactional";

type SupabaseLike = {
  from(table: string): any;
  rpc(name: string, args?: Record<string, unknown>): Promise<{ data: any; error: any }>;
};

type PlatformSmsRuntime = {
  provider: string;
  secret: string;
};

function providerRejected(body: string) {
  return /\b(error|invalid|failed|forbidden|unauthori[sz]ed)\b/i.test(body);
}

export async function loadPlatformSmsRuntime(
  supabase: SupabaseLike,
  purpose: SmsPurpose,
): Promise<PlatformSmsRuntime | null> {
  const { data: config, error: configError } = await supabase
    .from("platform_messaging_config")
    .select("active_sms_provider, sms_enabled, otp_enabled, transactional_enabled")
    .eq("singleton", true)
    .maybeSingle();
  if (configError) throw configError;
  if (!config || config.sms_enabled !== true) return null;
  if (purpose === "otp" && config.otp_enabled !== true) return null;
  if (purpose === "transactional" && config.transactional_enabled !== true) return null;

  const provider = typeof config.active_sms_provider === "string" ? config.active_sms_provider.trim().toLowerCase() : "";
  if (!provider) return null;

  const { data: connection, error: connectionError } = await supabase
    .from("platform_sms_provider_connections")
    .select("status, verification_status")
    .eq("provider", provider)
    .maybeSingle();
  if (connectionError) throw connectionError;
  if (connection?.status !== "configured" || connection?.verification_status !== "verified") return null;

  const { data: secret, error: secretError } = await supabase.rpc("get_platform_sms_provider_secret", { p_provider: provider });
  if (secretError) throw secretError;
  if (typeof secret !== "string" || !secret.trim()) return null;
  return { provider, secret: secret.trim() };
}

export async function loadPlatformSiteName(supabase: SupabaseLike) {
  const { data, error } = await supabase
    .from("platform_identity_config")
    .select("site_name")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw error;
  const siteName = typeof data?.site_name === "string" ? data.site_name.trim() : "";
  return siteName || "EZComo";
}

export async function sendPlatformSms(input: {
  provider: string;
  secret: string;
  to: string;
  message: string;
}) {
  if (input.provider !== "greenweb") {
    throw new Error("Selected platform SMS provider is not supported by this runtime");
  }

  const response = await fetch("https://api.greenweb.com.bd/api.php?json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token: input.secret,
      to: input.to,
      message: input.message,
    }),
  });
  const body = await response.text();
  if (!response.ok || providerRejected(body)) {
    throw new Error(`Platform SMS provider rejected delivery (${response.status})`);
  }
  return { provider: input.provider, providerMessageId: null as string | null };
}
