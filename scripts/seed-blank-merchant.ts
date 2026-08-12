import fs from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { persistStorefrontState } from "@/lib/cms/store-persistence";
import { buildTemplateCatalogSeedRows } from "@/lib/cms/template-demo-seeds";
import { instantiateStorePagesFromTemplate } from "@/lib/cms/template-pages";
import {
  buildStorefrontTemplateSiteSettingsEntries,
  resolveStorefrontTemplateProfile,
} from "@/lib/cms/storefront-templates";
import { loadThemePackages } from "@/lib/theme-packages";
import type { Json } from "@/integrations/supabase/types";
import type { Store } from "@/lib/cms/schema";

function readEnvFile(path: string) {
  const raw = fs.readFileSync(path, "utf8");
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        let value = line.slice(index + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        return [key, value];
      }),
  );
}

async function saveStoreScopedSiteSettings(
  client: ReturnType<typeof createClient>,
  storeId: string,
  entries: Array<{ key: string; value: Json }>,
) {
  if (entries.length === 0) return;

  const uniqueEntries = Array.from(new Map(entries.map((entry) => [entry.key, entry])).values());
  const keys = uniqueEntries.map((entry) => entry.key);
  const { data: existingRows, error: existingRowsError } = await client
    .from("site_settings")
    .select("id, key")
    .eq("store_id", storeId)
    .in("key", keys);

  if (existingRowsError) {
    throw existingRowsError;
  }

  const existingKeys = new Set(((existingRows ?? []) as Array<{ key: string }>).map((row) => row.key));

  for (const row of uniqueEntries.filter((entry) => existingKeys.has(entry.key))) {
    const { error } = await client
      .from("site_settings")
      .update({ value: row.value })
      .eq("store_id", storeId)
      .eq("key", row.key);
    if (error) throw error;
  }

  const rowsToInsert = uniqueEntries
    .filter((entry) => !existingKeys.has(entry.key))
    .map((entry) => ({
      store_id: storeId,
      key: entry.key,
      value: entry.value,
    }));

  if (rowsToInsert.length > 0) {
    const { error } = await client.from("site_settings").insert(rowsToInsert);
    if (error) throw error;
  }
}

