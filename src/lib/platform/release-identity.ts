const FULL_GIT_SHA = /^[0-9a-f]{40}$/i;

type ReleaseEnvironment = {
  VERCEL_GIT_COMMIT_SHA?: string;
  RENDER_GIT_COMMIT?: string;
  EZCOMO_RELEASE_SHA?: string;
};

export function normalizeReleaseSha(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return FULL_GIT_SHA.test(normalized) ? normalized : null;
}

export function resolveReleaseIdentity(
  env: ReleaseEnvironment = process.env as ReleaseEnvironment,
) {
  const rawRelease = env.VERCEL_GIT_COMMIT_SHA
    ?? env.RENDER_GIT_COMMIT
    ?? env.EZCOMO_RELEASE_SHA
    ?? null;
  return normalizeReleaseSha(rawRelease);
}
