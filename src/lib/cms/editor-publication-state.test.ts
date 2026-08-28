import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => readFileSync(path.resolve(root, file), "utf8");

test("storefront persistence changes publication only after content writes", () => {
  const source = read("src/lib/cms/store-persistence.ts");
  const firstStoreUpsert = source.indexOf('client.from("stores").upsert');
  const themeWrite = source.indexOf('client.from("store_themes").upsert');
  const publicationWrite = source.indexOf('.update({ is_published: targetPublicationState })');

  assert.ok(firstStoreUpsert >= 0);
  assert.ok(themeWrite > firstStoreUpsert);
  assert.ok(publicationWrite > themeWrite);
  const initialStoreWrite = source.slice(firstStoreUpsert, themeWrite);
  assert.match(initialStoreWrite, /is_published: store\.isPublished/);
  assert.doesNotMatch(initialStoreWrite, /targetPublicationState/);
});

test("admin builder has explicit save and publication intents", () => {
  const source = read("src/views/admin/CmsPagesManager.tsx");
  const save = source.slice(source.indexOf("const saveAll"), source.indexOf("const restoreRevision"));

  assert.match(save, /intent: "save" \| "publish" \| "unpublish"/);
  assert.match(save, /publicationState: targetPublicationState/);
  assert.doesNotMatch(save, /from\("stores"\)\.upsert/);
  assert.match(source, /saveAll\(store\.isPublished \? "unpublish" : "publish"\)/);
  assert.match(source, /beforeunload/);
});

test("live editor keeps dirty baseline stable until persistence succeeds", () => {
  const source = read("src/components/storefront/StorefrontLiveEditor.tsx");
  assert.match(source, /\}, \[page\.id, store\.id\]\);/);
  assert.doesNotMatch(source, /\}, \[page\.id, store\]\);/);
  assert.match(source, /saveLiveEdits = async \(intent: "save" \| "publish" \| "unpublish"/);
  assert.match(source, /setPersistedSnapshot\(nextSnapshot\)/);
  assert.match(source, /Save before changing storefront visibility/);
});

test("draft preview product APIs require validated preview credentials and stay private", () => {
  const productsRoute = read("src/app/api/storefront/products/route.ts");
  const searchRoute = read("src/app/api/storefront/products/search/route.ts");
  const previewRequest = read("src/lib/cms/store-preview-request.ts");
  const proxy = read("src/proxy-middleware.ts");

  for (const route of [productsRoute, searchRoute]) {
    assert.match(route, /getValidatedStorePreviewTokenFromApiRequest/);
    assert.match(route, /private, no-store, max-age=0/);
  }
  assert.match(previewRequest, /validatePreviewToken\(storeId, token\)/);
  assert.match(proxy, /path: "\/"/);
});
