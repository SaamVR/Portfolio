import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const sharedDialog = read("components/admin/MerchantConfirmDialog.tsx");
const cmsManager = read("views/admin/CmsPagesManager.tsx");
const blogManager = read("views/admin/BlogManager.tsx");
const mediaLibrary = read("components/admin/MediaLibraryBrowser.tsx");
const templateGallery = read("views/admin/TemplateGallery.tsx");

test("governed merchant confirmation dialog exposes structured and accessible context", () => {
  for (const token of [
    "entityLabel", "entityValue", "storeName", "impacts", "recoveryText",
    "AlertDialogTitle", "AlertDialogDescription", "aria-busy", 'aria-live="polite"',
  ]) {
    assert.match(sharedDialog, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(sharedDialog, /pending && !nextOpen/);
  assert.match(sharedDialog, /disabled=\{pending\}/);
  assert.match(sharedDialog, /w-\[calc\(100vw-1rem\)\]/);
});

test("migrated high-impact merchant surfaces no longer use browser-native confirmations", () => {
  for (const [name, source] of [
    ["CMS manager", cmsManager],
    ["Blog manager", blogManager],
    ["Media library", mediaLibrary],
  ] as const) {
    assert.doesNotMatch(source, /window\.confirm/, `${name} must use the governed confirmation contract`);
    assert.match(source, /useMerchantConfirm/);
  }
});

test("confirmation migrations preserve immutable store or editor context", () => {
  assert.match(cmsManager, /captureEditorContext\(\)/);
  assert.match(cmsManager, /selectedPageIdRef\.current/);
  assert.match(cmsManager, /isEditorContextCurrent\(context\)/);
  assert.ok((cmsManager.match(/\{confirmationDialog\}/g) ?? []).length >= 4, "all actionable CMS render branches must mount the confirmation host");
  assert.match(blogManager, /activeStoreIdRef\.current !== originStoreId/);
  assert.match(blogManager, /\.eq\("store_id", originStoreId\)/);
  assert.match(mediaLibrary, /effectiveStoreIdRef\.current !== originStoreId/);
  assert.match(mediaLibrary, /persistAssets\(nextAssets, originStoreId\)/);
});

test("template gallery awaits confirmation before reporting a template as applied", () => {
  assert.match(templateGallery, /await applyThemeBundle\(createBuiltInBundle/);
  assert.match(templateGallery, /await applyThemeBundle\(result\.bundle\)/);
});
