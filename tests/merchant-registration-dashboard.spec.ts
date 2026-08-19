import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Missing Supabase credentials required for merchant registration smoke coverage.");
}

test("merchant registration: Account -> Store -> Design -> Onboarding Wizard -> Ready -> Dashboard", async ({ page }) => {
  const suffix = randomUUID().slice(0, 8);
  const email = `merchant-flow-${suffix}@example.com`;
  const password = `Merchant-${suffix}-Pass123!`;
  const storeName = `Merchant Flow ${suffix}`;
  const storeSlug = `merchant-flow-${suffix}`;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
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
    if (createUserError || !createdUser.user) throw createUserError ?? new Error("Could not create smoke user");
    userId = createdUser.user.id;

    await page.goto("/admin/login");
    await page.getByTestId("admin-login-email").fill(email);
    await page.getByTestId("admin-login-password").fill(password);
    await page.getByTestId("admin-login-submit").click();

    await expect.poll(async () => new URL(page.url()).pathname !== "/admin/login", { timeout: 15000 }).toBe(true);

    await page.goto("/signup?entry=dashboard");
    await expect(page.getByTestId("merchant-signup-store-name")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("merchant-signup-store-name").fill(storeName);
    await page.getByTestId("merchant-signup-store-slug").fill(storeSlug);

    const storeNext = page.getByTestId("merchant-signup-next");
    await expect(storeNext).toBeEnabled({ timeout: 15000 });
    await storeNext.click();

    await expect(page.getByTestId("merchant-design-picker")).toBeVisible();
    await page.getByTestId("merchant-signup-design-next").click();

    await expect(page.getByTestId("merchant-registration-wizard")).toBeVisible();
    await expect(page.getByText("Quick setup — not the full Onboarding")).toBeVisible();
    await page.getByLabel("Homepage headline").fill("Smoke-tested storefront");
    await page.getByLabel("Short supporting text").fill("Registration choices should persist into the merchant dashboard.");
    await page.getByRole("button", { name: /Bold & promotional/ }).click();

    const signupResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/functions/v1/merchant-signup") && response.request().method() === "POST",
      { timeout: 30000 },
    );
    await page.getByTestId("merchant-signup-submit").click();
    const signupResponse = await signupResponsePromise;
    expect(signupResponse.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Launch successful" })).toBeVisible({ timeout: 30000 });
    const dashboardLink = page.getByRole("link", { name: /Go to Dashboard/i });
    const dashboardHref = await dashboardLink.getAttribute("href");
    expect(dashboardHref).toBeTruthy();
    storeId = new URL(dashboardHref ?? "", "http://127.0.0.1:8080").searchParams.get("storeId");
    expect(storeId).toBeTruthy();

    const { data: registrationSetting, error: registrationSettingError } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("store_id", storeId as string)
      .eq("key", "registration_onboarding")
      .maybeSingle();
    if (registrationSettingError) throw registrationSettingError;
    expect((registrationSetting?.value as any)?.completed).toBe(true);
    expect((registrationSetting?.value as any)?.design_tone).toBe("bold");

    await dashboardLink.click();
    await page.waitForURL(/\/admin(?:\?|$)/, { timeout: 15000 });
    await expect(page.getByTestId("merchant-setup-journey")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Registration ready")).toBeVisible();
    await expect(page.getByText("Full Onboarding", { exact: true })).toBeVisible();
    await expect(page.getByText("Continue from where registration left off")).toBeVisible();
  } finally {
    if (storeId) {
      await supabaseAdmin.from("stores").delete().eq("id", storeId);
    }
    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
    }
  }
});
