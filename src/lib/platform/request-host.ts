export function normalizeRequestHost(hostname?: string | null) {
  if (!hostname) {
    return null;
  }

  return hostname
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0] || null;
}

export function getPreferredRequestHost(
  values: {
    host?: string | null;
    forwardedHost?: string | null;
  },
) {
  return normalizeRequestHost(values.host) ?? normalizeRequestHost(values.forwardedHost);
}
