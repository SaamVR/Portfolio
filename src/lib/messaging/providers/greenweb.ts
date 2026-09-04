import type {
  SmsDispatchInput,
  SmsDispatchResult,
  SmsProviderAdapter,
  SmsProviderVerification,
} from "./types";

const GREENWEB_SEND_URL = "https://api.greenweb.com.bd/api.php?json";
const GREENWEB_ACCOUNT_URL = "https://api.greenweb.com.bd/g_api.php";

function providerRejected(body: string) {
  return /\b(error|invalid|failed|forbidden|unauthori[sz]ed)\b/i.test(body);
}

function parseBalanceMetadata(body: string): Record<string, unknown> {
  const compact = body.trim().slice(0, 500);
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(compact);
  } catch {
    parsed = null;
  }

  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    const balance = record.balance ?? record.Balance ?? record.sms_balance ?? null;
    const rate = record.rate ?? record.Rate ?? null;
    return {
      ...(balance !== null ? { balance: String(balance).slice(0, 80) } : {}),
      ...(rate !== null ? { rate: String(rate).slice(0, 80) } : {}),
    };
  }

  const balanceMatch = compact.match(/balance\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  return balanceMatch ? { balance: balanceMatch[1] } : {};
}

export const greenWebSmsProvider: SmsProviderAdapter = {
  key: "greenweb",
  label: "GreenWeb",

  async verifyCredential(secret: string): Promise<SmsProviderVerification> {
    const token = secret.trim();
    if (!token) return { ok: false, metadata: {}, error: "Provider credential is empty" };

    try {
      const url = new URL(GREENWEB_ACCOUNT_URL);
      url.searchParams.set("token", token);
      url.searchParams.set("balance", "");
      url.searchParams.set("json", "");
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      const body = await response.text();
      if (!response.ok || providerRejected(body)) {
        return { ok: false, metadata: {}, error: `GreenWeb verification failed (${response.status})` };
      }
      return { ok: true, metadata: parseBalanceMetadata(body), error: null };
    } catch {
      return { ok: false, metadata: {}, error: "GreenWeb verification request failed" };
    }
  },

  async send(input: SmsDispatchInput): Promise<SmsDispatchResult> {
    if (!input.secret.trim()) return { accepted: false, providerMessageId: null, error: "Provider credential is empty" };
    if (!input.to.trim()) return { accepted: false, providerMessageId: null, error: "SMS recipient is empty" };
    if (!input.message.trim()) return { accepted: false, providerMessageId: null, error: "SMS message is empty" };

    try {
      const response = await fetch(GREENWEB_SEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: input.secret.trim(),
          to: input.to.trim(),
          message: input.message,
        }),
        signal: AbortSignal.timeout(5000),
      });
      const body = await response.text();
      if (!response.ok || providerRejected(body)) {
        return { accepted: false, providerMessageId: null, error: `GreenWeb rejected SMS (${response.status})` };
      }
      return { accepted: true, providerMessageId: null, error: null };
    } catch {
      return { accepted: false, providerMessageId: null, error: "GreenWeb SMS request failed" };
    }
  },
};
