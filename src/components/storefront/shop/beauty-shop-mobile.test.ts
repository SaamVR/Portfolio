import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const shopSource = readFileSync(resolve(process.cwd(), "src/components/storefront/shop/ContextAwareShopPage.tsx"), "utf8");
const cardSource = readFileSync(resolve(process.cwd(), "src/components/storefront/beauty/BeautyProductCard.tsx"), "utf8");

test("Beauty shop opts into compact mobile discovery while fashion keeps scrollable category navigation", () => {
  assert.match(shopSource, /const isBeautyShop = shopVariant === "beauty";/);
  assert.match(shopSource, /productGridClass\.replace\("grid-cols-1", "grid-cols-2"\)/);
  assert.match(shopSource, /mobileScrollable=\{isBeautyShop \|\| isFashionShop\}/);
  assert.match(shopSource, /compactMobile=\{isBeautyShop\}/);
  assert.match(shopSource, /isBeautyShop && "py-8 md:py-16"/);
  assert.match(shopSource, /variant === "beauty" && "hidden sm:grid"/);
  assert.match(shopSource, /className=\{cn\(isBeautyShop && "hidden sm:block"\)\}/);
});

test("Beauty mobile controls and purchase action keep touch-friendly sizing", () => {
  assert.match(shopSource, /mobileScrollable && "min-h-11 shrink-0"/);
  assert.match(shopSource, /fullWidth && "w-full justify-center sm:w-auto"/);
  assert.match(cardSource, /className="inline-flex h-11 w-full/);
  assert.match(cardSource, /<span className="sm:hidden">Add<\/span>/);
  assert.match(cardSource, /<span className="hidden sm:inline">Add to Cart<\/span>/);
});
