import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SITE_URL = (Deno.env.get("CMS_PUBLIC_URL") || Deno.env.get("SITE_URL") || "https://commerce-engine.local").replace(/\/$/, "");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function joinUrl(base: string, path: string) {
  const normalizedBase = base.replace(/\/$/, "");
  if (!path || path === "/") return normalizedBase;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const nowIso = new Date().toISOString();

  const { data: stores } = await supabase
    .from("stores")
    .select("id, slug, custom_domain, updated_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  const { data: pages } = await supabase
    .from("store_pages")
    .select("store_id, slug, updated_at")
    .order("updated_at", { ascending: false });

  const { data: products } = await supabase
    .from("products")
    .select("id, store_id, name, updated_at")
    .eq("is_available", true)
    .order("updated_at", { ascending: false });

  const { data: blogSettingsRows } = await supabase
    .from("site_settings")
    .select("store_id, value")
    .eq("key", "blog");

  const { data: blogPosts } = await supabase
    .from("blog_posts")
    .select("store_id, slug, updated_at, noindex")
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
    .eq("noindex", false)
    .order("updated_at", { ascending: false });

  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/plans", priority: "0.8", changefreq: "monthly" },
    { loc: "/signup", priority: "0.8", changefreq: "monthly" },
    { loc: "/admin/login", priority: "0.3", changefreq: "monthly" },
  ];

  const urls = staticPages
    .map(
      (p) => `  <url>\n    <loc>${SITE_URL}${p.loc}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
    )
    .join("\n");

  const storeBaseUrl = (store: { slug: string; custom_domain?: string | null }) =>
    store.custom_domain
      ? `https://${store.custom_domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
      : `${SITE_URL}/stores/${store.slug}`;

  const isBlogEnabled = (storeId: string) => {
    const row = (blogSettingsRows || []).find((candidate) => candidate.store_id === storeId);
    const value = row?.value;
    return !(value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>).enabled === false);
  };

  const storeUrls = (stores || [])
    .flatMap((store) => {
      const baseUrl = storeBaseUrl(store);
      const storePages = (pages || []).filter((page) => page.store_id === store.id);
      const blogEnabled = isBlogEnabled(store.id);
      const latestBlogUpdate = (blogPosts || []).find((post) => post.store_id === store.id)?.updated_at;

      return [
        `  <url>\n    <loc>${baseUrl}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`,
        ...storePages
          .filter((page) => page.slug !== "/" && page.slug !== "/blog")
          .map((page) => `  <url>\n    <loc>${joinUrl(baseUrl, page.slug)}</loc>\n    <lastmod>${page.updated_at ? page.updated_at.split("T")[0] : ""}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`),
        ...(blogEnabled
          ? [`  <url>\n    <loc>${joinUrl(baseUrl, "/blog")}</loc>\n    <lastmod>${latestBlogUpdate ? latestBlogUpdate.split("T")[0] : (store.updated_at ? store.updated_at.split("T")[0] : "")}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`]
          : []),
      ];
    })
    .join("\n");

  const productUrls = (products || [])
    .map((product) => {
      const store = (stores || []).find((candidate) => candidate.id === product.store_id);
      if (!store) return "";
      const baseUrl = storeBaseUrl(store);
      const slug = slugify(product.name);
      const lastmod = product.updated_at ? product.updated_at.split("T")[0] : "";
      return `  <url>\n    <loc>${joinUrl(baseUrl, `/product/${slug}--${product.id}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    })
    .filter(Boolean)
    .join("\n");

  const blogUrls = (blogPosts || [])
    .map((post) => {
      const store = (stores || []).find((candidate) => candidate.id === post.store_id);
      if (!store || !isBlogEnabled(store.id)) return "";
      const baseUrl = storeBaseUrl(store);
      const lastmod = post.updated_at ? post.updated_at.split("T")[0] : "";
      return `  <url>\n    <loc>${joinUrl(baseUrl, `/blog/${encodeURIComponent(post.slug)}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
    })
    .filter(Boolean)
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n${storeUrls}\n${productUrls}\n${blogUrls}\n</urlset>`;

  return new Response(sitemap, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
