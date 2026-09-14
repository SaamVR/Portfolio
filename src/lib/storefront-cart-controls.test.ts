import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

test("CartDrawer mobile icon controls keep 44px hit areas and accessible names", () => {
  const source = readFileSync(path.resolve(root, "src/components/CartDrawer.tsx"), "utf8");
  const sheetSource = readFileSync(path.resolve(root, "src/components/ui/sheet.tsx"), "utf8");

  assert.ok((source.match(/h-11 w-11/g) || []).length >= 4);
  assert.match(source, /<Sheet open=\{isCartOpen\} onOpenChange=\{setIsCartOpen\}>/);
  assert.match(source, /<SheetContent/);
  assert.match(sheetSource, /h-11 w-11/);
  assert.match(sheetSource, /<span className="sr-only">Close<\/span>/);
  assert.match(source, /aria-label={`Remove \$\{item\.name\} from cart`}/);
  assert.match(source, /aria-label={`Decrease quantity of \$\{item\.name\}`}/);
  assert.match(source, /aria-label={`Increase quantity of \$\{item\.name\}`}/);
  assert.match(source, /aria-label={`Add \$\{upsell\.name\} to cart`}/);

  assert.match(source, /flex flex-wrap items-center justify-between gap-2/);
  assert.doesNotMatch(source, /className="text-muted-foreground hover:text-destructive"/);
  assert.doesNotMatch(source, /className="flex h-full w-8 items-center justify-center text-muted-foreground hover:text-foreground"/);
  assert.doesNotMatch(source, /className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/);
});

test("full cart mobile controls keep fixed 44px hit areas without narrow-screen flex squeezing", () => {
  const source = readFileSync(path.resolve(root, "src/views/Cart.tsx"), "utf8");

  assert.ok((source.match(/h-11 w-11 shrink-0/g) || []).length >= 3);
  assert.match(source, /h-20 w-20 shrink-0 rounded-md object-cover sm:h-24 sm:w-24/);
  assert.match(source, /mt-3 flex items-center justify-between gap-2/);
  assert.match(source, /aria-label={`Decrease quantity of \$\{item\.name\}`}/);
  assert.match(source, /aria-label={`Increase quantity of \$\{item\.name\}`}/);
  assert.match(source, /aria-label={`Remove \$\{item\.name\} from cart`}/);
  assert.doesNotMatch(source, /className="flex h-10 w-10 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"/);
  assert.doesNotMatch(source, /className="flex h-10 w-10 items-center justify-center rounded text-muted-foreground hover:text-destructive"/);
});

test("CartDrawer derives optional upsells from the authorized storefront product cache", () => {
  const source = readFileSync(path.resolve(root, "src/components/CartDrawer.tsx"), "utf8");

  assert.match(source, /useQueryClient/);
  assert.match(source, /getQueryData<Product\[]>\(\["products", cartStoreId\]\)/);
  assert.match(source, /image: upsell\.image/);
  assert.doesNotMatch(source, /@\/integrations\/supabase\/client/);
  assert.doesNotMatch(source, /\.from\("products"\)/);
});
