import { expect, test } from "playwright/test";

const fixturePrefix = "visual-baseline-20260824";
const assertGoldenSnapshots = process.env.STOREFRONT_VISUAL_GOLDEN === "1";

type TemplateCase = {
  id: string;
  catalogLabel: string | null;
  mobileActionLabel: string;
  mobileActionKind: "button" | "link";
};

const templateCases: TemplateCase[] = [
  { id: "blank", catalogLabel: "Shop", mobileActionLabel: "Cart", mobileActionKind: "button" },
  { id: "landing", catalogLabel: null, mobileActionLabel: "Contact", mobileActionKind: "link" },
  { id: "beauty", catalogLabel: "Shop", mobileActionLabel: "Cart", mobileActionKind: "button" },
  { id: "fashion", catalogLabel: "Shop", mobileActionLabel: "Cart", mobileActionKind: "button" },
  { id: "electronics", catalogLabel: "Shop", mobileActionLabel: "Cart", mobileActionKind: "button" },
  { id: "food", catalogLabel: "Menu", mobileActionLabel: "Order", mobileActionKind: "button" },
  { id: "crafts", catalogLabel: "Shop", mobileActionLabel: "Cart", mobileActionKind: "button" },
  { id: "subscriptions", catalogLabel: "Plans", mobileActionLabel: "Subscribe", mobileActionKind: "button" },
  { id: "digital-downloads", catalogLabel: "Downloads", mobileActionLabel: "Browse Downloads", mobileActionKind: "link" },
  { id: "single-product", catalogLabel: null, mobileActionLabel: "Buy Now", mobileActionKind: "button" },
  { id: "inquiry-catalog", catalogLabel: "Catalog", mobileActionLabel: "Request Quote", mobileActionKind: "link" },
  { id: "service", catalogLabel: "Services", mobileActionLabel: "Get Quote", mobileActionKind: "link" },
  { id: "general-catalog", catalogLabel: "Shop", mobileActionLabel: "Cart", mobileActionKind: "button" },
  { id: "booking", catalogLabel: "Services", mobileActionLabel: "Book", mobileActionKind: "link" },
  { id: "hotel", catalogLabel: "Rooms", mobileActionLabel: "Book", mobileActionKind: "link" },
  { id: "real-estate", catalogLabel: "Properties", mobileActionLabel: "Contact Agent", mobileActionKind: "link" },
];

const viewportCases = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

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

async function settleVisualAssets(page: any) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const images = Array.from(document.images);
    for (const image of images) {
      if (image.loading === "lazy") image.loading = "eager";
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await Promise.all(images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
          setTimeout(resolve, 2500);
        });
      }
      if (image.complete && image.naturalWidth > 0) await image.decode?.().catch(() => undefined);
    }));
  });
}

async function waitForVisiblePageTransition(page: any, templateId: string) {
  await page.waitForFunction((id: string) => {
    let node = document.querySelector<HTMLElement>(`[data-storefront-template="${id}"]`);
    if (!node) return false;
    while (node) {
      if (Number.parseFloat(getComputedStyle(node).opacity || "1") < 0.99) return false;
      node = node.parentElement;
    }
    return true;
  }, templateId, { timeout: 10000 });
  await page.waitForTimeout(50);
}

test("capture all 16 production storefront templates at mobile, tablet, and desktop widths", async ({ page }) => {
  test.skip(!assertGoldenSnapshots, "Production visual goldens run only with STOREFRONT_VISUAL_GOLDEN=1.");
  test.setTimeout(300000);
  await page.addInitScript(() => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      return key.startsWith("cookie-consent:") ? "accepted" : originalGetItem.call(this, key);
    };
  });

  let holdProductRequests = false;
  const releaseHeldProductRequests: Array<() => void> = [];
  await page.route("**/api/storefront/products**", async (route) => {
    if (holdProductRequests) await new Promise<void>((resolve) => releaseHeldProductRequests.push(resolve));
    await route.continue();
  });
  const releaseProducts = () => {
    holdProductRequests = false;
    for (const release of releaseHeldProductRequests.splice(0)) release();
  };

  for (const template of templateCases) {
    const storeSlug = `${fixturePrefix}-${template.id}`;
    for (const viewport of viewportCases) {
      const captureLoadingProducts = viewport.name === "mobile";
      holdProductRequests = captureLoadingProducts;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`/stores/${storeSlug}?visual-baseline=${template.id}-${viewport.name}`, { waitUntil: "domcontentloaded" });
      const shell = page.locator(`[data-storefront-template="${template.id}"]`).first();
      await expect(shell).toBeVisible({ timeout: 30000 });
      await expect(page.locator('[data-template-renderer="composable-blocks"]')).toBeVisible({ timeout: 30000 });

      if (viewport.width < 768) {
        const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
        await expect(mobileNavigation).toBeVisible();
        if (template.mobileActionKind === "button") {
          await expect(mobileNavigation.getByRole("button", { name: template.mobileActionLabel, exact: true })).toBeVisible();
        } else {
          await expect(mobileNavigation.getByRole("link", { name: template.mobileActionLabel, exact: true })).toBeVisible();
        }
      } else if (template.catalogLabel) {
        await expect(
          page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: template.catalogLabel, exact: true }),
        ).toBeVisible();
      }

      await settleVisualAssets(page);
      await waitForVisiblePageTransition(page, template.id);
      if (captureLoadingProducts) {
        await expect(page.locator('[aria-label="Loading categories"]')).toHaveCount(0, { timeout: 15000 });
      } else {
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 30000 });
      }
      await settleVisualAssets(page);
      await assertNoHorizontalOverflow(page, template.id, viewport.name);
      const snapshotName = `storefront-${template.id}-${viewport.name}-${viewport.width}.png`;
      try {
        await expect(page).toHaveScreenshot(snapshotName, {
          fullPage: true,
          animations: "disabled",
          caret: "hide",
          maxDiffPixelRatio: 0.015,
        });
      } finally {
        if (captureLoadingProducts) {
          releaseProducts();
          await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 30000 });
        }
      }
    }
  }
});
