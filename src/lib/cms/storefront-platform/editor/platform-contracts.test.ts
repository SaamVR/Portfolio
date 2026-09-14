import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultStore } from "@/lib/cms/default-store";
import {
  createCompositionBlockFromRecipe,
  getCompositionEditorFields,
  getPlatformAestheticOptions,
  updateCompositionAction,
  updateCompositionField,
} from "./platform-contracts";

describe("Lane D platform contract consumers", () => {
  it("exposes only the four approved presentation aesthetics without mutating merchant theme data", () => {
    const theme = structuredClone(defaultStore.theme);
    const before = structuredClone(theme);
    const options = getPlatformAestheticOptions(theme);

    assert.deepEqual(options.map((option) => option.engineId), ["flat", "editorial", "glass", "artisan"]);
    assert.deepEqual(theme, before);
  });

  it("authors a recipe-backed composition through structured fields instead of raw JSON", () => {
    let block = createCompositionBlockFromRecipe("modern-promotion", 2);
    const initial = getCompositionEditorFields(block);
    const heading = initial.fields.find((field) => field.primitive === "heading" && field.key === "text");
    const action = initial.actions[0];
    assert.ok(heading);
    assert.ok(action);

    block = updateCompositionField(block, heading.nodeId, "text", "Weekend offer");
    block = updateCompositionAction(block, action.nodeId, action.index, { label: "Shop weekend" });

    const updated = getCompositionEditorFields(block);
    assert.equal(updated.fields.find((field) => field.nodeId === heading.nodeId && field.key === "text")?.value, "Weekend offer");
    assert.equal(updated.actions[0]?.label, "Shop weekend");
  });
});
