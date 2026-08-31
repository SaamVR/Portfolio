import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const merchantConfirmSource = fs.readFileSync(path.join(root, "src/components/admin/MerchantConfirmDialog.tsx"), "utf8");
const liveEditorSource = fs.readFileSync(path.join(root, "src/components/storefront/StorefrontLiveEditor.tsx"), "utf8");
const blogRecoverySource = fs.readFileSync(path.join(root, "src/hooks/useBlogDraftRecovery.ts"), "utf8");
const blogManagerSource = fs.readFileSync(path.join(root, "src/views/admin/BlogManager.tsx"), "utf8");

test("live editor reset and close use governed decisions with immutable draft context", () => {
  assert.match(liveEditorSource, /useMerchantConfirm/);
  assert.doesNotMatch(liveEditorSource, /window\.confirm\s*\(/);
  assert.match(liveEditorSource, /originStoreId\s*=\s*store\.id/);
  assert.match(liveEditorSource, /originPageId\s*=\s*page\.id/);
  assert.match(liveEditorSource, /originDraftSnapshot\s*=\s*currentSnapshot/);
  assert.match(liveEditorSource, /storeIdRef\.current !== originStoreId/);
  assert.match(liveEditorSource, /pageIdRef\.current !== originPageId/);
  assert.match(liveEditorSource, /draftSnapshotRef\.current !== originDraftSnapshot/);
  assert.match(liveEditorSource, /confirmLabel:\s*"Discard and reset"/);
  assert.match(liveEditorSource, /confirmLabel:\s*"Close and keep draft"/);
  assert.match(liveEditorSource, /beforeunload/);
});

test("blog recovery exposes explicit restore, discard and passive dismiss semantics", () => {
  assert.doesNotMatch(blogRecoverySource, /window\.confirm\s*\(/);
  assert.match(blogRecoverySource, /confirmRecoveryDecision/);
  assert.match(blogRecoverySource, /confirmLabel:\s*"Restore browser draft"/);
  assert.match(blogRecoverySource, /secondaryActionLabel:\s*"Discard browser recovery"/);
  assert.match(blogRecoverySource, /cancelLabel:\s*"Dismiss for now"/);
  assert.match(blogRecoverySource, /removeRecovery\(decision\.key\)/);
  assert.match(blogRecoverySource, /preserveRecoveryKeyRef\.current\s*=\s*decision\.key/);
  assert.match(blogRecoverySource, /isDecisionCurrent\(decision\)/);
  assert.match(blogRecoverySource, /beforeunload/);
  assert.match(blogManagerSource, /confirmRecoveryDecision:\s*confirmMerchantAction/);
});

test("shared merchant confirmation supports an explicit secondary outcome", () => {
  assert.match(merchantConfirmSource, /secondaryActionLabel\?:\s*string/);
  assert.match(merchantConfirmSource, /onSecondaryAction\?:\s*\(\) => void \| Promise<void>/);
  assert.match(merchantConfirmSource, /secondaryActionVariant/);
  assert.match(merchantConfirmSource, /request\.onSecondaryAction/);
});
