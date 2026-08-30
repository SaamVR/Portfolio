import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const productsSource = fs.readFileSync(path.join(root, "src/views/admin/Products.tsx"), "utf8");
const categoriesSource = fs.readFileSync(path.join(root, "src/views/admin/Categories.tsx"), "utf8");
const taxonomySource = fs.readFileSync(path.join(root, "src/lib/cms/product-taxonomy.ts"), "utf8");

test("catalog deletes use governed merchant confirmation with immutable context", () => {
  for (const source of [productsSource, categoriesSource]) {
    assert.match(source, /useMerchantConfirm/);
    assert.doesNotMatch(source, /\bconfirm\s*\(\s*["']/);
    assert.match(source, /activeStoreIdRef\.current !== context\.storeId/);
    assert.match(source, /tone:\s*"destructive"/);
  }

  assert.match(productsSource, /entityName:\s*product\.name/);
  assert.match(categoriesSource, /entityName:\s*category\.name/);
  assert.match(categoriesSource, /entityName:\s*type\.name/);
});

test("product form exposes persistent accessible validation and preserves failures", () => {
  assert.match(productsSource, /validateProductCatalogDraft/);
  assert.match(productsSource, /firstProductCatalogErrorField/);
  assert.match(productsSource, /aria-invalid=\{Boolean\(formErrors\.name\)\}/);
  assert.match(productsSource, /products-form-image-error/);
  assert.match(productsSource, /products-form-stock-error/);
  assert.match(productsSource, /role="alert"/);
  assert.match(productsSource, /await invalidateAdminProductCollections\(queryClient, storeId\);[\s\S]*setDialogOpen\(false\)/);
  assert.match(productsSource, /saveOperationRef\.current !== operationId/);
});

test("category and type dialogs stay open on failure and close only after reconciliation", () => {
  assert.match(categoriesSource, /validateCatalogEntityName\(catForm\.name, "category"\)/);
  assert.match(categoriesSource, /validateCatalogEntityName\(typeForm\.name, "product type"\)/);
  assert.match(categoriesSource, /aria-invalid=\{Boolean\(catError\.name\)\}/);
  assert.match(categoriesSource, /aria-invalid=\{Boolean\(typeError\.name\)\}/);
  assert.match(categoriesSource, /await reloadData\(storeId\);[\s\S]*setCatDialogOpen\(false\)/);
  assert.match(categoriesSource, /await reloadData\(storeId\);[\s\S]*setTypeDialogOpen\(false\)/);
  assert.match(categoriesSource, /catOperationRef\.current !== operationId/);
  assert.match(categoriesSource, /typeOperationRef\.current !== operationId/);
  assert.match(categoriesSource, /if \(error\) throw error;/);
});

test("category and type create retries reuse a stable dialog-scoped identity", () => {
  assert.match(categoriesSource, /catCreateIdRef\s*=\s*useRef<string \| null>\(null\)/);
  assert.match(categoriesSource, /typeCreateIdRef\s*=\s*useRef<string \| null>\(null\)/);
  assert.match(categoriesSource, /catCreateIdRef\.current\s*=\s*crypto\.randomUUID\(\)/);
  assert.match(categoriesSource, /typeCreateIdRef\.current\s*=\s*crypto\.randomUUID\(\)/);
  assert.match(categoriesSource, /\.upsert\(\{[\s\S]*id:\s*createId,[\s\S]*\},\s*\{ onConflict: "id" \}\)/);
  assert.match(categoriesSource, /createTypeId:\s*createId/);
  assert.match(taxonomySource, /createTypeId\?:\s*string \| null/);
  assert.match(taxonomySource, /\.upsert\(createPayload, \{ onConflict: "id" \}\)/);
});
