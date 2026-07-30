import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.",
  );
}

async function createPreviewUsers(
  supabaseAdmin: ReturnType<typeof createClient>,
  suffix: string,
) {
  const email = `preview-smoke-${suffix}@example.com`;
  const password = `Preview-${suffix}-Pass123!`;
  const adminEmail = `preview-smoke-admin-${suffix}@example.com`;
  const adminPassword = `Preview-Admin-${suffix}-Pass123!`;

  const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createUserError || !createdUser.user) {
    throw createUserError ?? new Error("Failed to create preview smoke user");
  }

  const { data: createdAdminUser, error: createAdminUserError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (createAdminUserError || !createdAdminUser.user) {
    throw createAdminUserError ?? new Error("Failed to create preview smoke admin user");
  }

  const { error: adminRoleError } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: createdAdminUser.user.id, role: "admin" });
  if (adminRoleError) throw adminRoleError;

  return {
    email,
    password,
    adminEmail,
    adminPassword,
    userId: createdUser.user.id,
    adminUserId: createdAdminUser.user.id,
  };
}

async function loginAs(page: Parameters<typeof test>[0]["page"], email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByTestId("admin-login-email").fill(email);
  await page.getByTestId("admin-login-password").fill(password);
  await page.getByTestId("admin-login-submit").click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible({ timeout: 15000 });
}

async function signupPreviewStore(
  page: Parameters<typeof test>[0]["page"],
  ownerName: string,
  storeName: string,
  storeSlug: string,
) {
  await page.goto("/signup");
  await expect(page.getByTestId("merchant-signup-owner-name")).toBeVisible();
  await page.getByTestId("merchant-signup-owner-name").fill(ownerName);
  await page.getByTestId("merchant-signup-store-name").fill(storeName);
  await page.getByTestId("merchant-signup-store-slug").fill(storeSlug);
  await page.getByTestId("merchant-signup-next").click();
  await expect(page.getByText("Choose template")).toBeVisible();
  await page.getByTestId("merchant-signup-submit").click();
  await expect(page.getByRole("heading", { name: "Launch successful" })).toBeVisible();
  const onboardingHref = await page.getByRole("link", { name: "Open Onboarding Wizard" }).getAttribute("href");
  expect(onboardingHref).toBeTruthy();
  const onboardingUrl = new URL(onboardingHref ?? "", "http://127.0.0.1:8080");
  const storeId = onboardingUrl.searchParams.get("storeId");
  expect(storeId).toBeTruthy();
  return { storeId: storeId as string };
}

