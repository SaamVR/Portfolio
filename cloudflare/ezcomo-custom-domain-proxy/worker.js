const DEFAULT_ORIGIN_HOSTNAME = "origin.ezcomo.shop";
const DEFAULT_PLATFORM_DOMAIN = "ezcomo.shop";

function normalizeHostname(hostname) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function buildRoutingKey(hostname) {
  return `domain:${normalizeHostname(hostname)}`;
}

function isEzcomoHostname(hostname, platformDomain) {
  return hostname === platformDomain || hostname.endsWith(`.${platformDomain}`);
}

function notFoundResponse(message) {
  return new Response(message, {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=30",
    },
  });
}

export default {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);
    const originalHostname = normalizeHostname(incomingUrl.hostname);
    const originHostname = normalizeHostname(env.ORIGIN_HOSTNAME || DEFAULT_ORIGIN_HOSTNAME);
    const platformDomain = normalizeHostname(env.PLATFORM_DOMAIN || DEFAULT_PLATFORM_DOMAIN);

    if (isEzcomoHostname(originalHostname, platformDomain)) {
      return new Response(
        "Ezcomo Worker route configuration error: platform hostname reached the custom-domain proxy.",
        {
          status: 500,
          headers: {
            "content-type": "text/plain; charset=utf-8",
          },
        },
      );
    }

    if (!env.DOMAIN_ROUTING_KV) {
      return new Response("Worker KV binding is missing.", { status: 500 });
    }

    const storeRouteRaw = await env.DOMAIN_ROUTING_KV.get(buildRoutingKey(originalHostname), "json");
    const storeSlug = typeof storeRouteRaw?.storeSlug === "string"
      ? storeRouteRaw.storeSlug.trim().toLowerCase()
      : "";

    if (!storeSlug) {
      return notFoundResponse("This storefront domain is not active.");
    }

    const originUrl = new URL(request.url);
    originUrl.protocol = "https:";
    originUrl.hostname = originHostname;
    originUrl.port = "";

    const headers = new Headers(request.headers);
    headers.set("x-ezcomo-hostname", originalHostname);
    headers.set("x-ezcomo-store-slug", storeSlug);
    headers.set("x-forwarded-host", originalHostname);
    headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

    if (env.PROXY_SECRET) {
      headers.set("x-ezcomo-proxy-secret", env.PROXY_SECRET);
    } else {
      headers.delete("x-ezcomo-proxy-secret");
    }
    headers.delete("host");

    const requestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      requestInit.body = request.body;
    }

    let upstreamResponse;

    try {
      upstreamResponse = await fetch(originUrl.toString(), requestInit);
    } catch (error) {
      console.error("Ezcomo origin request failed:", error);
      return new Response("The Ezcomo storefront origin is unavailable.", {
        status: 502,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }

    const responseHeaders = new Headers(upstreamResponse.headers);
    const location = responseHeaders.get("location");

    if (location) {
      try {
        const redirectUrl = new URL(location, originUrl);

        if (redirectUrl.hostname === originHostname) {
          redirectUrl.hostname = originalHostname;
          redirectUrl.protocol = incomingUrl.protocol;
          responseHeaders.set("location", redirectUrl.toString());
        }
      } catch {
        // Leave malformed or relative Location headers unchanged.
      }
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};
