import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  resolveCmsEditorBuilderMode,
  resolveCmsEditorRenderBranch,
} from "./editor-presentation-controller";

function read(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const manager = read("views/admin/CmsPagesManager.tsx");
const controller = read("lib/cms/editor-presentation-controller.ts");
const previewSheet = read("components/admin/CmsEditorPreviewSheet.tsx");

test("maps CMS builder routes without changing route semantics", () => {
  assert.equal(resolveCmsEditorBuilderMode("/admin/page-builder/basic"), "basic");
  assert.equal(resolveCmsEditorBuilderMode("/admin/page-builder/advanced"), "advanced");
  assert.equal(resolveCmsEditorBuilderMode("/admin/cms"), "manager");
});

test("preserves render-branch precedence across gallery, recovery, new shell, and legacy modes", () => {
  assert.equal(resolveCmsEditorRenderBranch({ workspaceTab: "gallery", isBasicEditor: true, isAdvancedEditor: false, useLegacyEditor: false, hasSelectedPage: true }), "gallery");
  assert.equal(resolveCmsEditorRenderBranch({ workspaceTab: "pages", isBasicEditor: true, isAdvancedEditor: false, useLegacyEditor: false, hasSelectedPage: false }), "basic-recovery");
  assert.equal(resolveCmsEditorRenderBranch({ workspaceTab: "pages", isBasicEditor: true, isAdvancedEditor: false, useLegacyEditor: false, hasSelectedPage: true }), "editor-shell");
  assert.equal(resolveCmsEditorRenderBranch({ workspaceTab: "pages", isBasicEditor: false, isAdvancedEditor: true, useLegacyEditor: false, hasSelectedPage: true }), "editor-shell");
  assert.equal(resolveCmsEditorRenderBranch({ workspaceTab: "pages", isBasicEditor: true, isAdvancedEditor: false, useLegacyEditor: true, hasSelectedPage: true }), "guided-editor");
  assert.equal(resolveCmsEditorRenderBranch({ workspaceTab: "pages", isBasicEditor: false, isAdvancedEditor: false, useLegacyEditor: false, hasSelectedPage: true }), "legacy");
});

test("moves presentation-only state ownership out of CmsPagesManager", () => {
  for (const stateName of [
    "workspaceTab",
    "isMobileSettingsOpen",
    "previewViewport",
    "basicGuideStep",
    "isActionDockMinimized",
    "desktopPreviewMode",
    "desktopPreviewSide",
    "isMobilePreviewOpen",
    "hasCheckedBasicPreview",
    "activeAdvancedCodePanel",
    "draggedAdvancedBlockId",
  ]) {
    assert.equal(manager.includes(`const [${stateName},`), false, `${stateName} must be presentation-controller owned`);
  }

  assert.doesNotMatch(manager, /const useLegacyEditor =/, "legacy mode must be presentation-controller owned");
  assert.match(manager, /useCmsEditorPresentationController/);
  assert.match(manager, /resolveCmsEditorRenderBranch/);
  assert.match(manager, /presentationBranch === "gallery"/);
  assert.match(manager, /presentationBranch === "basic-recovery"/);
  assert.match(manager, /presentationBranch === "editor-shell"/);
  assert.match(manager, /presentationBranch === "guided-editor"/);
});

test("uses one extracted preview sheet implementation for both editor-shell and guided branches", () => {
  assert.ok((manager.match(/<CmsEditorPreviewSheet/g) ?? []).length >= 2);
  assert.match(previewSheet, /data-testid="basic-preview-overlay"/);
  assert.match(previewSheet, /basic-preview-device-desktop/);
  assert.match(previewSheet, /basic-preview-device-tablet/);
  assert.match(previewSheet, /basic-preview-device-mobile/);
  assert.match(previewSheet, /Full Screen Preview/);
  assert.match(previewSheet, /rendered with current Basic Mode draft/);
});

test("presentation extraction carries no data or persistence authority", () => {
  for (const [name, source] of [["presentation controller", controller], ["preview sheet", previewSheet]] as const) {
    assert.doesNotMatch(source, /\bsupabase\b/i, `${name} must not own Supabase access`);
    assert.doesNotMatch(source, /persistStorefrontState/, `${name} must not own persistence`);
    assert.doesNotMatch(source, /refreshStorefrontContentCache/, `${name} must not own cache invalidation`);
    assert.doesNotMatch(source, /\.from\(/, `${name} must not issue data queries`);
    assert.doesNotMatch(source, /\.rpc\(/, `${name} must not issue RPC mutations`);
  }
});
