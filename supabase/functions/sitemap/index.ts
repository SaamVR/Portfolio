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

  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/plans", priority: "0.8", changefreq: "monthly" },
    { loc: "/signup", priority: "0.8", changefreq: "monthly" },
    { loc: "/admin/login", priority: "0.3", changefreq: "monthly" },
  ];

  const urls = staticPages
    .map(
      (p) => `  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join("\n");

  const storeBaseUrl = (store: { slug: string; custom_domain?: string | null }) =>
    store.custom_domain ? `https://${store.custom_domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : `${SITE_URL}/stores/${store.slug}`;

  const storeUrls = (stores || [])
    .flatMap((store) => {
      const baseUrl = storeBaseUrl(store);
      const storePages = (pages || []).filter((page) => page.store_id === store.id);

      return [
        `  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`,
        ...storePages
          .filter((page) => page.slug !== "/")
          .map((page) => `  <url>
    <loc>${joinUrl(baseUrl, page.slug)}</loc>
    <lastmod>${page.updated_at ? page.updated_at.split("T")[0] : ""}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`),
      ];
    })
    .join("\n");

  const productUrls = (products || [])
    .map((p) => {
      const store = (stores || []).find((candidate) => candidate.id === p.store_id);
      if (!store) return "";
      const baseUrl = storeBaseUrl(store);
      const slug = slugify(p.name);
      const lastmod = p.updated_at ? p.updated_at.split("T")[0] : "";
      return `  <url>
    <loc>${joinUrl(baseUrl, `/product/${slug}-${p.id}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .filter(Boolean)
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
${storeUrls}
${productUrls}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
