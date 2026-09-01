import { normalizeReleaseSha, selectReleaseOrigin } from "./release-policy.ts";

const DEFAULT_PRIMARY_ORIGIN_HOSTNAME = "ecomcms-xjw4.onrender.com";
const DEFAULT_PLATFORM_DOMAIN = "ezcomo.shop";
const DEFAULT_FAILOVER_TTL_SECONDS = 30;
const DEFAULT_RELEASE_PROBE_TTL_SECONDS = 15;
const PRIMARY_DOWN_CACHE_KEY = "https://ezcomo-failover-state.invalid/render-primary-down";
const RELEASE_PROBE_CACHE_PREFIX = "https://ezcomo-release-probe.invalid/";
const SAFE_RETRY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const FAILOVER_HTTP_STATUSES = new Set([502, 503, 504, 521, 522, 523, 524, 525, 526, 530]);
const RESERVED_PLATFORM_LABELS = new Set(["origin", "customers", "mcp"]);

function normalizeHostname(hostname) {
  return String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getPlatformLabel(hostname, platformDomain) {
  const suffix = `.${platformDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const label = hostname.slice(0, -suffix.length);
  if (!label || label.includes(".")) return null;
  return label;
}

function shouldBypassFailover(hostname, platformDomain) {
  if (hostname === platformDomain) return false;
  const label = getPlatformLabel(hostname, platformDomain);
  if (!label) return true;
  return RESERVED_PLATFORM_LABELS.has(label);
}

function isSafeRetryMethod(method) {
  return SAFE_RETRY_METHODS.has(method.toUpperCase());
}

function shouldFailOverStatus(status) {
  return FAILOVER_HTTP_STATUSES.has(status);
}

function buildOriginRequest(request, env, originalHostname, originHostname) {
  const incomingUrl = new URL(request.url);
  const originUrl = new URL(request.url);
  originUrl.protocol = "https:";
  originUrl.hostname = originHostname;
  originUrl.port = "";

  const headers = new Headers(request.headers);
  headers.set("x-ezcomo-hostname", originalHostname);
  headers.set("x-forwarded-host", originalHostname);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));
  if (env.LB_PROXY_SECRET) headers.set("x-ezcomo-lb-secret", env.LB_PROXY_SECRET);
  else headers.delete("x-ezcomo-lb-secret");
  headers.delete("host");

  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD" && request.body) init.body = request.body;

  return { originUrl, request: new Request(originUrl.toString(), init) };
}

function rewriteOriginRedirect(response, originHostname, originalHostname, incomingProtocol) {
  const responseHeaders = new Headers(response.headers);
  const location = responseHeaders.get("location");
  if (location) {
    try {
      const redirectUrl = new URL(location);
      if (normalizeHostname(redirectUrl.hostname) === originHostname) {
        redirectUrl.hostname = originalHostname;
        redirectUrl.protocol = incomingProtocol;
        responseHeaders.set("location", redirectUrl.toString());
      }
    } catch {
      // Keep malformed or relative redirects unchanged.
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

async function isPrimaryMarkedDown() {
  try {
    return Boolean(await caches.default.match(PRIMARY_DOWN_CACHE_KEY));
  } catch (error) {
    console.warn("Ezcomo failover state read failed:", error);
    return false;
  }
}

async function markPrimaryDown(ttlSeconds) {
  try {
    await caches.default.put(
      PRIMARY_DOWN_CACHE_KEY,
      new Response("down", { headers: { "cache-control": `public, max-age=${ttlSeconds}` } }),
    );
  } catch (error) {
    console.warn("Ezcomo failover state write failed:", error);
  }
}

function withOriginDebugHeader(response, origin, env) {
  if (env.DEBUG_ORIGIN_HEADER !== "1") return response;
  const headers = new Headers(response.headers);
  headers.set("x-ezcomo-origin", origin);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function releaseProbeCacheKey(originHostname) {
  return `${RELEASE_PROBE_CACHE_PREFIX}${encodeURIComponent(originHostname)}`;
}

async function readCachedReleaseProbe(originHostname) {
  try {
    const cached = await caches.default.match(releaseProbeCacheKey(originHostname));
    if (!cached) return null;
    const data = await cached.json();
    return {
      ok: data?.ok === true,
      release: normalizeReleaseSha(data?.release),
    };
  } catch (error) {
    console.warn("Ezcomo release probe cache read failed:", error);
    return null;
  }
}

async function writeCachedReleaseProbe(originHostname, probe, ttlSeconds) {
  try {
    await caches.default.put(
      releaseProbeCacheKey(originHostname),
      new Response(JSON.stringify(probe), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": `public, max-age=${ttlSeconds}`,
        },
      }),
    );
  } catch (error) {
    console.warn("Ezcomo release probe cache write failed:", error);
  }
}

async function probeOriginRelease(originHostname, ttlSeconds) {
  if (!originHostname) return { ok: false, release: null };
  const cached = await readCachedReleaseProbe(originHostname);
  if (cached) return cached;

  let probe = { ok: false, release: null };
  try {
    const response = await fetch(`https://${originHostname}/api/health`, {
      method: "GET",
      headers: { accept: "application/json" },
      redirect: "manual",
    });
    if (response.ok) {
      const data = await response.json();
      probe = {
        ok: data?.status === "ok",
        release: normalizeReleaseSha(data?.release),
      };
    }
  } catch (error) {
    console.warn(`Ezcomo release probe failed for ${originHostname}:`, error);
  }
  await writeCachedReleaseProbe(originHostname, probe, ttlSeconds);
  return probe;
}

