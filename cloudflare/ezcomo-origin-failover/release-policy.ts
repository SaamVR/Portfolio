const FULL_GIT_SHA = /^[0-9a-f]{40}$/i;

export type OriginReleaseProbe = {
  ok: boolean;
  release: string | null;
};

export type ReleaseOriginSelection = "compatibility" | "primary" | "fallback" | "degraded";

export type ReleaseSelectionResult = {
  selection: ReleaseOriginSelection;
  expectedRelease: string | null;
  primaryMatches: boolean;
  fallbackMatches: boolean;
  reason: "expected_unset" | "expected_invalid" | "primary_match" | "fallback_match" | "no_match";
};

export function normalizeReleaseSha(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return FULL_GIT_SHA.test(normalized) ? normalized : null;
}

export function selectReleaseOrigin(input: {
  expectedRelease: unknown;
  primary: OriginReleaseProbe;
  fallback: OriginReleaseProbe;
}): ReleaseSelectionResult {
  const rawExpected = typeof input.expectedRelease === "string" ? input.expectedRelease.trim() : "";
  if (!rawExpected) {
    return {
      selection: "compatibility",
      expectedRelease: null,
      primaryMatches: false,
      fallbackMatches: false,
      reason: "expected_unset",
    };
  }

  const expectedRelease = normalizeReleaseSha(rawExpected);
  if (!expectedRelease) {
    return {
      selection: "degraded",
      expectedRelease: null,
      primaryMatches: false,
      fallbackMatches: false,
      reason: "expected_invalid",
    };
  }

  const primaryMatches = input.primary.ok && normalizeReleaseSha(input.primary.release) === expectedRelease;
  const fallbackMatches = input.fallback.ok && normalizeReleaseSha(input.fallback.release) === expectedRelease;

  if (primaryMatches) {
    return { selection: "primary", expectedRelease, primaryMatches, fallbackMatches, reason: "primary_match" };
  }
  if (fallbackMatches) {
    return { selection: "fallback", expectedRelease, primaryMatches, fallbackMatches, reason: "fallback_match" };
  }
  return { selection: "degraded", expectedRelease, primaryMatches, fallbackMatches, reason: "no_match" };
}
