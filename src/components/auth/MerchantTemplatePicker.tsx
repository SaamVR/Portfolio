"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  LayoutTemplate,
  Loader2,
  Monitor,
  Search,
  Smartphone,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getStorefrontTemplateDefinition,
  getStorefrontTemplateSeedDefinition,
  storefrontTemplateOptions,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import { getStorefrontTemplateReferenceImage } from "@/lib/cms/storefront-template-reference-images";

type MerchantTemplatePickerProps = {
  selectedId: StorefrontTemplateId;
  onSelect: (templateId: StorefrontTemplateId) => void;
  storeName: string;
  storeUrl: string;
  launching: boolean;
  submitError?: string | null;
  isAdditionalStoreFlow?: boolean;
  onBack: () => void;
  onLaunch: () => void;
};

type PreviewMode = "desktop" | "mobile";

const suggestedStarterIds = new Set<StorefrontTemplateId>([
  "general-catalog",
  "fashion",
  "beauty",
  "single-product",
  "service",
  "booking",
]);

function formatToken(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function MerchantTemplatePicker({
  selectedId,
  onSelect,
  storeName,
  storeUrl,
  launching,
  submitError,
  isAdditionalStoreFlow = false,
  onBack,
  onLaunch,
}: MerchantTemplatePickerProps) {
  const [activeGroup, setActiveGroup] = useState("Recommended");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewId, setPreviewId] = useState<StorefrontTemplateId | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");

  const templates = useMemo(
    () =>
      storefrontTemplateOptions.map((option) => {
        const seed = getStorefrontTemplateSeedDefinition(option.value);
        const definition = getStorefrontTemplateDefinition(option.value);
        return {
          id: option.value,
          label: option.label,
          description: option.description,
          seed,
          definition,
          image: getStorefrontTemplateReferenceImage(option.value),
        };
      }),
    [],
  );

  const groups = useMemo(
    () => ["Recommended", "All", ...Array.from(new Set(templates.map((template) => template.seed.group)))],
    [templates],
  );

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesGroup = activeGroup === "All"
        || (activeGroup === "Recommended" && suggestedStarterIds.has(template.id))
        || template.seed.group === activeGroup;
      const searchHaystack = [
        template.label,
        template.description,
        template.seed.group,
        template.seed.businessFamily,
        template.seed.catalogMode,
        ...template.seed.capabilities,
      ].join(" ").toLowerCase();
      return matchesGroup && (!query || searchHaystack.includes(query));
    });
  }, [activeGroup, searchQuery, templates]);

  const selectedTemplate = templates.find((template) => template.id === selectedId) ?? templates[0];
  const previewTemplate = templates.find((template) => template.id === previewId) ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-background p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1.5"><Sparkles className="h-3 w-3" /> Design your launch</Badge>
              <Badge variant="outline">All templates remain editable later</Badge>
            </div>
            <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight sm:text-3xl">Choose the storefront that fits your business.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Start from a complete storefront instead of a blank page. You can change colors, sections, content, and even the template after launch.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/80 px-4 py-3 text-sm shadow-sm">
            <p className="font-semibold text-foreground">{storeName || "Your store"}</p>
            <p className="mt-0.5 max-w-[260px] truncate text-xs text-muted-foreground">{storeUrl}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groups.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setActiveGroup(group)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                activeGroup === group
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground",
              )}
            >
              {group}
            </button>
          ))}
        </div>
        <div className="relative w-full xl:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search templates..."
            className="h-10 rounded-xl pl-9"
          />
        </div>
      </div>

      {filteredTemplates.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {filteredTemplates.map((template) => {
            const isSelected = template.id === selectedId;
            return (
              <article
                key={template.id}
                className={cn(
                  "group overflow-hidden rounded-3xl border bg-card transition-all duration-300",
                  isSelected
                    ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/15"
                    : "border-border hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl",
                )}
              >
                <button type="button" onClick={() => onSelect(template.id)} className="block w-full text-left">
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {template.image ? (
                      <img
                        src={template.image}
                        alt={`${template.label} storefront preview`}
                        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.025]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <LayoutTemplate className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
                      <div className="flex flex-wrap gap-2">
                        {suggestedStarterIds.has(template.id) ? (
                          <Badge className="border-0 bg-black/75 text-white backdrop-blur">Recommended</Badge>
                        ) : null}
                        <Badge className="border-0 bg-white/90 text-slate-900 backdrop-blur">{template.seed.group}</Badge>
                      </div>
                      {isSelected ? (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : null}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-4 pt-12 text-white">
                      <p className="font-heading text-lg font-bold">{template.label}</p>
                      <p className="mt-0.5 text-xs text-white/80">{formatToken(template.seed.catalogMode)}</p>
                    </div>
                  </div>
                </button>

                <div className="p-4 sm:p-5">
                  <p className="min-h-[48px] text-sm leading-6 text-muted-foreground">{template.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.seed.capabilities.slice(0, 3).map((capability) => (
                      <span key={capability} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                        {formatToken(capability)}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Best for</p>
                      <p className="mt-0.5 text-xs font-medium text-foreground">{formatToken(template.seed.businessFamily)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPreviewId(template.id);
                          setPreviewMode("desktop");
                        }}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "secondary"}
                        onClick={() => onSelect(template.id)}
                      >
                        {isSelected ? "Selected" : "Choose"}
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center">
          <LayoutTemplate className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold text-foreground">No templates match that filter.</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another category or clear your search.</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => { setSearchQuery(""); setActiveGroup("All"); }}>
            Show all templates
          </Button>
        </div>
      )}

      <div className="sticky bottom-3 z-20 rounded-3xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
              {selectedTemplate.image ? <img src={selectedTemplate.image} alt="" className="h-full w-full object-cover object-top" /> : null}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Selected storefront</p>
              <p className="truncate font-heading text-base font-bold text-foreground">{selectedTemplate.label}</p>
              <p className="truncate text-xs text-muted-foreground">{selectedTemplate.seed.group} · {formatToken(selectedTemplate.seed.catalogMode)}</p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button type="button" variant="outline" onClick={onBack} className="h-11 flex-1 lg:flex-none">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button type="button" data-testid="merchant-signup-submit" onClick={onLaunch} disabled={launching} className="h-11 flex-[1.5] lg:min-w-48">
              {launching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
              {isAdditionalStoreFlow ? "Create Store" : "Create My Store"}
              {!launching ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </Button>
          </div>
        </div>
        {submitError ? (
          <p className="mt-3 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">{submitError}</p>
        ) : null}
      </div>

      <Dialog open={Boolean(previewTemplate)} onOpenChange={(open) => { if (!open) setPreviewId(null); }}>
        <DialogContent className="max-w-6xl overflow-hidden p-0">
          {previewTemplate ? (
            <>
              <DialogHeader className="border-b border-border px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <DialogTitle className="font-heading text-xl">{previewTemplate.label}</DialogTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{previewTemplate.description}</p>
                  </div>
                  <div className="flex rounded-xl border border-border bg-secondary/40 p-1">
                    <button type="button" onClick={() => setPreviewMode("desktop")} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium", previewMode === "desktop" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                      <Monitor className="h-3.5 w-3.5" /> Desktop
                    </button>
                    <button type="button" onClick={() => setPreviewMode("mobile")} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium", previewMode === "mobile" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                      <Smartphone className="h-3.5 w-3.5" /> Mobile
                    </button>
                  </div>
                </div>
              </DialogHeader>
              <div className="bg-muted/40 p-4 sm:p-7">
                <div className={cn("mx-auto overflow-hidden border border-border bg-background shadow-2xl transition-all", previewMode === "desktop" ? "max-w-5xl rounded-2xl" : "max-w-[360px] rounded-[2.25rem] border-[6px] border-foreground/80")}>
                  <div className={cn("flex items-center gap-1.5 border-b border-border bg-secondary/50 px-3", previewMode === "desktop" ? "h-9" : "h-7")}>
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
                    <span className="ml-2 truncate text-[10px] text-muted-foreground">{storeUrl}</span>
                  </div>
                  <div className={cn("overflow-hidden bg-muted", previewMode === "desktop" ? "aspect-[16/10]" : "aspect-[9/16]")}>
                    {previewTemplate.image ? (
                      <img src={previewTemplate.image} alt={`${previewTemplate.label} preview`} className={cn("h-full w-full object-cover object-top", previewMode === "mobile" && "scale-[1.08]")} />
                    ) : (
                      <div className="flex h-full items-center justify-center"><LayoutTemplate className="h-10 w-10 text-muted-foreground" /></div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-muted-foreground">Preview is a visual reference. Content, colors, blocks, and imagery remain editable in the CMS.</p>
                <Button type="button" onClick={() => { onSelect(previewTemplate.id); setPreviewId(null); }}>
                  <Check className="mr-2 h-4 w-4" /> Use {previewTemplate.label}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
