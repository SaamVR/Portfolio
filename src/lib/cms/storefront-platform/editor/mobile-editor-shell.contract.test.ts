import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const mobileSource = readFileSync("src/components/storefront/editor/MobileMerchantEditorSheet.tsx", "utf8");
const liveSource = readFileSync("src/components/storefront/StorefrontLiveEditor.tsx", "utf8");
const basicSource = readFileSync("src/components/storefront/BasicModeEditor.tsx", "utf8");

describe("mobile merchant editor responsive contract", () => {
  it("uses one phone bottom sheet for 360, 390 and 430 widths with safe-area and thumb targets", () => {
    assert.match(mobileSource, /fixed inset-x-0 bottom-0/);
    assert.match(mobileSource, /sm:hidden/);
    assert.match(mobileSource, /env\(safe-area-inset-bottom\)/);
    assert.match(mobileSource, /min-h-11/);
    assert.doesNotMatch(mobileSource, /w-\[360px\]|w-\[390px\]|w-\[430px\]/);
  });

  it("keeps tablet and desktop on the desktop editor shell and scopes preview widths", () => {
    assert.match(liveSource, /hidden w-full max-w-\[min\(440px,100%\)\] flex-col items-end gap-3 sm:flex/);
    assert.match(liveSource, /max-w-\[430px\]/);
    assert.match(liveSource, /max-w-\[768px\]/);
    assert.match(liveSource, /max-w-6xl/);
  });

  it("does not couple approved aesthetic application to font replacement", () => {
    assert.match(basicSource, /onClick=\{\(\) => updateThemeAesthetic\(vibe\.storedValue\)\}/);
    assert.doesNotMatch(basicSource, /updateThemeAesthetic\(vibe\.[^)]+\);\s*updateFont/);
  });
});
