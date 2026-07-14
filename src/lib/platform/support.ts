function normalizeSupportUrl(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getSupportUrl(env: Record<string, string | undefined> = process.env) {
  return normalizeSupportUrl(env.NEXT_PUBLIC_SUPPORT_URL)
    ?? normalizeSupportUrl(env.SUPPORT_URL)
    ?? "/contact";
}

export function isExternalSupportUrl(url: string) {
  return /^(https?:)?\/\//.test(url) || url.startsWith("mailto:") || url.startsWith("tel:");
}
