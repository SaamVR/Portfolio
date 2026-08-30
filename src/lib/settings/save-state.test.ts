import assert from "node:assert/strict";
import test from "node:test";
import {
  isSettingsSaveCompletionCurrent,
  normalizeSettingsValue,
  resolveSettingsSaveState,
  settingsValuesEqual,
  type SettingsSaveFeedback,
} from "./save-state";

test("normalized settings comparison ignores object identity and key order", () => {
  const first = { enabled: true, nested: { beta: 2, alpha: 1 }, list: ["a", "b"] };
  const second = { list: ["a", "b"], nested: { alpha: 1, beta: 2 }, enabled: true };

  assert.notEqual(first, second);
  assert.equal(settingsValuesEqual(first, second), true);
  assert.equal(normalizeSettingsValue(first), normalizeSettingsValue(second));
  assert.equal(settingsValuesEqual(first, { ...second, list: ["b", "a"] }), false);
});

test("save-state resolver distinguishes clean dirty saving saved and failed", () => {
  const persisted = { title: "Store" };
  const dirty = { title: "New store" };
  const feedback = (state: SettingsSaveFeedback["state"]): SettingsSaveFeedback => ({
    state,
    operationId: "op-1",
  });

  assert.equal(resolveSettingsSaveState({ current: persisted, persisted }), "clean");
  assert.equal(resolveSettingsSaveState({ current: dirty, persisted }), "dirty");
  assert.equal(resolveSettingsSaveState({ current: dirty, persisted, feedback: feedback("saving") }), "saving");
  assert.equal(resolveSettingsSaveState({ current: persisted, persisted, feedback: feedback("saved") }), "saved");
  assert.equal(resolveSettingsSaveState({ current: dirty, persisted, feedback: feedback("save_failed") }), "save_failed");
  assert.equal(resolveSettingsSaveState({ current: dirty, persisted, feedback: feedback("saved") }), "dirty");
});

test("save completion is ignored when store category or operation changed", () => {
  const base = {
    originStoreId: "store-a",
    currentStoreId: "store-a",
    settingKey: "brand_seo",
    operationSettingKey: "brand_seo",
    operationId: "op-1",
    latestOperationId: "op-1",
  };

  assert.equal(isSettingsSaveCompletionCurrent(base), true);
  assert.equal(isSettingsSaveCompletionCurrent({ ...base, currentStoreId: "store-b" }), false);
  assert.equal(isSettingsSaveCompletionCurrent({ ...base, operationSettingKey: "footer" }), false);
  assert.equal(isSettingsSaveCompletionCurrent({ ...base, latestOperationId: "op-2" }), false);
});
