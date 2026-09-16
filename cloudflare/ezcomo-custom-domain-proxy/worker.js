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

function buildOriginRouterRequest(request, originalHostname, storeSlug, proxySecret) {
  const incomingUrl = new URL(request.url);
  const headers = new Headers(request.headers);

  headers.set("x-ezcomo-hostname", originalHostname);
  headers.set("x-ezcomo-store-slug", storeSlug);
  headers.set("x-forwarded-host", originalHostname);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

  if (proxySecret) {
    headers.set("x-ezcomo-proxy-secret", proxySecret);
  } else {
    headers.delete("x-ezcomo-proxy-secret");
  }
  headers.delete("host");

  const requestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
    requestInit.body = request.body;
  }

  // Keep the merchant hostname in the request URL. The Service Binding chooses
  // the downstream Worker independently of DNS, and the origin router uses the
  // URL hostname as the authoritative forwarded storefront hostname.
  return new Request(incomingUrl.toString(), requestInit);
}

export default {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);
    const originalHostname = normalizeHostname(incomingUrl.hostname);
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

    if (!env.ORIGIN_ROUTER || typeof env.ORIGIN_ROUTER.fetch !== "function") {
      return new Response("Origin router service binding is missing.", { status: 500 });
    }

    const storeRouteRaw = await env.DOMAIN_ROUTING_KV.get(buildRoutingKey(originalHostname), "json");
    const storeSlug = typeof storeRouteRaw?.storeSlug === "string"
      ? storeRouteRaw.storeSlug.trim().toLowerCase()
      : "";

    if (!storeSlug) {
      return notFoundResponse("This storefront domain is not active.");
    }

    const originRequest = buildOriginRouterRequest(
      request,
      originalHostname,
      storeSlug,
      env.PROXY_SECRET,
    );

    let upstreamResponse;

    try {
      upstreamResponse = await env.ORIGIN_ROUTER.fetch(originRequest);
    } catch (error) {
      console.error("Ezcomo origin router request failed:", error);
      return new Response("The Ezcomo storefront origin is unavailable.", {
        status: 502,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: new Headers(upstreamResponse.headers),
    });
  },
};
