import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../views/admin/SiteSettings.tsx", import.meta.url), "utf8");

test("site settings keeps a persisted baseline separate from the editable draft", () => {
  assert.match(source, /persistedSettings/);
  assert.match(source, /setPersistedSettings/);
  assert.match(source, /resolveSettingsSaveState/);
  assert.doesNotMatch(source, /const \[savingKey, setSavingKey\]/);
});

test("save success advances baseline only after cache refresh and authoritative reread", () => {
  const refreshIndex = source.indexOf("await refreshStorefrontContentCache");
  const rereadIndex = source.indexOf('.select("value")', refreshIndex);
  const invalidateIndex = source.indexOf('await queryClient.invalidateQueries({ queryKey: ["site_settings"', rereadIndex);
  const baselineIndex = source.indexOf("setPersistedSettings", invalidateIndex);

  assert.ok(refreshIndex >= 0, "storefront cache refresh is required");
  assert.ok(rereadIndex > refreshIndex, "authoritative settings reread must follow cache refresh");
  assert.ok(invalidateIndex > rereadIndex, "query reconciliation must follow authoritative reread");
  assert.ok(baselineIndex > invalidateIndex, "persisted baseline must advance after reconciliation");
});

test("save failure is persistent and stale completions are guarded", () => {
  assert.match(source, /state: "save_failed"/);
  assert.match(source, /Your changes are still here/);
  assert.match(source, /isSettingsSaveCompletionCurrent/);
  assert.match(source, /originStoreId/);
  assert.match(source, /operationSettingKey/);
  assert.match(source, /latestOperationId/);
});

test("shared save controls expose visible live save truth", () => {
  assert.match(source, /data-settings-save-state=\{state\}/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /settingsSaveStateLabel/);
  assert.match(source, /Saving…/);
  assert.match(source, /disabled=\{!canSave \|\| isSaving\}/);
});
