import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Missing Supabase credentials required for merchant/customer E2E coverage.");
}

const IMAGE_URL = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800";

async function loginMerchant(page: any, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByTestId("admin-login-email").fill(email);
  await page.getByTestId("admin-login-password").fill(password);
  await page.getByTestId("admin-login-submit").click();
  await expect.poll(async () => new URL(page.url()).pathname !== "/admin/login", { timeout: 15000 }).toBe(true);
}

test("merchant creates store/product and clean customer places COD order", async ({ browser }) => {
  const suffix = randomUUID().slice(0, 8);
  const email = `merchant-customer-${suffix}@example.com`;
  const password = `Merchant-${suffix}-Pass123!`;
  const storeName = `Journey Store ${suffix}`;
  const storeSlug = `journey-store-${suffix}`;
  const productName = `Journey Product ${suffix}`;
  const productPrice = 999;
  const initialStock = 5;
  const customerPhone = `017${Math.floor(10000000 + Math.random() * 89999999)}`;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const merchantContext = await browser.newContext();
  const customerContext = await browser.newContext();
  const merchantPage = await merchantContext.newPage();
  const customerPage = await customerContext.newPage();

  let userId: string | null = null;
  let storeId: string | null = null;
  let productId: string | null = null;

  try {
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createUserError || !createdUser.user) throw createUserError ?? new Error("Could not create merchant test user");
    userId = createdUser.user.id;

    // MERCHANT: account -> store -> design -> Registration Onboarding Wizard -> ready.
    await loginMerchant(merchantPage, email, password);
    await merchantPage.goto("/signup?entry=dashboard");
    await expect(merchantPage.getByTestId("merchant-signup-store-name")).toBeVisible({ timeout: 15000 });
    await merchantPage.getByTestId("merchant-signup-store-name").fill(storeName);
    await merchantPage.getByTestId("merchant-signup-store-slug").fill(storeSlug);
    await expect(merchantPage.getByTestId("merchant-signup-next")).toBeEnabled({ timeout: 15000 });
    await merchantPage.getByTestId("merchant-signup-next").click();
    await expect(merchantPage.getByTestId("merchant-design-picker")).toBeVisible();
    await merchantPage.getByTestId("merchant-signup-design-next").click();
    await expect(merchantPage.getByTestId("merchant-registration-wizard")).toBeVisible();

    const signupResponsePromise = merchantPage.waitForResponse(
      (response) => response.url().includes("/functions/v1/merchant-signup") && response.request().method() === "POST",
      { timeout: 30000 },
    );
    await merchantPage.getByTestId("merchant-signup-submit").click();
    const signupResponse = await signupResponsePromise;
    expect(signupResponse.ok()).toBeTruthy();
    await expect(merchantPage.getByRole("heading", { name: "Launch successful" })).toBeVisible({ timeout: 30000 });

    const dashboardHref = await merchantPage.getByRole("link", { name: /Go to Dashboard/i }).getAttribute("href");
    expect(dashboardHref).toBeTruthy();
    storeId = new URL(dashboardHref ?? "", "http://127.0.0.1:8080").searchParams.get("storeId");
    expect(storeId).toBeTruthy();

    // MERCHANT: add a sellable product through the actual admin UI.
    await merchantPage.getByRole("link", { name: /Go to Dashboard/i }).click();
    await merchantPage.waitForURL(/\/admin(?:\?|$)/, { timeout: 15000 });
    await expect(merchantPage.getByTestId("merchant-setup-journey")).toBeVisible({ timeout: 15000 });
    await merchantPage.goto(`/admin/products?storeId=${encodeURIComponent(storeId as string)}`);
    await expect(merchantPage.getByTestId("products-add-button")).toBeVisible({ timeout: 30000 });
    await merchantPage.getByTestId("products-add-button").click();
    await merchantPage.getByTestId("products-form-name").fill(productName);
    await merchantPage.getByTestId("products-form-price").fill(String(productPrice));
    await merchantPage.getByTestId("products-form-image-url").fill(IMAGE_URL);
    await merchantPage.getByTestId("products-form-description").fill("Product created by the merchant/customer journey test.");
    const stockRow = merchantPage.getByText("Stock *", { exact: true }).locator("..");
    await stockRow.locator("input[type=number]").fill(String(initialStock));
    await merchantPage.getByTestId("products-save-button").click();
    await expect(merchantPage.getByText(productName)).toBeVisible({ timeout: 15000 });

    const { data: productRow, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, stock, is_available")
      .eq("store_id", storeId as string)
      .eq("name", productName)
      .maybeSingle();
    if (productError) throw productError;
    expect(productRow?.id).toBeTruthy();
    expect(productRow?.stock).toBe(initialStock);
    expect(productRow?.is_available).toBe(true);
    productId = productRow?.id ?? null;

    // Make the test storefront reachable; publishing itself is covered by the broader onboarding smoke.
    const { error: publishError } = await supabaseAdmin
      .from("stores")
      .update({ is_published: true })
      .eq("id", storeId as string);
    if (publishError) throw publishError;

    // CUSTOMER: a separate clean browser context, no merchant session.
    await customerPage.goto(`/stores/${storeSlug}/shop`);
    await expect(customerPage.getByText(productName).first()).toBeVisible({ timeout: 30000 });
    await customerPage.getByRole("button", { name: "Add to Cart" }).first().click();

    await customerPage.goto(`/stores/${storeSlug}/cart`);
    await expect(customerPage.getByText(productName)).toBeVisible({ timeout: 15000 });
    await customerPage.getByRole("link", { name: /checkout/i }).click();
    await customerPage.waitForURL(new RegExp(`/stores/${storeSlug}/checkout`), { timeout: 15000 });

    await customerPage.getByPlaceholder("e.g. Hasan Mahmud").fill("Journey Customer");
    await customerPage.getByPlaceholder("01XXXXXXXXX").fill(customerPhone);
    await customerPage.getByPlaceholder("House, Road, Area").fill("House 10, Road 5, Test Area");
    await customerPage.getByPlaceholder("City or delivery area").fill("Dhaka");

    const orderResponsePromise = customerPage.waitForResponse(
      (response) => response.url().includes("/api/orders/create") && response.request().method() === "POST",
      { timeout: 30000 },
    );
    await customerPage.locator('button[type="submit"]').click();
    const orderResponse = await orderResponsePromise;
    expect(orderResponse.ok()).toBeTruthy();
    await customerPage.waitForURL(new RegExp(`/stores/${storeSlug}/order-success\\?order=`), { timeout: 30000 });

    const { data: orderRow, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total, status, items, customer_phone")
      .eq("store_id", storeId as string)
      .eq("customer_phone", customerPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (orderError) throw orderError;
    expect(orderRow?.id).toBeTruthy();
    expect(orderRow?.order_number).toBeTruthy();
    expect(Array.isArray(orderRow?.items)).toBe(true);
    expect((orderRow?.items as any[])?.[0]?.name).toBe(productName);

    const { data: stockAfterOrder, error: stockAfterError } = await supabaseAdmin
      .from("products")
      .select("stock")
      .eq("id", productId as string)
      .single();
    if (stockAfterError) throw stockAfterError;
    expect(stockAfterOrder.stock).toBe(initialStock - 1);

    // MERCHANT: the customer's order must become visible in the merchant workspace.
    await merchantPage.goto(`/admin/orders?storeId=${encodeURIComponent(storeId as string)}`);
    await expect(merchantPage.getByText(orderRow?.order_number as string)).toBeVisible({ timeout: 30000 });
  } finally {
    await merchantContext.close();
    await customerContext.close();
    if (storeId) await supabaseAdmin.from("stores").delete().eq("id", storeId);
    if (userId) await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
  }
});
