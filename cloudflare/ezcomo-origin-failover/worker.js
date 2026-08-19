const DEFAULT_PRIMARY_ORIGIN_HOSTNAME = "ecomcms-xjw4.onrender.com";
const DEFAULT_PLATFORM_DOMAIN = "ezcomo.shop";
const DEFAULT_FAILOVER_TTL_SECONDS = 30;
const PRIMARY_DOWN_CACHE_KEY = "https://ezcomo-failover-state.invalid/render-primary-down";
const SAFE_RETRY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const FAILOVER_HTTP_STATUSES = new Set([
  502,
  503,
  504,
  521,
  522,
  523,
  524,
  525,
  526,
  530,
]);
const RESERVED_PLATFORM_LABELS = new Set([
  "origin",
  "customers",
  "mcp",
]);

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

  if (env.LB_PROXY_SECRET) {
    headers.set("x-ezcomo-lb-secret", env.LB_PROXY_SECRET);
  } else {
    headers.delete("x-ezcomo-lb-secret");
  }

  // The URL hostname controls Host/SNI for both Render and Vercel. Preserve
  // the shopper/merchant hostname only in trusted forwarding headers.
  headers.delete("host");

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  return {
    originUrl,
    request: new Request(originUrl.toString(), init),
  };
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
      new Response("down", {
        headers: {
          "cache-control": `public, max-age=${ttlSeconds}`,
        },
      }),
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

async function fetchFallback(request, env, originalHostname) {
  const fallbackOriginHostname = normalizeHostname(env.FALLBACK_ORIGIN_HOSTNAME);

  // Backward-compatible safety while the new Vercel project is being repaired:
  // if no explicit fallback hostname is configured, continue to the DNS origin
  // instead of guessing a stale Vercel deployment hostname in code.
  if (!fallbackOriginHostname) {
    try {
      const response = await fetch(request);
      return withOriginDebugHeader(response, "dns-fallback", env);
    } catch (error) {
      console.error("Ezcomo DNS fallback request failed:", error);
      return new Response("The Ezcomo platform origins are unavailable.", {
        status: 502,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
  }

  const incomingUrl = new URL(request.url);
  const { request: fallbackRequest } = buildOriginRequest(
    request,
    env,
    originalHostname,
    fallbackOriginHostname,
  );

  try {
    const response = await fetch(fallbackRequest);
    const rewritten = rewriteOriginRedirect(
      response,
      fallbackOriginHostname,
      originalHostname,
      incomingUrl.protocol,
    );
    return withOriginDebugHeader(rewritten, "vercel", env);
  } catch (error) {
    console.error("Ezcomo explicit fallback origin request failed:", error);
    return new Response("The Ezcomo platform origins are unavailable.", {
      status: 502,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const incomingUrl = new URL(request.url);
    const originalHostname = normalizeHostname(incomingUrl.hostname);
    const platformDomain = normalizeHostname(env.PLATFORM_DOMAIN || DEFAULT_PLATFORM_DOMAIN);
    const failoverTtlSeconds = parsePositiveInt(
      env.FAILOVER_TTL_SECONDS,
      DEFAULT_FAILOVER_TTL_SECONDS,
    );

    // Internal/reserved platform endpoints keep using their existing origin behavior.
    if (shouldBypassFailover(originalHostname, platformDomain)) {
      return fetch(request);
    }

    if (!env.LB_PROXY_SECRET) {
      console.error("LB_PROXY_SECRET is missing from ezcomo-origin-failover.");
      return new Response("Platform proxy configuration is incomplete.", {
        status: 503,
        headers: { "cache-control": "no-store" },
      });
    }

    if (await isPrimaryMarkedDown()) {
      return fetchFallback(request, env, originalHostname);
    }

    const primaryOriginHostname = normalizeHostname(
      env.PRIMARY_ORIGIN_HOSTNAME || DEFAULT_PRIMARY_ORIGIN_HOSTNAME,
    );
    const { request: primaryRequest } = buildOriginRequest(
      request,
      env,
      originalHostname,
      primaryOriginHostname,
    );

    let primaryResponse;
    try {
      primaryResponse = await fetch(primaryRequest);
    } catch (error) {
      console.error("Ezcomo Render primary request failed:", error);
      ctx.waitUntil(markPrimaryDown(failoverTtlSeconds));

      if (isSafeRetryMethod(request.method)) {
        return fetchFallback(request, env, originalHostname);
      }

      // Never replay mutation requests automatically. The origin may have
      // committed an order/payment before the connection failed.
      return new Response("The platform origin is temporarily unavailable.", {
        status: 502,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    if (shouldFailOverStatus(primaryResponse.status)) {
      ctx.waitUntil(markPrimaryDown(failoverTtlSeconds));

      if (isSafeRetryMethod(request.method)) {
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
