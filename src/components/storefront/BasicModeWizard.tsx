"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, CheckCircle2, LayoutTemplate, Settings2, Sparkles, Zap } from "lucide-react";
import type { Store, StorePage } from "@/lib/cms/schema";
import { hslChannelsToHex, resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";
import { getBasicBlockCoach, getBasicStarterLayouts, resolveBasicEditorPageType } from "@/lib/cms/storefront-editor-registry";
import { getStorefrontTemplateDefinition, resolveStorefrontTemplateId, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";

interface BasicModeWizardProps {
  store: Store;
  page: StorePage;
  updateBlock: (blockId: string, patch: Record<string, unknown>) => void;
  updateThemeToken: (token: string, value: string) => void;
}

type WizardStep = {
  id: string;
  title: string;
  description: string;
  render: () => React.ReactNode;
};

type WizardComplexity = "quick" | "full";

function getTemplateId(store: Store): StorefrontTemplateId {
  const storefrontProfile = typeof store.siteSettings?.storefront_profile === "object" && store.siteSettings?.storefront_profile
    ? store.siteSettings.storefront_profile as Record<string, unknown>
    : {};

  return resolveStorefrontTemplateId(storefrontProfile.template_id, {
    templateSeedId: typeof storefrontProfile.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
}

function getTemplatePageIntro(templateId: StorefrontTemplateId, pageType: string) {
  const template = getStorefrontTemplateDefinition(templateId);

  switch (pageType) {
    case "homepage":
      return {
        title: `${template.label} Homepage Setup`,
        description: `Start with the first impression. This guided flow keeps the ${template.label.toLowerCase()} homepage simple to edit while still letting the merchant shape the mood, message, and conversion path.`,
      };
    case "product":
      return {
        title: `${template.label} Product Page Setup`,
        description: `Focus on the most important parts of this ${template.label.toLowerCase()} product experience before going deeper into layout or advanced controls.`,
      };
    case "catalog":
      return {
        title: `${template.label} Catalog Setup`,
        description: `Tune the browsing experience for this ${template.label.toLowerCase()} storefront so visitors quickly understand where to click and what to explore.`,
      };
    case "checkout":
      return {
        title: `${template.label} Checkout Setup`,
        description: `Keep the purchase path clear and trustworthy. This step only surfaces the basics that matter most to the checkout experience.`,
      };
    case "contact":
      return {
        title: `${template.label} Contact Page Setup`,
        description: `Make it easy for visitors to reach the business in the way this template is meant to convert them.`,
      };
    case "about":
      return {
        title: `${template.label} Story Page Setup`,
        description: `Use this guided flow to shape how the business story and credibility appear on the page.`,
      };
    default:
      return {
        title: `${template.label} Page Setup`,
        description: `This page uses the shared guided editor flow. Keep it simple here first, then open deeper controls only if you really need them.`,
      };
  }
}

function getRelevantBlocks(page: StorePage) {
  const priority = ["hero", "promo-banner", "featured-products", "category-showcase", "rich-text", "faq-accordion", "trust-badges", "testimonials"];
  return [...page.blocks].sort((left, right) => {
    const leftPriority = priority.indexOf(left.type);
    const rightPriority = priority.indexOf(right.type);
    return (leftPriority === -1 ? 999 : leftPriority) - (rightPriority === -1 ? 999 : rightPriority);
  });
}

function getBlockStepDescription(templateId: StorefrontTemplateId, blockType: StorePage["blocks"][number]["type"]) {
  return getBasicBlockCoach(templateId, blockType).tip;
}

export function BasicModeWizard({ store, page, updateBlock, updateThemeToken }: BasicModeWizardProps) {
  const [complexity, setComplexity] = useState<WizardComplexity>("quick");
  const [currentStep, setCurrentStep] = useState(0);

  const templateId = useMemo(() => getTemplateId(store), [store]);
  const templateDefinition = useMemo(() => getStorefrontTemplateDefinition(templateId), [templateId]);
  const pageType = resolveBasicEditorPageType(page.slug);
  const intro = getTemplatePageIntro(templateId, pageType);
  const starterLayouts = useMemo(() => getBasicStarterLayouts(templateId, pageType), [pageType, templateId]);
  const { vars } = resolveStoreThemeVars(store.theme);
  const primaryHsl = vars["--primary"] ?? "0 0% 100%";
  const accentHsl = vars["--accent"] ?? "0 0% 100%";
  const backgroundHsl = vars["--background"] ?? "0 0% 100%";
  const primaryHex = hslChannelsToHex(primaryHsl) ?? "#000000";
  const accentHex = hslChannelsToHex(accentHsl) ?? "#000000";
  const backgroundHex = hslChannelsToHex(backgroundHsl) ?? "#ffffff";

  const relevantBlocks = useMemo(() => getRelevantBlocks(page), [page]);
  const quickBlocks = relevantBlocks.slice(0, Math.min(2, relevantBlocks.length));
  const selectedBlocks = complexity === "quick" ? quickBlocks : relevantBlocks;

  const steps = useMemo<WizardStep[]>(() => {
    const wizardSteps: WizardStep[] = [];

    wizardSteps.push({
      id: "intro",
      title: intro.title,
      description: intro.description,
      render: () => (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{templateDefinition.label} template</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {complexity === "quick"
                    ? "Quick Setup keeps the most important choices close so the merchant can move fast."
                    : "Guided Setup walks through a few more sections without pushing the merchant into technical editing."}
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setComplexity("quick")}
              className={`rounded-2xl border p-4 text-left transition-colors ${complexity === "quick" ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Quick Setup</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Best for fast edits: colors, first impression, and a few high-impact sections.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setComplexity("full")}
              className={`rounded-2xl border p-4 text-left transition-colors ${complexity === "full" ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Guided Setup</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Best when the merchant wants a little more help before touching deeper controls.
              </p>
            </button>
          </div>
          {starterLayouts.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Recommended page directions</p>
              </div>
              <div className="mt-3 grid gap-3">
                {starterLayouts.slice(0, 2).map((layout) => (
                  <div key={layout.id} className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{layout.title}</p>
                        <p className="mt-1 text-xs leading-5 text-foreground/80">{layout.summary}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
                        {layout.sectionFocus === "pages" ? "Flow first" : layout.sectionFocus === "layout" ? "Layout first" : layout.sectionFocus === "theme" ? "Theme first" : "Content first"}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{layout.bestFor}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ),
    });

    wizardSteps.push({
      id: "theme",
      title: "Brand Colors",
      description: `Set the core visual direction for this ${templateDefinition.label.toLowerCase()} page before editing section content.`,
      render: () => (
        <div className="grid gap-4">
          {[
            { label: "Primary Brand Color", token: "--primary", value: primaryHex, helper: "Used for major actions and key highlights." },
            { label: "Accent Color", token: "--accent", value: accentHex, helper: "Used for emphasis, badges, and decorative support." },
            { label: "Background Tone", token: "--background", value: backgroundHex, helper: "Used for the main page surface behind the content." },
          ].map((field) => (
            <div key={field.token} className="grid gap-2">
              <Label>{field.label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="h-10 w-16 cursor-pointer p-1"
                  value={field.value}
                  onChange={(event) => updateThemeToken(field.token, event.target.value)}
                />
                <span className="text-sm text-muted-foreground">{field.helper}</span>
              </div>
            </div>
          ))}
        </div>
      ),
    });

    selectedBlocks.forEach((block, index) => {
      const blockProps = block.props as Record<string, unknown>;
      const genericLabel = String(blockProps.title ?? blockProps.tagline ?? block.type.replace(/-/g, " "));
      wizardSteps.push({
        id: `block-${block.id}`,
        title: `${index + 1}. ${block.type.replace(/-/g, " ")}`,
        description: getBlockStepDescription(templateId, block.type),
        render: () => {
          switch (block.type) {
            case "hero":
              return (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Headline</Label>
                    <Input value={String(blockProps.title ?? "")} onChange={(event) => updateBlock(block.id, { title: event.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Supporting Copy</Label>
                    <Textarea value={String(blockProps.subtitle ?? "")} onChange={(event) => updateBlock(block.id, { subtitle: event.target.value })} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Primary Button</Label>
                    <Input value={String(blockProps.ctaText ?? "")} onChange={(event) => updateBlock(block.id, { ctaText: event.target.value })} />
                  </div>
                </div>
              );
            case "promo-banner":
              return (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Promo Title</Label>
                    <Input value={String(blockProps.title ?? "")} onChange={(event) => updateBlock(block.id, { title: event.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Offer Details</Label>
                    <Textarea value={String(blockProps.subtitle ?? "")} onChange={(event) => updateBlock(block.id, { subtitle: event.target.value })} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Button Text</Label>
                    <Input value={String(blockProps.ctaText ?? "")} onChange={(event) => updateBlock(block.id, { ctaText: event.target.value })} />
                  </div>
                </div>
              );
            case "featured-products":
            case "category-showcase":
            case "rich-text":
            case "faq-accordion":
            case "trust-badges":
            case "testimonials":
              return (
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-start gap-3">
                      <LayoutTemplate className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{genericLabel || block.type}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          This section already has a dedicated editor in the Content tab. Use that next if the merchant wants deeper block-level control.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Section Title</Label>
                    <Input value={String(blockProps.title ?? "")} onChange={(event) => updateBlock(block.id, { title: event.target.value })} />
                  </div>
                  {"subtitle" in blockProps ? (
                    <div className="grid gap-2">
                      <Label>Section Description</Label>
                      <Textarea value={String(blockProps.subtitle ?? "")} onChange={(event) => updateBlock(block.id, { subtitle: event.target.value })} rows={3} />
                    </div>
                  ) : null}
                </div>
              );
            default:
              return (
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    This section is available in the full Content and Layout tabs. Basic Wizard keeps it simple here so the merchant does not get overwhelmed.
                  </div>
                </div>
              );
          }
        },
      });
    });

    wizardSteps.push({
      id: "done",
      title: "Ready for the next step",
      description: "The page is in a stronger state now. Keep refining it here, or move into Layout and Content for deeper control.",
      render: () => (
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Looks stronger already</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The guided basics are done. Continue with Layout to rearrange sections, Content to refine the page, or preview before saving.
            </p>
          </div>
        </div>
      ),
    });

    return wizardSteps;
  }, [
    accentHex,
    backgroundHex,
    complexity,
    intro.description,
    intro.title,
    primaryHex,
    selectedBlocks,
    starterLayouts,
    templateDefinition.label,
    templateId,
    updateBlock,
    updateThemeToken,
  ]);

  useEffect(() => {
    setCurrentStep(0);
  }, [page.id, complexity, templateId]);

  const step = steps[currentStep];

  if (!step) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
        <p className="text-sm text-muted-foreground">{step.description}</p>

        <div className="mt-4 flex gap-1">
          {steps.map((wizardStep, index) => (
            <div
              key={wizardStep.id}
              className={`h-1.5 flex-1 rounded-full ${index <= currentStep ? "bg-primary" : "bg-primary/20"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 pr-2">
        {step.render()}
      </div>

      <Separator className="my-4" />

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((previous) => Math.max(0, previous - 1))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          disabled={currentStep === steps.length - 1}
          onClick={() => setCurrentStep((previous) => Math.min(steps.length - 1, previous + 1))}
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
