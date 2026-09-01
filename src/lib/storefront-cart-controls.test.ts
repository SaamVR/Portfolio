import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

test("CartDrawer mobile icon controls keep 44px hit areas and accessible names", () => {
  const source = readFileSync(path.resolve(root, "src/components/CartDrawer.tsx"), "utf8");

  assert.ok((source.match(/h-11 w-11/g) || []).length >= 5);
  assert.match(source, /aria-label="Close cart"/);
  assert.match(source, /aria-label={`Remove \$\{item\.name\} from cart`}/);
  assert.match(source, /aria-label={`Decrease quantity of \$\{item\.name\}`}/);
  assert.match(source, /aria-label={`Increase quantity of \$\{item\.name\}`}/);
  assert.match(source, /aria-label={`Add \$\{upsell\.name\} to cart`}/);

  assert.match(source, /flex flex-wrap items-center justify-between gap-2/);
  assert.doesNotMatch(source, /className="text-muted-foreground hover:text-destructive"/);
  assert.doesNotMatch(source, /className="flex h-full w-8 items-center justify-center text-muted-foreground hover:text-foreground"/);
  assert.doesNotMatch(source, /className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/);
});

test("CartDrawer derives optional upsells from the authorized storefront product cache", () => {
  const source = readFileSync(path.resolve(root, "src/components/CartDrawer.tsx"), "utf8");

  assert.match(source, /useQueryClient/);
  assert.match(source, /getQueryData<Product\[]>\(\["products", cartStoreId\]\)/);
  assert.match(source, /image: upsell\.image/);
  assert.doesNotMatch(source, /@\/integrations\/supabase\/client/);
  assert.doesNotMatch(source, /\.from\("products"\)/);
});
