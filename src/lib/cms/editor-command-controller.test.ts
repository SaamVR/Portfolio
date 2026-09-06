import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createDefaultStore } from "./default-store";
import {
  STORE_LAYOUT_PACKAGE_SCHEMA,
  clearCmsEditorRecoverableDraft,
  getCmsEditorDraftStorageKey,
  prepareCmsEditorPersistence,
  prepareRevisionRestore,
  prepareStoreLayoutImport,
  readCmsEditorRecoverableDraft,
  writeCmsEditorRecoverableDraft,
  type StoreLayoutPackage,
} from "./editor-command-controller";

const root = process.cwd();

test("persistence preparation preserves save visibility and makes publish intent explicit", () => {
  const fullStore = createDefaultStore();
  const store = { ...fullStore, pages: [fullStore.pages[0]] };
  const saved = prepareCmsEditorPersistence(store, "save");
  const published = prepareCmsEditorPersistence({ ...store, isPublished: false }, "publish");
  const unpublished = prepareCmsEditorPersistence(store, "unpublish");

  assert.equal(saved.ok, true);
  assert.equal(published.ok, true);
  assert.equal(unpublished.ok, true);
  if (saved.ok) assert.equal(saved.targetPublicationState, store.isPublished);
  if (published.ok) assert.equal(published.targetPublicationState, true);
  if (unpublished.ok) assert.equal(unpublished.targetPublicationState, false);

  const reserved = {
    ...store,
    pages: [store.pages[0], { ...fullStore.pages[1], slug: "/cart" }],
  };
  const rejected = prepareCmsEditorPersistence(reserved, "save");
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.match(rejected.message, /already handled by the app/);
});

test("recoverable draft helpers keep store scoping behind the command boundary", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const key = getCmsEditorDraftStorageKey("store-a");
  const savedAt = writeCmsEditorRecoverableDraft(key, "snapshot-a", storage, () => new Date("2026-09-06T12:00:00.000Z"));
  assert.equal(savedAt?.toISOString(), "2026-09-06T12:00:00.000Z");
  assert.deepEqual(readCmsEditorRecoverableDraft(key, storage), {
    snapshot: "snapshot-a",
    updatedAt: "2026-09-06T12:00:00.000Z",
  });
  clearCmsEditorRecoverableDraft(key, storage);
  assert.equal(readCmsEditorRecoverableDraft(key, storage), null);
});

test("layout import and revision restore produce immutable prepared editor commands", () => {
  const store = createDefaultStore();
  let idCounter = 1;
  const createId = () => `00000000-0000-4000-8000-${String(idCounter++).padStart(12, "0")}`;
  const payload: StoreLayoutPackage = {
    schema: STORE_LAYOUT_PACKAGE_SCHEMA,
    exportedAt: "2026-09-06T12:00:00.000Z",
    source: { storeName: store.name, storeSlug: store.slug, templateSeedId: "fashion" },
    layout: {
      description: "Imported description",
      theme: store.theme,
      pages: [store.pages[0]],
    },
  };
  const prepared = prepareStoreLayoutImport({
    raw: JSON.stringify(payload),
    store,
    allowAdvanced: true,
    createId,
  });

  assert.notEqual(prepared.store, store);
  assert.equal(prepared.store.description, "Imported description");
  assert.equal(prepared.store.pages[0]?.slug, "/");
  assert.equal(prepared.selectedPageId, prepared.store.pages[0]?.id);
  assert.equal(store.description === "Imported description", false);

  const selectedPage = store.pages[0];
  const revisionBlocks = selectedPage.blocks.slice(0, 2).reverse().map((block, index) => ({
    ...block,
    sortOrder: index,
  }));
  const revision = prepareRevisionRestore({ selectedPage, revisionBlocks });
  assert.equal(revision.pageId, selectedPage.id);
  assert.deepEqual(revision.blocks.map((block) => block.sortOrder), [0, 1]);
  assert.deepEqual(revision.blocks.map((block) => block.type), revisionBlocks.map((block) => block.type));
  assert.notDeepEqual(revision.blocks.map((block) => block.type), selectedPage.blocks.slice(0, 2).map((block) => block.type));
});

test("CmsPagesManager delegates command ownership instead of retaining duplicate persistence paths", () => {
  const manager = readFileSync(path.resolve(root, "src/views/admin/CmsPagesManager.tsx"), "utf8");
  const commands = readFileSync(path.resolve(root, "src/lib/cms/editor-command-controller.ts"), "utf8");

  assert.match(manager, /useCmsEditorCommandController\(\{/);
  assert.match(manager, /prepareStoreLayoutImport\(\{/);
  assert.match(manager, /prepareThemeBundleApplication\(\{/);
  assert.match(manager, /prepareRevisionRestore\(\{/);
  const restore = manager.slice(manager.indexOf("const restoreRevision"), manager.indexOf("const restoreLocalDraft"));
  assert.notEqual(restore.length, 0);
  assert.doesNotMatch(manager, /persistStorefrontState/);
  assert.doesNotMatch(manager, /refreshStorefrontContentCache/);
  assert.doesNotMatch(manager, /window\.localStorage/);
  assert.doesNotMatch(restore, /sanitizeStoreBlocks\(revision\.blocks_snapshot/);
  assert.match(commands, /const persistResult = await persistStorefrontState/);
  assert.match(commands, /await refreshStorefrontContentCache/);
  assert.match(commands, /clearDraftForStore\(context\.storeId\)/);
});
