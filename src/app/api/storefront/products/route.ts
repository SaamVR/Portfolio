import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { canAccessStorefrontStore } from "@/lib/cms/store-resolver";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseIds(value: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => uuidPattern.test(item));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId")?.trim() ?? "";
  const productId = url.searchParams.get("id")?.trim() ?? "";
  const ids = parseIds(url.searchParams.get("ids"));
  const featuredOnly = url.searchParams.get("featured") === "1";

  if (!uuidPattern.test(storeId)) {
    return NextResponse.json({ error: "Invalid store" }, { status: 400 });
  }

  if (productId && !uuidPattern.test(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const [{ data: store, error: storeError }, { data: subscription }] = await Promise.all([
      supabaseAdmin
        .from("stores")
        .select("id, is_published")
        .eq("id", storeId)
        .maybeSingle(),
      supabaseAdmin
        .from("store_subscriptions")
        .select("status, trial_ends_at")
        .eq("store_id", storeId)
        .maybeSingle(),
    ]);

    if (storeError) throw storeError;

    if (!canAccessStorefrontStore(store, subscription ?? null)) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    let query = supabaseAdmin
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .eq("is_available", true)
      .order("created_at", { ascending: false });

    if (featuredOnly) {
      query = query.eq("featured", true);
    }

    if (productId) {
      query = query.eq("id", productId).limit(1);
    } else if (ids.length > 0) {
      query = query.in("id", ids);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Public storefront products error:", error);
    return NextResponse.json({ error: "Failed to load storefront products" }, { status: 500 });
  }
}
