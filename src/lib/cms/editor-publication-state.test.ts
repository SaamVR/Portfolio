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

test("admin builder delegates explicit save and publication intents to the command controller", () => {
  const manager = read("src/views/admin/CmsPagesManager.tsx");
  const commands = read("src/lib/cms/editor-command-controller.ts");
  const persistCall = commands.indexOf("const persistResult = await persistStorefrontState");
  const cacheRefresh = commands.indexOf("await refreshStorefrontContentCache", persistCall);
  const draftClear = commands.indexOf("clearDraftForStore(context.storeId)", cacheRefresh);

  assert.match(commands, /export type CmsEditorPersistIntent = "save" \| "publish" \| "unpublish"/);
  assert.match(commands, /publicationState: prepared\.targetPublicationState/);
  assert.ok(persistCall >= 0);
  assert.ok(cacheRefresh > persistCall);
  assert.ok(draftClear > cacheRefresh);
  assert.doesNotMatch(manager, /persistStorefrontState/);
  assert.doesNotMatch(manager, /refreshStorefrontContentCache/);
  assert.match(manager, /saveStorefront\(\{ store, selectedPage, revisionLabel, intent \}\)/);
  assert.match(manager, /saveAll\(store\.isPublished \? "unpublish" : "publish"\)/);
  assert.match(manager, /beforeunload/);
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