async function resolveReleaseRouting(env) {
  const rawExpectedRelease = String(env.EXPECTED_RELEASE_SHA ?? "").trim();
  if (!rawExpectedRelease) {
    return selectReleaseOrigin({
      expectedRelease: "",
      primary: { ok: false, release: null },
      fallback: { ok: false, release: null },
    });
  }

  if (!normalizeReleaseSha(rawExpectedRelease)) {
    return selectReleaseOrigin({
      expectedRelease: rawExpectedRelease,
      primary: { ok: false, release: null },
      fallback: { ok: false, release: null },
    });
  }

  const primaryOriginHostname = normalizeHostname(env.PRIMARY_ORIGIN_HOSTNAME || DEFAULT_PRIMARY_ORIGIN_HOSTNAME);
  const fallbackOriginHostname = normalizeHostname(env.FALLBACK_ORIGIN_HOSTNAME);
  const releaseProbeTtlSeconds = parsePositiveInt(
    env.RELEASE_PROBE_TTL_SECONDS,
    DEFAULT_RELEASE_PROBE_TTL_SECONDS,
  );
  const [primary, fallback] = await Promise.all([
    probeOriginRelease(primaryOriginHostname, releaseProbeTtlSeconds),
    fallbackOriginHostname
      ? probeOriginRelease(fallbackOriginHostname, releaseProbeTtlSeconds)
      : Promise.resolve({ ok: false, release: null }),
  ]);
  return selectReleaseOrigin({ expectedRelease: rawExpectedRelease, primary, fallback });
}

function releaseDegradedResponse(reason) {
  return new Response("The Ezcomo platform release is temporarily unavailable.", {
    status: 503,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-ezcomo-release-state": "degraded",
      "x-ezcomo-release-reason": reason,
    },
  });
}

async function fetchFallback(request, env, originalHostname) {
  const fallbackOriginHostname = normalizeHostname(env.FALLBACK_ORIGIN_HOSTNAME);
  if (!fallbackOriginHostname) {
    try {
      const response = await fetch(request);
      return withOriginDebugHeader(response, "dns-fallback", env);
    } catch (error) {
      console.error("Ezcomo DNS fallback request failed:", error);
      return new Response("The Ezcomo platform origins are unavailable.", {
        status: 502,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }
  }

  const incomingUrl = new URL(request.url);
  const { request: fallbackRequest } = buildOriginRequest(request, env, originalHostname, fallbackOriginHostname);
  try {
    const response = await fetch(fallbackRequest);
    const rewritten = rewriteOriginRedirect(response, fallbackOriginHostname, originalHostname, incomingUrl.protocol);
    return withOriginDebugHeader(rewritten, "vercel", env);
  } catch (error) {
    console.error("Ezcomo explicit fallback origin request failed:", error);
    return new Response("The Ezcomo platform origins are unavailable.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const incomingUrl = new URL(request.url);
    const originalHostname = normalizeHostname(incomingUrl.hostname);
    const platformDomain = normalizeHostname(env.PLATFORM_DOMAIN || DEFAULT_PLATFORM_DOMAIN);
    const failoverTtlSeconds = parsePositiveInt(env.FAILOVER_TTL_SECONDS, DEFAULT_FAILOVER_TTL_SECONDS);

    if (shouldBypassFailover(originalHostname, platformDomain)) return fetch(request);

    if (!env.LB_PROXY_SECRET) {
      console.error("LB_PROXY_SECRET is missing from ezcomo-origin-failover.");
      return new Response("Platform proxy configuration is incomplete.", {
        status: 503,
        headers: { "cache-control": "no-store" },
      });
    }

    const releaseRouting = await resolveReleaseRouting(env);
    if (releaseRouting.selection === "degraded") return releaseDegradedResponse(releaseRouting.reason);
    if (releaseRouting.selection === "fallback") {
      // Release-aware preselection sends the shopper mutation once to the
      // already-proven fallback. This is selection, not a replay.
      return fetchFallback(request, env, originalHostname);
    }

    // Compatibility mode preserves the existing short primary-down cache.
    // A proven release-aware primary ignores a stale transport-down marker.
    if (releaseRouting.selection === "compatibility" && await isPrimaryMarkedDown()) {
      return fetchFallback(request, env, originalHostname);
    }

    const primaryOriginHostname = normalizeHostname(env.PRIMARY_ORIGIN_HOSTNAME || DEFAULT_PRIMARY_ORIGIN_HOSTNAME);
    const { request: primaryRequest } = buildOriginRequest(request, env, originalHostname, primaryOriginHostname);

    let primaryResponse;
    try {
      primaryResponse = await fetch(primaryRequest);
    } catch (error) {
      console.error("Ezcomo Render primary request failed:", error);
      ctx.waitUntil(markPrimaryDown(failoverTtlSeconds));

      if (isSafeRetryMethod(request.method)
        && (releaseRouting.selection === "compatibility" || releaseRouting.fallbackMatches)) {
        return fetchFallback(request, env, originalHostname);
      }

      // Never replay mutation requests automatically. The origin may have
      // committed an order/payment before the connection failed.
      return new Response("The platform origin is temporarily unavailable.", {
        status: 502,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }

    if (shouldFailOverStatus(primaryResponse.status)) {
      ctx.waitUntil(markPrimaryDown(failoverTtlSeconds));
      if (isSafeRetryMethod(request.method)
        && (releaseRouting.selection === "compatibility" || releaseRouting.fallbackMatches)) {
        try {
          await primaryResponse.body?.cancel();
        } catch {
          // Response cleanup is best-effort.
        }
        return fetchFallback(request, env, originalHostname);
      }
    }

    const rewritten = rewriteOriginRedirect(
      primaryResponse,
      primaryOriginHostname,
      originalHostname,
      incomingUrl.protocol,
    );
    return withOriginDebugHeader(rewritten, "render", env);
  },
};
