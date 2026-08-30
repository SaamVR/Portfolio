function normalizeSupportUrl(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const PUBLIC_SUPPORT_URL = normalizeSupportUrl(process.env.NEXT_PUBLIC_SUPPORT_URL);
const SERVER_SUPPORT_URL = normalizeSupportUrl(process.env.SUPPORT_URL);

export function getSupportUrl(env: Record<string, string | undefined> = process.env) {
  if (env === process.env) {
    return PUBLIC_SUPPORT_URL ?? SERVER_SUPPORT_URL ?? "/support";
  }

  return normalizeSupportUrl(env.NEXT_PUBLIC_SUPPORT_URL)
    ?? normalizeSupportUrl(env.SUPPORT_URL)
    ?? "/support";
}

export function isExternalSupportUrl(url: string) {
  return /^(https?:)?\/\//.test(url) || url.startsWith("mailto:") || url.startsWith("tel:");
}
