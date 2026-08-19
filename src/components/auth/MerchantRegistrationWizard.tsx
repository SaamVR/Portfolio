"use client";

import { Check, ChevronLeft, ChevronRight, LayoutGrid, MessageCircle, Palette, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { StorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";

export type RegistrationDesignTone = "clean" | "bold" | "soft" | "editorial";

export type MerchantRegistrationAnswers = {
  selectedSections: string[];
  designTone: RegistrationDesignTone;
  heroTitle: string;
  heroSubtitle: string;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  deliveryEnabled: boolean;
  deliveryFee: string;
  deliveryFeeOutside: string;
};

type Props = {
  template: StorefrontTemplateDefinition;
  value: MerchantRegistrationAnswers;
  onChange: (next: MerchantRegistrationAnswers) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitError?: string | null;
  additionalStore?: boolean;
};

const sectionLabels: Record<string, { label: string; description: string }> = {
  hero: { label: "Hero banner", description: "Main opening message and call to action." },
  "promo-banner": { label: "Promo banner", description: "Highlight an offer, launch, or campaign." },
  "category-showcase": { label: "Categories", description: "Help visitors browse key collections quickly." },
  "featured-products": { label: "Featured products", description: "Show important products or services on the homepage." },
  "rich-text": { label: "About / story", description: "Add a short brand, service, or business introduction." },
  "trust-badges": { label: "Trust signals", description: "Delivery, payment, authenticity, and support cues." },
  testimonials: { label: "Testimonials", description: "Reserve space for customer feedback and social proof." },
  "faq-accordion": { label: "FAQ", description: "Answer delivery, ordering, service, or policy questions." },
  "social-feed": { label: "Social gallery", description: "Show visual posts or campaign images." },
  comparison: { label: "Comparison", description: "Compare options, packages, or product features." },
  "recommended-products": { label: "Recommendations", description: "Surface related or suggested products." },
  "recently-viewed": { label: "Recently viewed", description: "Help returning shoppers continue browsing." },
};

const designTones: Array<{ id: RegistrationDesignTone; label: string; description: string; radius: string }> = [
  { id: "clean", label: "Clean & minimal", description: "Simple spacing, restrained cards, and a polished storefront feel.", radius: "rounded-xl" },
  { id: "bold", label: "Bold & promotional", description: "Stronger visual hierarchy for launches, offers, and campaigns.", radius: "rounded-lg" },
  { id: "soft", label: "Soft & friendly", description: "More rounded surfaces and an approachable customer-facing tone.", radius: "rounded-3xl" },
  { id: "editorial", label: "Editorial", description: "Sharper layout rhythm for fashion, premium, or story-led brands.", radius: "rounded-sm" },
];

export function createDefaultRegistrationAnswers(template: StorefrontTemplateDefinition): MerchantRegistrationAnswers {
  const recommended = template.defaultBlockSet.length > 0 ? template.defaultBlockSet : template.recommendedBlockSet;
  const selectable = recommended.filter((id) => sectionLabels[id]);
  return {
    selectedSections: selectable.length > 0 ? selectable : ["hero", "featured-products", "faq-accordion"],
    designTone: "clean",
    heroTitle: "",
    heroSubtitle: "",
    whatsappEnabled: false,
    whatsappNumber: "",
    deliveryEnabled: true,
    deliveryFee: "80",
    deliveryFeeOutside: "140",
  };
}

export default function MerchantRegistrationWizard({
  template,
  value,
  onChange,
  onBack,
  onSubmit,
  submitting = false,
  submitError,
  additionalStore = false,
}: Props) {
  const recommended = Array.from(new Set([...template.defaultBlockSet, ...template.recommendedBlockSet]))
    .filter((id) => sectionLabels[id])
    .slice(0, 10);

  const toggleSection = (sectionId: string) => {
    const exists = value.selectedSections.includes(sectionId);
    const selectedSections = exists
      ? value.selectedSections.filter((id) => id !== sectionId)
      : [...value.selectedSections, sectionId];
    if (selectedSections.length === 0) return;
    onChange({ ...value, selectedSections });
  };

  const update = <K extends keyof MerchantRegistrationAnswers>(key: K, next: MerchantRegistrationAnswers[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="space-y-7" data-testid="merchant-registration-wizard">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Quick setup — not the full Onboarding</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Answer only the basics needed to prepare a better starting storefront. Everything can be changed later from the CMS.
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><LayoutGrid className="h-4 w-4" /></span>
          <div><h3 className="text-base font-semibold">1. Which homepage sections do you want?</h3><p className="text-xs text-muted-foreground">We preselected the sections recommended for {template.label}.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {recommended.map((sectionId) => {
            const item = sectionLabels[sectionId];
            const active = value.selectedSections.includes(sectionId);
            return (
              <button
                key={sectionId}
                type="button"
                onClick={() => toggleSection(sectionId)}
                className={cn(
                  "relative rounded-2xl border p-4 text-left transition-all",
                  active ? "border-primary bg-primary/5 ring-1 ring-primary/15" : "border-border hover:border-primary/30",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-semibold text-foreground">{item.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p></div>
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", active ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent")}><Check className="h-3.5 w-3.5" /></span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Palette className="h-4 w-4" /></span>
          <div><h3 className="text-base font-semibold">2. What should the design feel like?</h3><p className="text-xs text-muted-foreground">This sets the initial visual tone; the selected template still controls the core layout.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {designTones.map((tone) => {
            const active = value.designTone === tone.id;
            return (
              <button
                key={tone.id}
                type="button"
                onClick={() => update("designTone", tone.id)}
                className={cn("border p-4 text-left transition-all", tone.radius, active ? "border-primary bg-primary/5 ring-1 ring-primary/15" : "border-border hover:border-primary/30")}
              >
                <div className="mb-3 flex gap-1.5">
                  <span className={cn("h-7 flex-1 bg-primary/15", tone.radius)} />
                  <span className={cn("h-7 w-8 bg-secondary", tone.radius)} />
                </div>
                <p className="text-sm font-semibold text-foreground">{tone.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{tone.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><MessageCircle className="h-4 w-4" /></span>
          <div><h3 className="text-base font-semibold">3. Add a few starter details</h3><p className="text-xs text-muted-foreground">Optional. Leave anything blank and finish it later in Onboarding or the editor.</p></div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border p-4">
            <div><Label htmlFor="registration-hero-title">Homepage headline</Label><Input id="registration-hero-title" value={value.heroTitle} onChange={(e) => update("heroTitle", e.target.value)} placeholder="e.g. Everyday essentials, made better" className="mt-2" /></div>
            <div><Label htmlFor="registration-hero-subtitle">Short supporting text</Label><Textarea id="registration-hero-subtitle" value={value.heroSubtitle} onChange={(e) => update("heroSubtitle", e.target.value)} placeholder="Tell customers what makes the store worth exploring." className="mt-2 min-h-24" /></div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /><div><p className="text-sm font-semibold">WhatsApp support</p><p className="text-xs text-muted-foreground">Show a quick contact option.</p></div></div>
              <Switch checked={value.whatsappEnabled} onCheckedChange={(checked) => update("whatsappEnabled", checked)} />
            </div>
            {value.whatsappEnabled ? <div><Label htmlFor="registration-whatsapp">WhatsApp number</Label><Input id="registration-whatsapp" value={value.whatsappNumber} onChange={(e) => update("whatsappNumber", e.target.value)} placeholder="+8801XXXXXXXXX" className="mt-2" /></div> : null}

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /><div><p className="text-sm font-semibold">Delivery pricing</p><p className="text-xs text-muted-foreground">Add simple inside/outside delivery fees.</p></div></div>
                <Switch checked={value.deliveryEnabled} onCheckedChange={(checked) => update("deliveryEnabled", checked)} />
              </div>
              {value.deliveryEnabled ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div><Label htmlFor="registration-delivery-inside">Inside Dhaka</Label><Input id="registration-delivery-inside" inputMode="decimal" value={value.deliveryFee} onChange={(e) => update("deliveryFee", e.target.value)} placeholder="80" className="mt-2" /></div>
                  <div><Label htmlFor="registration-delivery-outside">Outside Dhaka</Label><Input id="registration-delivery-outside" inputMode="decimal" value={value.deliveryFeeOutside} onChange={(e) => update("deliveryFeeOutside", e.target.value)} placeholder="140" className="mt-2" /></div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {submitError ? <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{submitError}</div> : null}

      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={submitting} className="justify-start"><ChevronLeft className="mr-2 h-4 w-4" /> Back to design</Button>
        <div className="text-center sm:text-right"><p className="text-sm font-semibold text-foreground">Your quick setup is ready</p><p className="text-xs text-muted-foreground">Next creates the store and applies these answers.</p></div>
        <Button type="button" data-testid="merchant-signup-submit" onClick={onSubmit} disabled={submitting} className="h-11 min-w-44 rounded-xl">
          {submitting ? "Creating store..." : additionalStore ? "Create additional store" : "Create my store"}
          {!submitting ? <ChevronRight className="ml-2 h-4 w-4" /> : null}
        </Button>
      </div>
    </div>
  );
}
