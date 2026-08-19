import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Missing Supabase credentials required for storefront viewport coverage.");
}

type TemplateCase = {
  id: string;
  productVisibility: "catalog" | "menu" | "single_product" | "inquiry_only" | "landing_only";
  catalogLabel: string | null;
  mobileCartLabel: string | null;
};

const templateCases: TemplateCase[] = [
  { id: "blank", productVisibility: "catalog", catalogLabel: "Shop", mobileCartLabel: "Cart" },
  { id: "landing", productVisibility: "landing_only", catalogLabel: null, mobileCartLabel: null },
  { id: "beauty", productVisibility: "catalog", catalogLabel: "Shop", mobileCartLabel: "Cart" },
  { id: "fashion", productVisibility: "catalog", catalogLabel: "Shop", mobileCartLabel: "Cart" },
  { id: "electronics", productVisibility: "catalog", catalogLabel: "Shop", mobileCartLabel: "Cart" },
  { id: "food", productVisibility: "menu", catalogLabel: "Menu", mobileCartLabel: "Tray" },
  { id: "crafts", productVisibility: "catalog", catalogLabel: "Shop", mobileCartLabel: "Cart" },
  { id: "subscriptions", productVisibility: "catalog", catalogLabel: "Plans", mobileCartLabel: "Subscription" },
  { id: "digital-downloads", productVisibility: "catalog", catalogLabel: "Downloads", mobileCartLabel: "Cart" },
  { id: "single-product", productVisibility: "single_product", catalogLabel: null, mobileCartLabel: "Cart" },
  { id: "inquiry-catalog", productVisibility: "inquiry_only", catalogLabel: "Catalog", mobileCartLabel: "Quote" },
  { id: "service", productVisibility: "inquiry_only", catalogLabel: "Services", mobileCartLabel: "Request" },
  { id: "general-catalog", productVisibility: "catalog", catalogLabel: "Shop", mobileCartLabel: "Cart" },
  { id: "booking", productVisibility: "inquiry_only", catalogLabel: "Services", mobileCartLabel: "Booking" },
  { id: "hotel", productVisibility: "inquiry_only", catalogLabel: "Rooms", mobileCartLabel: "Stay" },
  { id: "real-estate", productVisibility: "inquiry_only", catalogLabel: "Properties", mobileCartLabel: "Inquiries" },
];

const viewportCases = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

async function loginMerchant(page: any, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByTestId("admin-login-email").fill(email);
  await page.getByTestId("admin-login-password").fill(password);
  await page.getByTestId("admin-login-submit").click();
  await expect.poll(async () => new URL(page.url()).pathname !== "/admin/login", { timeout: 15000 }).toBe(true);
}

async function createStoreThroughMerchantSignup(page: any, storeName: string, storeSlug: string) {
  await page.goto("/signup?entry=dashboard");
  await expect(page.getByTestId("merchant-signup-store-name")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("merchant-signup-store-name").fill(storeName);
  await page.getByTestId("merchant-signup-store-slug").fill(storeSlug);
  const nextButton = page.getByTestId("merchant-signup-next");
  await expect(nextButton).toBeEnabled({ timeout: 15000 });
  await nextButton.click();
  await expect(page.getByText("Choose template")).toBeVisible({ timeout: 15000 });

  const signupResponsePromise = page.waitForResponse(
    (response: any) => response.url().includes("/functions/v1/merchant-signup") && response.request().method() === "POST",
    { timeout: 30000 },
  );
  await page.getByTestId("merchant-signup-submit").click();
  const signupResponse = await signupResponsePromise;
  expect(signupResponse.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Launch successful" })).toBeVisible({ timeout: 30000 });

  const onboardingHref = await page.getByRole("link", { name: "Open Onboarding Wizard" }).getAttribute("href");
  expect(onboardingHref).toBeTruthy();
  const onboardingUrl = new URL(onboardingHref ?? "", "http://127.0.0.1:8080");
  const storeId = onboardingUrl.searchParams.get("storeId");
  expect(storeId).toBeTruthy();
  return storeId as string;
}

function seededProducts(storeId: string, suffix: string) {
  const images = [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1586363104862-3a5e222eca01?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?auto=format&fit=crop&q=80&w=800",
  ];

  return Array.from({ length: 6 }, (_, index) => ({
    store_id: storeId,
    name: `Viewport Item ${index + 1} ${suffix}`,
    description: `Deterministic storefront viewport fixture ${index + 1}.`,
    price: 900 + (index * 125),
    original_price: index % 2 === 0 ? 1400 + (index * 100) : null,
    image_url: images[index % images.length],
    images: [images[index % images.length]],
    category: index % 2 === 0 ? "Featured" : "Essentials",
    type: index % 2 === 0 ? "Primary" : "Secondary",
    sizes: ["Standard"],
    colors: ["Default"],
    featured: index < 4,
    badge: index === 0 ? "New" : null,
    stock: 20 + index,
    is_available: true,
  }));
}

async function assertNoHorizontalOverflow(page: any, templateId: string, viewportName: string) {
  const report = await page.evaluate(() => {
    const root = document.documentElement;
    const viewportWidth = root.clientWidth;
    const scrollWidth = Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0);
    const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          classes: typeof element.className === "string" ? element.className.slice(0, 160) : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.width > 0 && (item.right > viewportWidth + 1 || item.left < -1))
      .slice(0, 12);

    return { viewportWidth, scrollWidth, offenders };
  });

  expect(
    report.scrollWidth,
    `${templateId} ${viewportName} overflowed: viewport=${report.viewportWidth}, scroll=${report.scrollWidth}, offenders=${JSON.stringify(report.offenders)}`,
  ).toBeLessThanOrEqual(report.viewportWidth + 1);
}

