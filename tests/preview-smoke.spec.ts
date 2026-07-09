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

test("merchant preview smoke: login, signup, onboarding, product create, publish, storefront load", async ({
  page,
}) => {
  const suffix = randomUUID().slice(0, 8);
  const email = `preview-smoke-${suffix}@example.com`;
  const password = `Preview-${suffix}-Pass123!`;
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
  let storeId: string | null = null;

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

    page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    await page.goto("/admin/login");
    await page.getByTestId("admin-login-email").fill(email);
    await page.getByTestId("admin-login-password").fill(password);
    
    console.log("Submitting login for:", email);
    await page.getByTestId("admin-login-submit").click();
    
    try {
      await expect(page.getByText(`Signed in as ${email}`)).toBeVisible({ timeout: 5000 });
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
    await page.getByTestId("merchant-signup-submit").click();

    await page.waitForURL(/\/admin\/onboarding\?storeId=/);

    const onboardingUrl = new URL(page.url());
    storeId = onboardingUrl.searchParams.get("storeId");
    expect(storeId).toBeTruthy();

    await page.goto("/admin/products");
    
    // Log any failing network responses to debug 500 errors
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`Network error: ${response.url()} - ${response.status()} ${response.statusText()}`);
      }
    });

    await page.waitForLoadState('networkidle');
    await page.getByTestId("products-add-button").waitFor({ state: 'visible', timeout: 60000 });
    await page.getByTestId("products-add-button").click();
    await page.getByTestId("products-form-name").fill("Preview Smoke Product");
    await page.getByTestId("products-form-price").fill("999");
    await page.getByTestId("products-form-image-url").fill(imageUrl);
    await page.getByTestId("products-form-description").fill(
      "Product created by the preview smoke test.",
    );
    await page.getByTestId("products-save-button").click();
    await expect(page.getByText("Preview Smoke Product")).toBeVisible();

    await page.goto(`/admin/onboarding?storeId=${storeId}`);
    for (let index = 0; index < 5; index += 1) {
      await page.getByTestId("onboarding-next-step").click();
    }

    const publishButton = page.getByTestId("onboarding-publish-store");
    await expect(publishButton).toBeEnabled();
    await publishButton.click();
    await expect(page.getByText("Store is live.")).toBeVisible();

    await page.goto(`/stores/${storeSlug}`);
    await expect(page.getByTestId("storefront-page")).toHaveAttribute("data-store-slug", storeSlug);
  } finally {
    if (storeId) {
      await supabaseAdmin.from("stores").delete().eq("id", storeId);
    }

    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
  }
});
