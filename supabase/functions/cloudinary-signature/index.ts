import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sanitizeFolderSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9/_-]/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+|-+$/g, "");
}

// Generate SHA-1 signature for Cloudinary signed uploads
async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated and is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Check role and store access using a service role client.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { folder = "products", resource_type = "image", store_id } = await req.json();
    const normalizedFolder = sanitizeFolderSegment(folder || "products") || "products";

    let targetStoreId = typeof store_id === "string" && store_id ? store_id : null;
    if (!targetStoreId) {
      const { data: firstMembership } = await (supabaseAdmin as any)
        .from("store_memberships")
        .select("store_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      targetStoreId = firstMembership?.store_id ?? null;
    }

    if (!targetStoreId) {
      return new Response(JSON.stringify({ error: "No store workspace found for upload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: roleData }, { data: membership }, { data: store }] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle(),
      (supabaseAdmin as any)
        .from("store_memberships")
        .select("role")
        .eq("user_id", userId)
        .eq("store_id", targetStoreId)
        .maybeSingle(),
      (supabaseAdmin as any)
        .from("stores")
        .select("slug")
        .eq("id", targetStoreId)
        .maybeSingle(),
    ]);

    const isPlatformAdmin = Boolean(roleData && roleData.role === "admin");
    const storeRole = typeof membership?.role === "string" ? membership.role : null;
    const canManageStore = isPlatformAdmin || ["owner", "admin", "editor"].includes(storeRole ?? "");

    if (!canManageStore) {
      return new Response(JSON.stringify({ error: "Store admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storeSlug = sanitizeFolderSegment(store?.slug || targetStoreId);
    const tenantFolder = `stores/${storeSlug}/${normalizedFolder}`;

    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: "Cloudinary credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = `folder=${tenantFolder}&timestamp=${timestamp}`;
    const signature = await sha1(paramsToSign + apiSecret);

    return new Response(
      JSON.stringify({
        signature,
        timestamp,
        cloud_name: cloudName,
        api_key: apiKey,
        folder: tenantFolder,
        store_id: targetStoreId,
        resource_type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Cloudinary signature error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
