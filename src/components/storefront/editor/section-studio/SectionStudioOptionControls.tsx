"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import {
  STOREFRONT_VARIANT_OPTION_CATALOG,
  type StorefrontVariantOptionKey,
} from "@/lib/cms/storefront-platform/variants/variant-option-contract";
import {
  getEffectiveVariantDefinition,
  getEffectiveVariantOptions,
  getExplicitVariantOptions,
  normalizeVariantOptionsForDefinition,
  resetAllVariantOptions,
  resetVariantOption,
} from "@/lib/cms/storefront-platform/variants/variant-options";
import { SectionStudioOptionShell } from "./SectionStudioShells";

const OPTION_KEYS = Object.keys(STOREFRONT_VARIANT_OPTION_CATALOG) as StorefrontVariantOptionKey[];

function humanizeValue(value: string) {
  return value.replaceAll("-", " ").replace(/^./, (character) => character.toUpperCase());
}
export function SectionStudioOptionControls({
  templateId,
  block,
  onChange,
  disabled = false,
  compact = false,
}: {
  templateId: StorefrontTemplateId;
  block: StorePageBlock;
  onChange: (block: StorePageBlock) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const definition = getEffectiveVariantDefinition(templateId, block);
  const capabilities = definition?.optionCapabilities;
  const supportedKeys = OPTION_KEYS.filter((key) => Boolean(capabilities?.[key]));
  const explicitOptions = getExplicitVariantOptions(templateId, block) ?? {};
  const effectiveOptions = getEffectiveVariantOptions(templateId, block) ?? {};
  const explicitCount = supportedKeys.filter((key) => explicitOptions[key] !== undefined).length;

  const applyOption = (key: StorefrontVariantOptionKey, value: string) => {
    if (!definition || disabled) return;
    const nextOptions = normalizeVariantOptionsForDefinition(definition, {
      ...(block.variantOptions ?? {}),
      [key]: value,
    });
    onChange({ ...block, variantOptions: nextOptions });
  };
  if (!definition || supportedKeys.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/15 p-4">
        <div className="flex items-start gap-3">
          <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">Section adjustments</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {definition
                ? `${definition.label} keeps its designed defaults and does not expose extra Section Studio controls.`
                : "This inherited/default presentation does not expose extra Section Studio controls."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Section adjustments</p>
            <Badge variant="outline" className="text-[10px]">{definition.label}</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Only adjustments supported by this Section Style appear here.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 shrink-0 gap-1.5"
          disabled={disabled || explicitCount === 0}
          onClick={() => onChange(resetAllVariantOptions(block))}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset All
        </Button>
      </div>

      <div className={compact ? "space-y-3" : "grid gap-3 xl:grid-cols-2"}>
        {supportedKeys.map((key) => {
          const capability = capabilities?.[key];
          if (!capability) return null;
          const catalog = STOREFRONT_VARIANT_OPTION_CATALOG[key];
          const explicit = explicitOptions[key] !== undefined;
          const effectiveValue = effectiveOptions[key];
          const label = capability.label ?? catalog.label;
          const help = capability.help ?? catalog.help;

          return (
            <SectionStudioOptionShell
              key={key}
              label={label}
              description={help}
              state={explicit ? "explicit" : "inherited"}
              resetDisabled={disabled}
              onReset={() => onChange(resetVariantOption(block, key))}
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {capability.allowedValues.map((value) => {
                  const valueText = String(value);
                  const selected = effectiveValue === value;
                  return (
                    <button
                      key={valueText}
                      type="button"
                      className={
                        "min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors "
                        + (selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/40")
                      }
                      aria-pressed={selected}
                      disabled={disabled}
                      onClick={() => applyOption(key, valueText)}
                    >
                      {humanizeValue(valueText)}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                {explicit
                  ? `Override: ${humanizeValue(String(explicitOptions[key]))}`
                  : effectiveValue !== undefined
                    ? `Inherited: ${humanizeValue(String(effectiveValue))}`
                    : "Inherited from the style."}
              </p>
            </SectionStudioOptionShell>
          );
        })}
      </div>
    </div>
  );
}