test("all 16 storefront templates stay usable at mobile, tablet, and desktop widths", async ({ page }, testInfo) => {
  test.setTimeout(240000);

  const suffix = randomUUID().slice(0, 8);
  const email = `viewport-matrix-${suffix}@example.com`;
  const password = `Viewport-${suffix}-Pass123!`;
  const storeName = `Viewport Matrix ${suffix}`;
  const storeSlug = `viewport-matrix-${suffix}`;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const supabaseMerchant = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId: string | null = null;
  let storeId: string | null = null;

  try {
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createUserError || !createdUser.user) throw createUserError ?? new Error("Could not create viewport merchant");
    userId = createdUser.user.id;

    await loginMerchant(page, email, password);
    storeId = await createStoreThroughMerchantSignup(page, storeName, storeSlug);

    const [{ error: publishError }, { error: productError }, { error: navigationError }] = await Promise.all([
      supabaseAdmin.from("stores").update({ is_published: true }).eq("id", storeId),
      supabaseAdmin.from("products").insert(seededProducts(storeId, suffix)),
      supabaseAdmin.from("site_settings").upsert({
        store_id: storeId,
        key: "navigation",
        value: {},
      }, { onConflict: "store_id,key" }),
    ]);
    if (publishError) throw publishError;
    if (productError) throw productError;
    if (navigationError) throw navigationError;

    const { data: merchantSession, error: merchantSessionError } = await supabaseMerchant.auth.signInWithPassword({ email, password });
    if (merchantSessionError || !merchantSession.session?.access_token) {
      throw merchantSessionError ?? new Error("Could not create merchant cache-refresh session");
    }
    const accessToken = merchantSession.session.access_token;

    for (const template of templateCases) {
      const { error: profileError } = await supabaseAdmin.from("site_settings").upsert({
        store_id: storeId,
        key: "storefront_profile",
        value: {
          template_id: template.id,
          template_seed_id: template.id,
          product_visibility: template.productVisibility,
          checkout_mode: template.productVisibility === "inquiry_only" || template.productVisibility === "landing_only" ? "whatsapp" : "standard",
          hide_prices: template.productVisibility === "inquiry_only",
          allow_guest_checkout: true,
        },
      }, { onConflict: "store_id,key" });
      if (profileError) throw profileError;

      const revalidateResponse = await page.request.post("/api/cache/storefront/revalidate", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        data: {
          storeId,
          scope: "all",
          includeSearch: true,
          includeTaxonomy: true,
          pageSlugs: ["/"],
        },
      });
      expect(revalidateResponse.ok(), `cache refresh failed for ${template.id}: ${revalidateResponse.status()}`).toBeTruthy();

      for (const viewport of viewportCases) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`/stores/${storeSlug}?viewport-template=${template.id}-${viewport.name}`, { waitUntil: "domcontentloaded" });
        const shell = page.locator(`[data-storefront-template="${template.id}"]`);
        await expect(shell).toBeVisible({ timeout: 30000 });
        await page.waitForTimeout(250);

        if (viewport.width < 768) {
          const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
          await expect(mobileNavigation).toBeVisible();
          if (template.catalogLabel) {
            await expect(mobileNavigation.getByRole("link", { name: template.catalogLabel, exact: true })).toBeVisible();
          }
          if (template.mobileCartLabel) {
            await expect(mobileNavigation.getByRole("button", { name: template.mobileCartLabel, exact: true })).toBeVisible();
          } else {
            await expect(mobileNavigation.getByRole("button", { name: /Cart|Tray|Booking|Stay|Request|Quote|Inquiries|Subscription/ })).toHaveCount(0);
          }
          if (template.id === "landing") {
            await expect(mobileNavigation.getByRole("link", { name: "Contact", exact: true })).toBeVisible();
          }
        } else if (template.catalogLabel) {
          await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: template.catalogLabel, exact: true })).toBeVisible();
        }

        await assertNoHorizontalOverflow(page, template.id, viewport.name);
        await page.screenshot({
          path: testInfo.outputPath(`storefront-${template.id}-${viewport.name}-${viewport.width}.png`),
          fullPage: true,
        });
      }
    }
  } finally {
    await supabaseMerchant.auth.signOut().catch(() => undefined);
    if (storeId) await supabaseAdmin.from("stores").delete().eq("id", storeId);
    if (userId) await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
  }
});