async function main() {
  const env = readEnvFile(".env.local");
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase credentials in .env.local");
  }

  const suffix = crypto.randomBytes(3).toString("hex");
  const email = `codex.blank.${suffix}@example.com`;
  const password = `Codex!${suffix}Pass123`;
  const storeId = crypto.randomUUID();
  const slug = `codex-blank-${suffix}`;
  const name = `Codex Blank ${suffix.toUpperCase()}`;

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const templateProfile = resolveStorefrontTemplateProfile("blank", { templateSeedId: "blank" });
  const starterBlockSelections = ["promo-banner", "trust-badges", "faq-accordion"];
  const starterVariantSelections = {
    hero: "full-bleed",
    "promo-banner": "split-highlight",
    "trust-badges": "icon-grid",
    "faq-accordion": "two-column",
  } as Record<string, string>;

  const authUser = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Codex Blank Merchant" },
  });

  if (authUser.error || !authUser.data.user) {
    throw authUser.error ?? new Error("Failed to create auth user");
  }

  const ownerId = authUser.data.user.id;
  const themePackages = await loadThemePackages(serviceClient as any);
  const themePackageRow = themePackages.find((pkg) => pkg.presetId === templateProfile.seedDefinition.defaultTheme.presetId)
    ?? themePackages[0];

  const pages = instantiateStorePagesFromTemplate(templateProfile, { templateSeedId: "blank" });

  const store: Store = {
    id: storeId,
    name,
    slug,
    description: "Disposable merchant store for authenticated blank-template verification.",
    currencyCode: "BDT",
    locale: "en-BD",
    isPublished: false,
    theme: {
      ...templateProfile.seedDefinition.defaultTheme,
      themePackageId: themePackageRow?.id ?? undefined,
      customCssVars: {
        ...(templateProfile.seedDefinition.defaultTheme.customCssVars ?? {}),
      },
    },
    pages,
  };

  const persistResult = await persistStorefrontState({
    client: serviceClient as any,
    store,
    ownerId,
    templateSeed: templateProfile.seedDefinition,
    themePackages,
  });

  if (persistResult.error) {
    throw persistResult.error;
  }

  const trialEndsAt = new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)).toISOString();

  const membershipResult = await serviceClient.from("store_memberships").insert({
    store_id: storeId,
    user_id: ownerId,
    role: "owner",
    invited_by: ownerId,
  });
  if (membershipResult.error) throw membershipResult.error;

  const subscriptionResult = await serviceClient.from("store_subscriptions").insert({
    store_id: storeId,
    plan_id: "free",
    status: "active",
    trial_ends_at: trialEndsAt,
  });
  if (subscriptionResult.error) throw subscriptionResult.error;

  const storefrontProfile = {
    ...((templateProfile.seedDefinition.defaultSiteSettings.storefront_profile as Record<string, unknown> | undefined) ?? {}),
    template_id: "blank",
    onboarding_mode: "blank",
    blank_business_family: "commerce",
    starter_block_selections: starterBlockSelections,
    starter_variant_selections: starterVariantSelections,
  } as Json;

  const siteSettingsEntries = buildStorefrontTemplateSiteSettingsEntries(templateProfile.seedDefinition, {
    storefront_profile: storefrontProfile,
    homepage_section_visibility: {
      "promo-banner": true,
      "category-showcase": false,
      "comparison": false,
      "social-feed": false,
      "video-reel": false,
      "faq-accordion": true,
      "trust-badges": true,
      testimonials: false,
      "recommended-products": false,
      "recently-viewed": false,
      "rich-text": false,
    } as Json,
    contact_page: {
      badge: "Support",
      title: "Talk to our team",
      description: "Use this seeded merchant for authenticated blank-template verification.",
      address: "Dhaka, Bangladesh",
      phone: "+8801700000000",
      email: email,
      whatsapp: "+8801700000000",
      form_button_label: "Send message",
      response_time_label: "Reply time",
      response_time_text: "Usually within a few hours",
      map_enabled: false,
      map_embed_url: "",
    } as Json,
    delivery_settings: {
      enabled: true,
      primary_zone_label: "Inside Dhaka",
      secondary_zone_label: "Outside Dhaka",
      delivery_fee: 80,
      delivery_fee_outside: 140,
      free_threshold: 2000,
    } as Json,
    whatsapp_support: {
      enabled: true,
      number: "+8801700000000",
      message: "Hi, I need help with my order.",
    } as Json,
    faq_entries: [
      { q: "Can I edit these sections later?", a: "Yes, blank-template sections can be updated from onboarding and the shared style studio." },
      { q: "Do core sections stay on?", a: "Navbar, hero, main selling section, and footer stay available by default." },
    ] as Json,
    onboarding_status: {
      completed: false,
      completed_at: null,
      completed_via: "seed",
    } as Json,
  });

  await saveStoreScopedSiteSettings(
    serviceClient,
    storeId,
    siteSettingsEntries.map((entry) => ({ key: entry.key, value: entry.value })),
  );

  const catalogSeed = buildTemplateCatalogSeedRows(storeId, "general-catalog");
  const categoryRows = catalogSeed.categoryRows.slice(0, 2).map((row) => ({
    ...row,
    id: crypto.randomUUID(),
  }));
  const productTypeRows = catalogSeed.productTypeRows.slice(0, 2);
  const productRows = catalogSeed.productRows.slice(0, 4).map((row) => {
    const { type_metric_schema: _typeMetricSchema, ...rest } = row as typeof row & { type_metric_schema?: unknown };
    return {
      ...rest,
      id: crypto.randomUUID(),
    };
  });

  if (categoryRows.length > 0) {
    const { error } = await serviceClient.from("product_categories").insert(categoryRows);
    if (error) throw error;
  }

  if (productTypeRows.length > 0) {
    const { error } = await serviceClient.from("product_types").insert(productTypeRows as any);
    if (error) throw error;
  }

  if (productRows.length > 0) {
    const { error } = await serviceClient.from("products").insert(productRows as any);
    if (error) throw error;
  }

  console.log(JSON.stringify({
    email,
    password,
    storeId,
    slug,
    ownerId,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
