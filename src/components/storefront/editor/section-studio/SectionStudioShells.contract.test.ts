import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const shellSource = readFileSync(
  "src/components/storefront/editor/section-studio/SectionStudioShells.tsx",
  "utf8",
);
const workspaceSource = readFileSync("src/views/admin/SectionStylesWorkspace.tsx", "utf8");

describe("R4 Section Studio contract-neutral UX shells", () => {
  it("keeps desktop/mobile preview switching semantic and touch-safe", () => {
    assert.match(shellSource, /aria-label="Preview device"/);
    assert.match(shellSource, /aria-pressed=\{value === "desktop"\}/);
    assert.match(shellSource, /aria-pressed=\{value === "mobile"\}/);
    assert.match(shellSource, /min-h-11 min-w-11/);
    assert.match(workspaceSource, /SectionStudioPreviewModeSwitch/);
  });

  it("distinguishes inherited and explicit state without defining option vocabulary", () => {
    assert.match(shellSource, /SectionStudioOverrideState = "inherited" \| "explicit"/);
    assert.match(shellSource, /inheritedLabel = "Inherited"/);
    assert.match(shellSource, /explicitLabel = "Override"/);
    assert.match(shellSource, /disabled=\{!explicit \|\| resetDisabled\}/);
  });
  it("exposes save feedback through a polite live region", () => {
    assert.match(shellSource, /SectionStudioSaveState = "saved" \| "unsaved" \| "saving" \| "error"/);
    assert.match(shellSource, /aria-live="polite"/);
    assert.match(shellSource, /role=\{state === "error" \? "alert" : "status"\}/);
  });

  it("keeps preview sizing inside platform breakpoints rather than merchant-defined widths", () => {
    assert.match(shellSource, /max-w-\[390px\]/);
    assert.doesNotMatch(shellSource, /variantOptions|alignment|contentWidth|mediaFit|emphasis|mobileBehavior/);
  });
});
