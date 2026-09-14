import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { StorePageBlock } from "@/lib/cms/schema";
import { canonicalStorefrontVariantRegistry } from "@/lib/cms/storefront-platform/variants/registry";
import {
  getEffectiveVariantOptions,
  getExplicitVariantOptions,
  resetAllVariantOptions,
  resetVariantOption,
} from "@/lib/cms/storefront-platform/variants/variant-options";
import { applySectionStyleToBlock } from "@/lib/cms/storefront-platform/variants/section-style-library";
import type { StorefrontVariantOptionKey } from "@/lib/cms/storefront-platform/variants/variant-option-contract";

const controlsSource = readFileSync(
  "src/components/storefront/editor/section-studio/SectionStudioOptionControls.tsx",
  "utf8",
);
const workspaceSource = readFileSync("src/views/admin/SectionStylesWorkspace.tsx", "utf8");
const mobileSource = readFileSync("src/components/storefront/editor/MobileMerchantEditorSheet.tsx", "utf8");
const studioSource = readFileSync("src/components/admin/StorefrontSectionStyleStudio.tsx", "utf8");
const basicSource = readFileSync("src/components/storefront/BasicModeEditor.tsx", "utf8");

function blockFor(definition: (typeof canonicalStorefrontVariantRegistry)[number]): StorePageBlock {
  return {
    id: "r4-ux-contract-block",
    type: definition.blockType,
    sortOrder: 0,
    isVisible: true,
    layoutVariant: definition.id,
    props: { title: "Content stays intact" },
  } as StorePageBlock;
}

describe("R4 Section Studio option controls", () => {
  it("derives controls and values only from Lane A capability metadata", () => {
    assert.match(controlsSource, /STOREFRONT_VARIANT_OPTION_CATALOG/);
    assert.match(controlsSource, /capabilities\?\.\[key\]/);
    assert.match(controlsSource, /capability\.allowedValues\.map/);
    assert.doesNotMatch(controlsSource, /const\s+(ALIGNMENT|CONTENT_WIDTH|MEDIA_FIT|EMPHASIS|SPACING|MOBILE_BEHAVIOR)/);
  });

  it("distinguishes inherited effective values from explicit overrides", () => {
    const definition = canonicalStorefrontVariantRegistry.find((entry) =>
      entry.optionCapabilities && Object.keys(entry.optionCapabilities).length > 0,
    );
    assert.ok(definition?.optionCapabilities);
    const key = Object.keys(definition.optionCapabilities)[0] as StorefrontVariantOptionKey;
    const capability = definition.optionCapabilities[key];
    assert.ok(capability);
    const block = blockFor(definition);
    assert.equal(getExplicitVariantOptions("general-catalog", block), undefined);
    const effective = getEffectiveVariantOptions("general-catalog", block);
    if (capability.defaultValue !== undefined) assert.equal(effective?.[key], capability.defaultValue);

    const explicitValue = capability.allowedValues[0];
    const explicitBlock = { ...block, variantOptions: { [key]: explicitValue } } as StorePageBlock;
    assert.equal(getExplicitVariantOptions("general-catalog", explicitBlock)?.[key], explicitValue);
  });
  it("supports Reset One and Reset All without changing section content", () => {
    const definition = canonicalStorefrontVariantRegistry.find((entry) =>
      entry.optionCapabilities && Object.keys(entry.optionCapabilities).length > 1,
    );
    assert.ok(definition?.optionCapabilities);
    const keys = Object.keys(definition.optionCapabilities) as StorefrontVariantOptionKey[];
    const first = keys[0];
    const second = keys[1];
    const firstValue = definition.optionCapabilities[first]?.allowedValues[0];
    const secondValue = definition.optionCapabilities[second]?.allowedValues[0];
    assert.ok(firstValue !== undefined && secondValue !== undefined);
    const block = {
      ...blockFor(definition),
      variantOptions: { [first]: firstValue, [second]: secondValue },
    } as StorePageBlock;
    const resetOne = resetVariantOption(block, first);
    assert.equal(resetOne.variantOptions?.[first], undefined);
    assert.equal(resetOne.variantOptions?.[second], secondValue);
    assert.deepEqual(resetOne.props, block.props);
    const resetAll = resetAllVariantOptions(block);
    assert.equal(resetAll.variantOptions, undefined);
    assert.deepEqual(resetAll.props, block.props);
  });

  it("cleans unsupported overrides on style change through Lane A normalization", () => {
    const source = canonicalStorefrontVariantRegistry.find((entry) =>
      entry.optionCapabilities && Object.keys(entry.optionCapabilities).length > 0,
    );
    assert.ok(source?.optionCapabilities);
    const sourceKeys = Object.keys(source.optionCapabilities) as StorefrontVariantOptionKey[];
    const cleanupKey = sourceKeys.find((key) =>
      canonicalStorefrontVariantRegistry.some((entry) =>
        entry.blockType === source.blockType && entry.id !== source.id && !entry.optionCapabilities?.[key],
      ),
    );
    assert.ok(cleanupKey);
    const target = canonicalStorefrontVariantRegistry.find((entry) =>
      entry.blockType === source.blockType && entry.id !== source.id && !entry.optionCapabilities?.[cleanupKey],
    );
    assert.ok(target);
    const value = source.optionCapabilities[cleanupKey]?.allowedValues[0];
    assert.ok(value !== undefined);
    const block = {
      ...blockFor(source),
      variantOptions: { [cleanupKey]: value },
    } as StorePageBlock;
    const changed = applySectionStyleToBlock(block, target.id, "general-catalog");
    assert.equal(changed.layoutVariant, target.id);
    assert.equal(changed.variantOptions?.[cleanupKey], undefined);
    assert.deepEqual(changed.props, block.props);
  });

  it("exposes unsaved/save/error feedback and mobile touch-safe semantic controls", () => {
    assert.match(workspaceSource, /Unsaved adjustments/);
    assert.match(workspaceSource, /Save section adjustments/);
    assert.match(workspaceSource, /Adjustments not saved/);
    assert.match(controlsSource, /aria-pressed=\{selected\}/);
    assert.match(controlsSource, /min-h-11/);
    assert.match(mobileSource, /SectionStudioOptionControls/);
    assert.match(mobileSource, /saveError \? "error" : saving \? "saving"/);
    assert.match(studioSource, /SectionStudioSaveStatus/);
    assert.match(studioSource, /hasUnsavedChanges \? "unsaved" : "saved"/);
    assert.match(studioSource, /buildVariantOptionsPersistencePatch/);
    assert.match(studioSource, /applySectionStyleToBlock/);
    assert.match(basicSource, /SectionStudioOptionControls/);
    assert.match(basicSource, /applySectionStyleToBlock/);
  });
});