test("merchant preview smoke: login, signup, onboarding, product create, publish, storefront load", async ({
  page,
}, testInfo) => {
  const suffix = randomUUID().slice(0, 8);
  const email = `preview-smoke-${suffix}@example.com`;
  const password = `Preview-${suffix}-Pass123!`;
  const adminEmail = `preview-smoke-admin-${suffix}@example.com`;
  const adminPassword = `Preview-Admin-${suffix}-Pass123!`;
  const ownerName = "Preview Smoke Owner";
  const storeName = `Preview Smoke ${suffix}`;
  const storeSlug = `preview-smoke-${suffix}`;
  const imageUrl =
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800";

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let userId: string | null = null;
  let adminUserId: string | null = null;
  let storeId: string | null = null;
  let marketplaceTemplateId: string | null = null;
  let submittedTemplateId: string | null = null;
  let rejectedTemplateId: string | null = null;
  let productId: string | null;

  try {
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createUserError || !createdUser.user) {
      throw createUserError ?? new Error("Failed to create preview smoke user");
    }

    userId = createdUser.user.id;

    const { data: createdAdminUser, error: createAdminUserError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (createAdminUserError || !createdAdminUser.user) {
      throw createAdminUserError ?? new Error("Failed to create preview smoke admin user");
    }

    adminUserId = createdAdminUser.user.id;

    const { error: adminRoleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: adminUserId, role: "admin" });
    if (adminRoleError) throw adminRoleError;

    page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    await page.goto("/admin/login");
    await page.getByTestId("admin-login-email").fill(email);
    await page.getByTestId("admin-login-password").fill(password);
    
    console.log("Submitting login for:", email);
    await page.getByTestId("admin-login-submit").click();
    
    try {
      await expect(page.getByText(`Signed in as ${email}`)).toBeVisible({ timeout: 15000 });
    } catch (e) {
      console.log("Failed to see 'Signed in as' - capturing current URL:", page.url());
      // wait a bit to see if we were redirected
      await page.waitForTimeout(2000);
      console.log("URL after wait:", page.url());
      throw e;
    }

    await page.goto("/signup");
    await expect(page.getByTestId("merchant-signup-owner-name")).toBeVisible();
    await page.getByTestId("merchant-signup-owner-name").fill(ownerName);
    await page.getByTestId("merchant-signup-store-name").fill(storeName);
    await page.getByTestId("merchant-signup-store-slug").fill(storeSlug);
    await page.getByTestId("merchant-signup-next").click();
    await expect(page.getByText("Choose template")).toBeVisible();
    await page.getByTestId("merchant-signup-submit").click();
    await expect(page.getByRole("heading", { name: "Launch successful" })).toBeVisible();
    await expect(page.getByText("Open Onboarding Wizard")).toBeVisible();
    const onboardingHref = await page.getByRole("link", { name: "Open Onboarding Wizard" }).getAttribute("href");
    expect(onboardingHref).toBeTruthy();
    const onboardingUrl = new URL(onboardingHref ?? "", "http://127.0.0.1:8080");
    storeId = onboardingUrl.searchParams.get("storeId");
    expect(storeId).toBeTruthy();
    await page.getByRole("link", { name: "Open Onboarding Wizard" }).click();
    await page.waitForURL(new RegExp(`/admin/onboarding\\?storeId=${storeId}`));

    await page.goto("/admin/products");

    // Capture failed network requests
    const failedRequests: string[] = [];
    page.on('response', async response => {
      if (!response.ok() && response.url().includes('/api/')) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
      if (response.status() >= 500) {
        failedRequests.push(`${response.status()} ${response.url()} - ${response.statusText()}`);
      }
      
      if (!response.ok() && response.url().includes('/rest/v1/')) {
        try {
          const body = await response.text();
          console.log(`API ERROR: ${response.status()} ${response.url()} -> ${body}`);
        } catch (e) {
          console.log(`API ERROR: ${response.status()} ${response.url()} -> <could not read body>`);
        }
      }
    });

    // Wait for page with timeout and better error message
    try {
      await page.getByTestId("products-add-button").waitFor({ 
        state: 'visible', 
        timeout: 30000 
      });
    } catch (error) {
      if (failedRequests.length > 0) {
        throw new Error(
          `Failed API calls detected:\n${failedRequests.join('\n')}\nOriginal error: ${(error as Error).message}`,
          { cause: error },
        );
      }
      throw error;
    }
    
    await page.getByTestId("products-add-button").click();
    await page.getByTestId("products-form-name").fill("Preview Smoke Product");
    await page.getByTestId("products-form-price").fill("999");
    await page.getByTestId("products-form-image-url").fill(imageUrl);
    await page.getByTestId("products-form-description").fill(
      "Product created by the preview smoke test.",
    );
    await page.getByTestId("products-save-button").click();
    await expect(page.getByText("Preview Smoke Product")).toBeVisible();

    const { data: createdProduct, error: createdProductError } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("store_id", storeId)
      .eq("name", "Preview Smoke Product")
      .maybeSingle();
    if (createdProductError) throw createdProductError;
    productId = createdProduct?.id ?? null;
    expect(productId).toBeTruthy();

    await page.goto(`/admin/onboarding?storeId=${storeId}&guide=continue&step=launch`);

    const publishButton = page.getByTestId("onboarding-publish-store");
    await expect(publishButton).toBeEnabled();
    await publishButton.click();
    await expect(page.getByText("Store is live.")).toBeVisible();

    const { data: publishedStoreRow, error: publishedStoreError } = await supabaseAdmin
      .from("stores")
      .select("id, slug, is_published, store_type")
      .eq("id", storeId as string)
      .single();
    if (publishedStoreError) throw publishedStoreError;
    await page.goto(`/stores/${storeSlug}`);
    await expect(page.getByTestId("storefront-page")).toHaveAttribute("data-store-slug", storeSlug);

    const { data: pages, error: pagesError } = await supabaseAdmin
      .from("store_pages")
      .select("id, slug")
      .eq("store_id", storeId);
    if (pagesError) throw pagesError;
    const homePageId = pages?.find((item) => item.slug === "/")?.id ?? pages?.[0]?.id;
    expect(homePageId).toBeTruthy();

    const { data: blocks, error: blocksError } = await supabaseAdmin
      .from("store_page_blocks")
      .select("id, block_type")
      .eq("page_id", homePageId as string)
      .limit(1);
    if (blocksError) throw blocksError;
    const blockId = blocks?.[0]?.id;
    expect(blockId).toBeTruthy();

    const { error: updateBlockError } = await supabaseAdmin
      .from("store_page_blocks")
      .update({
        layout_variant: "centered",
        custom_css: ".preview-smoke { color: var(--primary); }",
        custom_html: "<div data-preview-smoke=\"true\"></div>",
      } as any)
      .eq("id", blockId as string);
    if (updateBlockError) throw updateBlockError;

    const { error: updateThemeError } = await supabaseAdmin
      .from("store_themes")
      .update({
        effects: {
          scrollReveals: true,
          hoverEffects: true,
          parallax: false,
          intensity: "subtle",
        },
      } as any)
      .eq("store_id", storeId);
    if (updateThemeError) throw updateThemeError;

    const { data: persistedBlock, error: persistedBlockError } = await supabaseAdmin
      .from("store_page_blocks")
      .select("layout_variant, custom_css, custom_html")
      .eq("id", blockId as string)
      .single();
    if (persistedBlockError) throw persistedBlockError;
    expect((persistedBlock as any).layout_variant).toBe("centered");
    expect((persistedBlock as any).custom_css).toContain("preview-smoke");
    expect((persistedBlock as any).custom_html).toContain("data-preview-smoke");

    const { error: clearCustomCodeError } = await supabaseAdmin
      .from("store_page_blocks")
      .update({
        custom_css: null,
        custom_html: null,
      } as any)
      .eq("id", blockId as string);
    if (clearCustomCodeError) throw clearCustomCodeError;

    const { data: persistedTheme, error: persistedThemeError } = await supabaseAdmin
      .from("store_themes")
      .select("effects")
      .eq("store_id", storeId)
      .single();
    if (persistedThemeError) throw persistedThemeError;
    expect((persistedTheme as any).effects?.intensity).toBe("subtle");

    const templateBundle = {
      schemaVersion: 1,
      type: "theme-and-layout",
      theme: {
        presetId: "preview-smoke-marketplace",
        mode: "light",
        headingFont: "Inter",
        bodyFont: "Inter",
        borderRadius: "0.75rem",
        aesthetic: "minimal",
        effects: {
          scrollReveals: true,
          hoverEffects: true,
          parallax: false,
          intensity: "subtle",
        },
        customCssVars: {
          primary: "222 84% 56%",
          accent: "18 92% 58%",
          background: "0 0% 100%",
          foreground: "222 47% 11%",
        },
        schemaVersion: 1,
      },
      pages: [
        {
          id: `marketplace-page-${suffix}`,
          slug: "/",
          title: "Marketplace Smoke Home",
          seoTitle: "Marketplace Smoke Home",
          seoDescription: "Marketplace smoke template page",
          isHomepage: true,
          blocks: [
            {
              id: `marketplace-hero-${suffix}`,
              type: "hero",
              sortOrder: 0,
              isVisible: true,
              layoutVariant: "centered",
              props: {
                title: "Marketplace Smoke Template",
                subtitle: "A deterministic community template for install smoke coverage.",
                ctaText: "Shop now",
                imageUrl,
              },
            },
          ],
        },
      ],
    };

    const { data: marketplaceTemplate, error: marketplaceTemplateError } = await supabaseAdmin
      .from("cms_marketplace_templates")
      .insert({
        title: `Preview Marketplace ${suffix}`,
        description: "Published template seeded by the preview smoke test.",
        cover_image: imageUrl,
        category: "minimal",
        pricing_mode: "free",
        price: 0,
        bundle_json: templateBundle,
        creator_id: userId,
        status: "published",
        safety_status: "passed",
        safety_findings: [],
        tags: ["preview-smoke"],
        best_for: ["qa"],
        aesthetic: "minimal",
        preview_asset_urls: [imageUrl],
        mobile_ready: true,
      } as any)
      .select("id")
      .single();
    if (marketplaceTemplateError) throw marketplaceTemplateError;
    marketplaceTemplateId = marketplaceTemplate.id;

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/admin/page-builder/basic?storeId=${storeId}`);
    await expect(page.getByRole("heading", { name: `Guided Editor: ${storeName}` })).toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: testInfo.outputPath("basic-editor-desktop.png"), fullPage: true });
    await page.getByTestId("basic-mode-tab-pages").last().click();
    await expect(page.getByTestId("basic-flow-settings-panel")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("basic-flow-panel-shop").evaluate((node: HTMLDetailsElement) => {
      node.open = true;
    });
    await page.getByTestId("basic-flow-product-visibility").selectOption("featured");
    await page.getByTestId("basic-flow-upsell-title").fill("Complete the preview look");
    await page.getByTestId("basic-flow-upsell-enabled").click();
    await expect(page.getByTestId("basic-flow-product-visibility")).toHaveValue("featured");
    await expect(page.getByTestId("basic-flow-upsell-title")).toHaveValue("Complete the preview look");
    await page.getByTestId("basic-flow-panel-shop").getByTestId("basic-flow-save-upsells").click();

    await page.getByTestId("basic-flow-panel-delivery").evaluate((node: HTMLDetailsElement) => {
      node.open = true;
    });
    await page.getByTestId("basic-flow-primary-zone-label").fill("Dhaka city");
    await page.getByTestId("basic-flow-secondary-zone-label").fill("Outside Dhaka");
    await page.getByTestId("basic-flow-primary-delivery-fee").fill("70");
    await page.getByTestId("basic-flow-extended-delivery-fee").fill("130");
    await page.getByTestId("basic-flow-free-delivery-threshold").fill("2500");
    await expect(page.getByTestId("basic-flow-primary-zone-label")).toHaveValue("Dhaka city");
    await expect(page.getByTestId("basic-flow-primary-delivery-fee")).toHaveValue("70");
    await page.getByTestId("basic-flow-save-delivery_settings").click();

    await page.getByTestId("basic-flow-panel-checkout").evaluate((node: HTMLDetailsElement) => {
      node.open = true;
    });
    await page.getByTestId("basic-flow-checkout-mode").selectOption("whatsapp");
    await page.getByTestId("basic-flow-bkash-number").fill("01700000000");
    await page.getByTestId("basic-flow-prepaid-badge").fill("Preview prepaid perk");
    await expect(page.getByTestId("basic-flow-checkout-mode")).toHaveValue("whatsapp");
    await expect(page.getByTestId("basic-flow-bkash-number")).toHaveValue("01700000000");
    await page.getByTestId("basic-flow-panel-checkout").getByTestId("basic-flow-save-storefront_profile").click();
    await page.getByTestId("basic-flow-panel-checkout").getByTestId("basic-flow-save-payment_settings").click();

    await page.getByTestId("basic-flow-panel-support").evaluate((node: HTMLDetailsElement) => {
      node.open = true;
    });
    await page.getByTestId("basic-flow-whatsapp-enabled").click();
    await page.getByTestId("basic-flow-whatsapp-number").fill("8801700000000");
    await page.getByTestId("basic-flow-whatsapp-message").fill("Hi preview support");
    await expect(page.getByTestId("basic-flow-whatsapp-number")).toHaveValue("8801700000000");
    await expect(page.getByTestId("basic-flow-whatsapp-message")).toHaveValue("Hi preview support");
    await page.getByTestId("basic-flow-save-whatsapp_support").click();

    await expect.poll(async () => {
      const { data, error } = await supabaseAdmin
        .from("site_settings")
        .select("key, value")
        .eq("store_id", storeId as string)
        .in("key", ["storefront_profile", "upsells", "delivery_settings", "payment_settings", "whatsapp_support"]);
      if (error) throw error;
      const settingsMap = new Map((data ?? []).map((row) => [row.key, row.value as Record<string, unknown>]));
      return [
        settingsMap.get("storefront_profile")?.product_visibility,
        settingsMap.get("storefront_profile")?.checkout_mode,
        settingsMap.get("upsells")?.complete_look_title,
        settingsMap.get("delivery_settings")?.primary_zone_label,
        settingsMap.get("delivery_settings")?.delivery_fee,
        settingsMap.get("payment_settings")?.bkash_number,
        settingsMap.get("payment_settings")?.prepaid_badge_text,
        settingsMap.get("whatsapp_support")?.number,
        settingsMap.get("whatsapp_support")?.message,
      ].join("|");
    }, { timeout: 15000 }).toBe(
      "featured|whatsapp|Complete the preview look|Dhaka city|70|01700000000|Preview prepaid perk|8801700000000|Hi preview support",
    );

    await page.goto(`/stores/${storeSlug}`);
    const whatsappButton = page.getByTestId("storefront-whatsapp-button");
    await expect(whatsappButton).toBeVisible({ timeout: 15000 });
    await expect(whatsappButton).toHaveAttribute("href", /8801700000000/);
    await expect(whatsappButton).toHaveAttribute("href", /Hi%20preview%20support/);

    await page.evaluate(({ seededProductId, seededStoreId, seededImageUrl }) => {
      window.localStorage.setItem(
        `cart:store:${seededStoreId}`,
        JSON.stringify([
          {
            productId: seededProductId,
            storeId: seededStoreId,
            name: "Preview Smoke Cart Item",
            price: 1000,
            image: seededImageUrl,
            size: "Default",
            quantity: 1,
          },
        ]),
      );
      window.localStorage.setItem(`cart-time:store:${seededStoreId}`, Date.now().toString());
    }, { seededProductId: productId, seededStoreId: storeId, seededImageUrl: imageUrl });
    await page.goto(`/stores/${storeSlug}/cart`);
    await expect(page.getByText("Preview Smoke Cart Item")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("cart-delivery-total")).toHaveText("BDT 70");
    await expect(page.getByTestId("cart-grand-total")).toHaveText("BDT 1070");

    await page.goto(`/admin/page-builder/basic?storeId=${storeId}`);
    await expect(page.getByTestId("basic-mode-tab-content").last()).toBeVisible({ timeout: 45000 });
    await page.getByTestId("basic-mode-tab-content").last().click();
    await expect(page.getByText("Edit one section at a time")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: testInfo.outputPath("basic-editor-content.png"), fullPage: true });
    await page.getByTestId("basic-mode-tab-layout").last().click();
    await expect(page.getByText("Arrange the page")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: testInfo.outputPath("basic-editor-layout.png"), fullPage: true });
    await page.getByTestId("basic-mode-tab-theme").last().click();
    await expect(page.getByText("Theme Colors")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: testInfo.outputPath("basic-editor-theme.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/admin/page-builder/basic?storeId=${storeId}`);
    await expect(page.getByText("Task 1 of")).toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: testInfo.outputPath("basic-editor-mobile.png"), fullPage: true });
    await page.getByTestId("basic-mobile-preview-button").click();
    await expect(page.getByTestId("basic-preview-overlay")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("basic-preview-device-mobile")).toHaveAttribute("data-active", "true");
    await page.waitForTimeout(300);
    await page.screenshot({ path: testInfo.outputPath("basic-preview-overlay-mobile.png"), fullPage: true });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/admin/page-builder/advanced?storeId=${storeId}`);
    await expect(page.getByText("Expert Editing").first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText("Visual CSS Inspector")).toBeVisible({ timeout: 45000 });
    await page.getByTestId("open-template-publish-dialog").click();
    await expect(page.getByTestId("template-publish-dialog")).toBeVisible();
    await page.getByTestId("template-publish-title").fill(`Submitted Marketplace ${suffix}`);
    await page.getByTestId("template-publish-description").fill("Template submitted through the merchant publish dialog.");
    await page.getByTestId("template-publish-best-for").fill("qa, storefront");
    await page.getByTestId("template-publish-tags").fill("preview-smoke, in-review");
    await page.getByTestId("template-publish-cover-url").fill(imageUrl);
    await page.getByTestId("template-publish-submit").click();

    await expect.poll(async () => {
      const { data, error } = await supabaseAdmin
        .from("cms_marketplace_templates")
        .select("id, status, safety_status")
        .eq("creator_id", userId)
        .eq("title", `Submitted Marketplace ${suffix}`)
        .maybeSingle();
      if (error) throw error;
      submittedTemplateId = data?.id ?? null;
      return data ? `${data.status}:${data.safety_status}` : "missing";
    }, { timeout: 15000 }).toBe("in_review:passed");

    await page.screenshot({ path: testInfo.outputPath("advanced-editor-desktop.png"), fullPage: true });

    await page.goto(`/admin/templates?storeId=${storeId}`);
    await expect(page.getByTestId("template-gallery")).toBeVisible({ timeout: 45000 });
    await page.getByTestId("template-gallery-community-tab").click();
    await expect(page.getByTestId(`template-card-${marketplaceTemplateId}`)).toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: testInfo.outputPath("template-gallery-desktop.png"), fullPage: true });
    await page.getByTestId(`template-card-${marketplaceTemplateId}`).hover();
    await page.getByTestId(`template-apply-${marketplaceTemplateId}`).click();

    await expect.poll(async () => {
      const { count, error } = await supabaseAdmin
        .from("cms_marketplace_template_installs")
        .select("id", { count: "exact", head: true })
        .eq("template_id", marketplaceTemplateId)
        .eq("store_id", storeId);
      if (error) throw error;
      return count ?? 0;
    }, { timeout: 15000 }).toBe(1);

    await expect.poll(async () => {
      const { data, error } = await supabaseAdmin
        .from("cms_marketplace_templates")
        .select("install_count")
        .eq("id", marketplaceTemplateId)
        .single();
      if (error) throw error;
      return Number(data.install_count ?? 0);
    }, { timeout: 15000 }).toBe(1);

    const { error: reviewError } = await supabaseAdmin
      .from("cms_marketplace_template_reviews")
      .insert({
        template_id: marketplaceTemplateId,
        reviewer_id: userId,
        rating: 5,
        review_text: "Preview smoke review.",
      } as any);
    if (reviewError) throw reviewError;

    await expect.poll(async () => {
      const { data, error } = await supabaseAdmin
        .from("cms_marketplace_templates")
        .select("rating_avg, rating_count")
        .eq("id", marketplaceTemplateId)
        .single();
      if (error) throw error;
      return `${Number(data.rating_avg ?? 0)}:${Number(data.rating_count ?? 0)}`;
    }, { timeout: 15000 }).toBe("5:1");

    expect(submittedTemplateId).toBeTruthy();
    const { data: rejectedTemplate, error: rejectedTemplateError } = await supabaseAdmin
      .from("cms_marketplace_templates")
      .insert({
        title: `Rejected Marketplace ${suffix}`,
        description: "In-review template seeded for reject-button smoke coverage.",
        cover_image: imageUrl,
        category: "minimal",
        pricing_mode: "free",
        price: 0,
        bundle_json: templateBundle,
        creator_id: userId,
        status: "in_review",
        safety_status: "passed",
        safety_findings: [],
        tags: ["preview-smoke", "reject"],
        best_for: ["qa"],
        aesthetic: "minimal",
        preview_asset_urls: [imageUrl],
        mobile_ready: true,
      } as any)
      .select("id")
      .single();
    if (rejectedTemplateError) throw rejectedTemplateError;
    rejectedTemplateId = rejectedTemplate.id;

    const { error: adminMembershipError } = await supabaseAdmin
      .from("store_memberships")
      .insert({ store_id: storeId, user_id: adminUserId, role: "admin" } as any);
    if (adminMembershipError) throw adminMembershipError;

    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto("/admin/login");
    await page.getByTestId("admin-login-email").fill(adminEmail);
    await page.getByTestId("admin-login-password").fill(adminPassword);
    await page.getByTestId("admin-login-submit").click();
    await expect(page.getByText("CMS Admin").first()).toBeVisible({ timeout: 15000 });

    await page.goto(`/admin/templates?storeId=${storeId}`);
    await expect(page.getByTestId("template-gallery")).toBeVisible({ timeout: 45000 });
    await page.getByTestId("template-gallery-community-tab").click();
    await expect(page.getByTestId(`template-card-${submittedTemplateId}`)).toBeVisible({ timeout: 45000 });
    await page.getByTestId(`template-card-${submittedTemplateId}`).hover();
    await page.getByTestId(`template-approve-${submittedTemplateId}`).click();
    await expect(page.getByTestId(`template-card-${rejectedTemplateId}`)).toBeVisible({ timeout: 45000 });
    await page.getByTestId(`template-card-${rejectedTemplateId}`).hover();
    await page.getByTestId(`template-reject-${rejectedTemplateId}`).click();

    await expect.poll(async () => {
      const { data, error } = await supabaseAdmin
        .from("cms_marketplace_templates")
        .select("status, reviewed_by")
        .eq("id", submittedTemplateId)
        .single();
      if (error) throw error;
      return `${data.status}:${data.reviewed_by === adminUserId}`;
    }, { timeout: 15000 }).toBe("published:true");

    await expect.poll(async () => {
      const { data, error } = await supabaseAdmin
        .from("cms_marketplace_templates")
        .select("status, reviewed_by, rejection_reason")
        .eq("id", rejectedTemplateId)
        .single();
      if (error) throw error;
      return `${data.status}:${data.reviewed_by === adminUserId}:${Boolean(data.rejection_reason)}`;
    }, { timeout: 15000 }).toBe("rejected:true:true");

  } finally {
    if (rejectedTemplateId) {
      await supabaseAdmin.from("cms_marketplace_templates").delete().eq("id", rejectedTemplateId);
    }

    if (submittedTemplateId) {
      await supabaseAdmin.from("cms_marketplace_templates").delete().eq("id", submittedTemplateId);
    }

    if (marketplaceTemplateId) {
      await supabaseAdmin.from("cms_marketplace_templates").delete().eq("id", marketplaceTemplateId);
    }

    if (storeId) {
      await supabaseAdmin.from("stores").delete().eq("id", storeId);
    }

    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }

    if (adminUserId) {
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    }
  }
});

test("admin hard refresh restores representative routes without getting stuck on access recovery", async ({
  page,
}) => {
  const suffix = randomUUID().slice(0, 8);
  const ownerName = "Refresh Smoke Owner";
  const storeName = `Refresh Smoke ${suffix}`;
  const storeSlug = `refresh-smoke-${suffix}`;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let credentials: Awaited<ReturnType<typeof createPreviewUsers>> | null = null;
  let storeId: string | null = null;

  try {
    credentials = await createPreviewUsers(supabaseAdmin, `${suffix}-refresh`);
    await loginAs(page, credentials.email, credentials.password);
    const signupResult = await signupPreviewStore(page, ownerName, storeName, storeSlug);
    storeId = signupResult.storeId;

    const representativeRoutes = [
      { path: `/admin/orders?storeId=${storeId}`, label: "Orders" },
      { path: `/admin/returns?storeId=${storeId}`, label: "Returns & COD" },
      { path: `/admin/recovery?storeId=${storeId}`, label: "Recovery automation" },
      { path: `/admin/analytics?storeId=${storeId}`, label: "Analytics privacy controls" },
      { path: `/admin/notifications?storeId=${storeId}`, label: "Notifications" },
      { path: `/admin/site-settings?storeId=${storeId}`, label: "Site Settings" },
    ];

    for (const route of representativeRoutes) {
      await page.goto(route.path);
      await page.reload();
      await expect(page.getByText(route.label).first()).toBeVisible({ timeout: 45000 });
      await expect(page.getByText("Restoring dashboard access")).toHaveCount(0);
    }
  } finally {
    if (storeId) {
      await supabaseAdmin.from("stores").delete().eq("id", storeId);
    }
    if (credentials?.userId) {
      await supabaseAdmin.auth.admin.deleteUser(credentials.userId);
    }
    if (credentials?.adminUserId) {
      await supabaseAdmin.auth.admin.deleteUser(credentials.adminUserId);
    }
  }
});

test("merchant marketplace tail smoke: advanced editor, submit, install, moderate", async ({ page }, testInfo) => {
  const suffix = randomUUID().slice(0, 8);
  const ownerName = "Preview Smoke Owner";
  const storeName = `Preview Tail ${suffix}`;
  const storeSlug = `preview-tail-${suffix}`;
  const imageUrl =
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800";

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let userId: string | null = null;
  let adminUserId: string | null = null;
  let storeId: string | null = null;
  let marketplaceTemplateId: string | null = null;
  let submittedTemplateId: string | null = null;
  let rejectedTemplateId: string | null = null;
  let credentials: Awaited<ReturnType<typeof createPreviewUsers>> | null = null;

  try {
    credentials = await createPreviewUsers(supabaseAdmin, suffix);
    userId = credentials.userId;
    adminUserId = credentials.adminUserId;

    page.on("console", (msg) => console.log("TAIL PAGE CONSOLE:", msg.text()));
    page.on("pageerror", (err) => console.log("TAIL PAGE ERROR:", err.message));

    await loginAs(page, credentials.email, credentials.password);
    const signup = await signupPreviewStore(page, ownerName, storeName, storeSlug);
    storeId = signup.storeId;

    await page.goto(`/admin/onboarding?storeId=${storeId}&guide=continue&step=launch`);
    await expect(page.getByTestId("onboarding-publish-store")).toBeEnabled();
    await page.getByTestId("onboarding-publish-store").click();
    await expect(page.getByText("Store is live.")).toBeVisible();

    const templateBundle = {
      schemaVersion: 1,
      type: "theme-and-layout",
      theme: {
        presetId: "preview-smoke-marketplace",
        mode: "light",
        headingFont: "Inter",
        bodyFont: "Inter",
        borderRadius: "0.75rem",
        aesthetic: "minimal",
        effects: {
          scrollReveals: true,
          hoverEffects: true,
          parallax: false,
          intensity: "subtle",
        },
        customCssVars: {
          primary: "222 84% 56%",
          accent: "18 92% 58%",
          background: "0 0% 100%",
          foreground: "222 47% 11%",
        },
        schemaVersion: 1,
      },
      pages: [
        {
          id: `marketplace-page-${suffix}`,
          slug: "/",
          title: "Marketplace Smoke Home",
          seoTitle: "Marketplace Smoke Home",
          seoDescription: "Marketplace smoke template page",
          isHomepage: true,
          blocks: [
            {
              id: `marketplace-hero-${suffix}`,
              type: "hero",
              sortOrder: 0,
              isVisible: true,
              layoutVariant: "centered",
              props: {
                title: "Marketplace Smoke Template",
                subtitle: "A deterministic community template for install smoke coverage.",
                ctaText: "Shop now",
                imageUrl,
              },
            },
          ],
        },
      ],
    };

    const { data: marketplaceTemplate, error: marketplaceTemplateError } = await supabaseAdmin
      .from("cms_marketplace_templates")
      .insert({
        title: `Preview Marketplace ${suffix}`,
        description: "Published template seeded by the preview smoke test.",
        cover_image: imageUrl,
        category: "minimal",
        pricing_mode: "free",
        price: 0,
        bundle_json: templateBundle,
        creator_id: userId,
        status: "published",
        safety_status: "passed",
        safety_findings: [],
        tags: ["preview-smoke"],
        best_for: ["qa"],
        aesthetic: "minimal",
        preview_asset_urls: [imageUrl],
        mobile_ready: true,
      } as any)
      .select("id")
      .single();
    if (marketplaceTemplateError) throw marketplaceTemplateError;
    marketplaceTemplateId = marketplaceTemplate.id;

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/admin/page-builder/advanced?storeId=${storeId}`);
    await expect(page.getByText("Expert Editing").first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText("Visual CSS Inspector")).toBeVisible({ timeout: 45000 });
    await page.getByTestId("open-template-publish-dialog").click();
    await expect(page.getByTestId("template-publish-dialog")).toBeVisible();
    await page.getByTestId("template-publish-title").fill(`Submitted Marketplace ${suffix}`);
    await page.getByTestId("template-publish-description").fill("Template submitted through the merchant publish dialog.");
    await page.getByTestId("template-publish-best-for").fill("qa, storefront");
    await page.getByTestId("template-publish-tags").fill("preview-smoke, in-review");
    await page.getByTestId("template-publish-cover-url").fill(imageUrl);
    await page.getByTestId("template-publish-submit").click();

    await expect.poll(async () => {
      const { data, error } = await supabaseAdmin
        .from("cms_marketplace_templates")
        .select("id, status, safety_status")
        .eq("creator_id", userId as string)
        .eq("title", `Submitted Marketplace ${suffix}`)
        .maybeSingle();
      if (error) throw error;
      submittedTemplateId = data?.id ?? null;
      return data ? `${data.status}:${data.safety_status}` : "missing";
    }, { timeout: 20000 }).toBe("in_review:passed");

    await page.screenshot({ path: testInfo.outputPath("marketplace-tail-advanced-editor.png"), fullPage: true });

    await page.goto(`/admin/templates?storeId=${storeId}`);
    await expect(page.getByTestId("template-gallery")).toBeVisible({ timeout: 45000 });
    await page.getByTestId("template-gallery-community-tab").click();
    await expect(page.getByTestId(`template-card-${marketplaceTemplateId}`)).toBeVisible({ timeout: 45000 });
    await page.getByTestId(`template-card-${marketplaceTemplateId}`).hover();
    await page.getByTestId(`template-apply-${marketplaceTemplateId}`).click();

    await expect.poll(async () => {
      const { count, error } = await supabaseAdmin
        .from("cms_marketplace_template_installs")
        .select("id", { count: "exact", head: true })
        .eq("template_id", marketplaceTemplateId as string)
        .eq("store_id", storeId as string);
      if (error) throw error;
      return count ?? 0;
    }, { timeout: 20000 }).toBe(1);

    const { data: rejectedTemplate, error: rejectedTemplateError } = await supabaseAdmin
      .from("cms_marketplace_templates")
      .insert({
        title: `Rejected Marketplace ${suffix}`,
        description: "In-review template seeded for reject-button smoke coverage.",
        cover_image: imageUrl,
        category: "minimal",
        pricing_mode: "free",
        price: 0,
        bundle_json: templateBundle,
        creator_id: userId,
        status: "in_review",
        safety_status: "passed",
        safety_findings: [],
        tags: ["preview-smoke", "reject"],
        best_for: ["qa"],
        aesthetic: "minimal",
        preview_asset_urls: [imageUrl],
        mobile_ready: true,
      } as any)
      .select("id")
      .single();
    if (rejectedTemplateError) throw rejectedTemplateError;
    rejectedTemplateId = rejectedTemplate.id;

    const { error: adminMembershipError } = await supabaseAdmin
      .from("store_memberships")
      .insert({ store_id: storeId, user_id: adminUserId, role: "admin" } as any);
    if (adminMembershipError) throw adminMembershipError;

    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await loginAs(page, credentials.adminEmail, credentials.adminPassword);
    await expect(page.getByText("CMS Admin").first()).toBeVisible({ timeout: 15000 });

    await page.goto(`/admin/templates?storeId=${storeId}`);
    await expect(page.getByTestId("template-gallery")).toBeVisible({ timeout: 45000 });
    await page.getByTestId("template-gallery-community-tab").click();
    await expect(page.getByTestId(`template-card-${submittedTemplateId}`)).toBeVisible({ timeout: 45000 });
    await page.getByTestId(`template-card-${submittedTemplateId}`).hover();
    await page.getByTestId(`template-approve-${submittedTemplateId}`).click();
    await expect(page.getByTestId(`template-card-${rejectedTemplateId}`)).toBeVisible({ timeout: 45000 });
    await page.getByTestId(`template-card-${rejectedTemplateId}`).hover();
    await page.getByTestId(`template-reject-${rejectedTemplateId}`).click();

    await expect.poll(async () => {
      const { data, error } = await supabaseAdmin
        .from("cms_marketplace_templates")
        .select("status, reviewed_by")
        .eq("id", submittedTemplateId as string)
        .single();
      if (error) throw error;
      return `${data.status}:${data.reviewed_by === adminUserId}`;
    }, { timeout: 20000 }).toBe("published:true");

    await expect.poll(async () => {
      const { data, error } = await supabaseAdmin
        .from("cms_marketplace_templates")
        .select("status, reviewed_by, rejection_reason")
        .eq("id", rejectedTemplateId as string)
        .single();
      if (error) throw error;
      return `${data.status}:${data.reviewed_by === adminUserId}:${Boolean(data.rejection_reason)}`;
    }, { timeout: 20000 }).toBe("rejected:true:true");
  } finally {
    if (rejectedTemplateId) {
      await supabaseAdmin.from("cms_marketplace_templates").delete().eq("id", rejectedTemplateId);
    }
    if (submittedTemplateId) {
      await supabaseAdmin.from("cms_marketplace_templates").delete().eq("id", submittedTemplateId);
    }
    if (marketplaceTemplateId) {
      await supabaseAdmin.from("cms_marketplace_templates").delete().eq("id", marketplaceTemplateId);
    }
    if (storeId) {
      await supabaseAdmin.from("stores").delete().eq("id", storeId);
    }
    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
    if (adminUserId) {
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    }
  }
});
