"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, CheckCircle2, LayoutTemplate, Zap, Settings2 } from "lucide-react";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { hslChannelsToHex, resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";

interface BasicModeWizardProps {
  store: Store;
  page: StorePage;
  updateBlock: (blockId: string, patch: Record<string, unknown>) => void;
  updateThemeToken: (token: string, value: string) => void;
}

export function BasicModeWizard({ store, page, updateBlock, updateThemeToken }: BasicModeWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const pageType = page.slug === "/" ? "homepage" : 
    page.slug.includes("product") ? "product" : 
    page.slug.includes("collection") ? "collection" : 
    page.slug.includes("checkout") ? "checkout" : "custom";

  const { vars } = resolveStoreThemeVars(store.theme);
  const primaryHsl = vars["--primary"] ?? "0 0% 100%";
  const primaryHex = hslChannelsToHex(primaryHsl) ?? "#000000";

  type WizardStep = { id: string; title: string; description: string; render: () => React.ReactNode };
  const pageWizardConfig: Record<string, () => WizardStep[]> = {
    homepage: () => {
      const configSteps: WizardStep[] = [];
      const heroBlock = page.blocks.find(b => b.type === "hero");
      const promoBlock = page.blocks.find(b => b.type === "promo-banner");

      configSteps.push({
        id: "brand",
        title: "Brand Colors",
        description: "Set your primary store colors.",
        render: () => (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Primary Brand Color</Label>
              <div className="flex items-center gap-2">
                 <Input 
                   type="color" 
                   className="h-10 w-16 p-1 cursor-pointer"
                   value={primaryHex}
                   onChange={(e) => updateThemeToken("--primary", e.target.value)} 
                 />
                 <span className="text-sm text-muted-foreground">This color will be used for main buttons and highlights.</span>
              </div>
            </div>
          </div>
        )
      });

      if (heroBlock) {
        configSteps.push({
          id: "hero",
          title: "Welcome Hero",
          description: "The first thing customers see.",
          render: () => (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Headline</Label>
                <Input 
                  value={String(heroBlock.props.title ?? "")} 
                  onChange={(e) => updateBlock(heroBlock.id, { title: e.target.value })} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Tagline / Subtitle</Label>
                <Textarea 
                  value={String(heroBlock.props.subtitle ?? "")} 
                  onChange={(e) => updateBlock(heroBlock.id, { subtitle: e.target.value })} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Primary Call to Action</Label>
                <Input 
                  value={String(heroBlock.props.ctaText ?? "")} 
                  onChange={(e) => updateBlock(heroBlock.id, { ctaText: e.target.value })} 
                  placeholder="e.g. Shop Now"
                />
              </div>
            </div>
          )
        });
      }

      if (promoBlock) {
        configSteps.push({
          id: "promo",
          title: "Current Promotion",
          description: "Highlight a special offer.",
          render: () => (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Promo Title</Label>
                <Input 
                  value={String(promoBlock.props.title ?? "")} 
                  onChange={(e) => updateBlock(promoBlock.id, { title: e.target.value })} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Offer Details</Label>
                <Textarea 
                  value={String(promoBlock.props.subtitle ?? "")} 
                  onChange={(e) => updateBlock(promoBlock.id, { subtitle: e.target.value })} 
                />
              </div>
            </div>
          )
        });
      }

      configSteps.push({
        id: "done",
        title: "All Set!",
        description: "You've completed the basic setup for this page.",
        render: () => (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Looking good!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your page is ready. Save your changes or switch to Advanced Mode for more detailed control over layout and content.
              </p>
            </div>
          </div>
        )
      });
      
      return configSteps;
    },
    product: () => {
      const configSteps: WizardStep[] = [];
      const productBlock = page.blocks.find(b => b.type.includes("product"));

      if (productBlock) {
        configSteps.push({
          id: "product_details",
          title: "Product Layout",
          description: "Customize how products are displayed.",
          render: () => (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Primary Call to Action</Label>
                <Input 
                  value={String((productBlock.props as Record<string, unknown>).ctaText ?? "Add to Cart")} 
                  onChange={(e) => updateBlock(productBlock.id, { ctaText: e.target.value })} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Show Badges</Label>
                <Input 
                  value={String((productBlock.props as Record<string, unknown>).badgeText ?? "")} 
                  onChange={(e) => updateBlock(productBlock.id, { badgeText: e.target.value })} 
                  placeholder="e.g. Bestseller"
                />
              </div>
            </div>
          )
        });
      }

      configSteps.push({
        id: "done",
        title: "All Set!",
        description: "You've completed the basic setup for this page.",
        render: () => (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Looking good!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your product page is ready. Save changes or switch to Advanced Mode for more layout control.
              </p>
            </div>
          </div>
        )
      });
      return configSteps;
    },
    collection: () => {
      const configSteps: WizardStep[] = [];
      const collectionBlock = page.blocks.find(b => b.type.includes("collection") || b.type.includes("category"));

      if (collectionBlock) {
        configSteps.push({
          id: "collection_layout",
          title: "Collection Display",
          description: "Configure collection title and subtitle.",
          render: () => (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Collection Title</Label>
                <Input 
                  value={String((collectionBlock.props as Record<string, unknown>).title ?? "Our Collection")} 
                  onChange={(e) => updateBlock(collectionBlock.id, { title: e.target.value })} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea 
                  value={String((collectionBlock.props as Record<string, unknown>).subtitle ?? "")} 
                  onChange={(e) => updateBlock(collectionBlock.id, { subtitle: e.target.value })} 
                />
              </div>
            </div>
          )
        });
      }

      configSteps.push({
        id: "done",
        title: "All Set!",
        description: "You've completed the basic setup for this page.",
        render: () => (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Looking good!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your collection page is ready. Save changes or switch to Advanced Mode for more detailed control.
              </p>
            </div>
          </div>
        )
      });
      return configSteps;
    },
    checkout: () => {
      const configSteps: WizardStep[] = [];
      
      configSteps.push({
        id: "checkout_branding",
        title: "Checkout Branding",
        description: "Keep your checkout consistent with your store.",
        render: () => (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Checkout Button Color</Label>
              <div className="flex items-center gap-2">
                 <Input 
                   type="color" 
                   className="h-10 w-16 p-1 cursor-pointer"
                   value={primaryHex}
                   onChange={(e) => updateThemeToken("--primary", e.target.value)} 
                 />
                 <span className="text-sm text-muted-foreground">Used for the main payment button.</span>
              </div>
            </div>
          </div>
        )
      });

      configSteps.push({
        id: "done",
        title: "All Set!",
        description: "You've completed the basic setup for this page.",
        render: () => (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Checkout Ready</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your checkout page looks great.
              </p>
            </div>
          </div>
        )
      });
      return configSteps;
    },
    custom: () => {
      const configSteps: WizardStep[] = [];
      
      configSteps.push({
        id: "custom_page_title",
        title: "Page Settings",
        description: "Basic settings for this custom page.",
        render: () => (
          <div className="grid gap-4">
             <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
               <LayoutTemplate className="h-8 w-8 text-muted-foreground" />
               <p className="text-sm text-muted-foreground">
                 This is a custom page. Use the Layout tab to add sections, and the Content tab to edit them. For full control, switch to Advanced Mode.
               </p>
             </div>
          </div>
        )
      });

      return configSteps;
    }
  };

  const allSteps = pageWizardConfig[pageType]?.() || pageWizardConfig.custom();
  const steps = allSteps;

  const step = steps[currentStep];

  if (!step) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
        <p className="text-sm text-muted-foreground">{step.description}</p>
        
        <div className="mt-4 flex gap-1">
          {steps.map((s, i) => (
            <div 
              key={s.id} 
              className={`h-1.5 flex-1 rounded-full ${i <= currentStep ? "bg-primary" : "bg-primary/20"}`} 
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-4">
        {step.render()}
      </div>

      <Separator className="my-4" />

      <div className="flex items-center justify-between">
        <Button 
          type="button" 
          variant="ghost" 
          disabled={currentStep === 0} 
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button 
          type="button" 
          disabled={currentStep === steps.length - 1}
          onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
