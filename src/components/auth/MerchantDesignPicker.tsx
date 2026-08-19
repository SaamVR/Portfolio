"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, LayoutTemplate, Monitor, Search, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getStorefrontTemplateDefinition,
  getStorefrontTemplateSeedDefinition,
  storefrontTemplateOptions,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import { getStorefrontTemplateReferenceImage } from "@/lib/cms/storefront-template-reference-images";

const recommendedIds: StorefrontTemplateId[] = ["general-catalog", "fashion", "food", "service", "single-product", "beauty"];

function formatMode(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type Props = {
  selectedId: StorefrontTemplateId;
  onSelect: (templateId: StorefrontTemplateId) => void;
  onBack: () => void;
  onContinue: () => void;
  storeName: string;
};

export default function MerchantDesignPicker({ selectedId, onSelect, onBack, onContinue, storeName }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Recommended");
  const [previewId, setPreviewId] = useState<StorefrontTemplateId | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");

  const templates = useMemo(() => storefrontTemplateOptions.map((option) => {
    const seed = getStorefrontTemplateSeedDefinition(option.value);
    const definition = getStorefrontTemplateDefinition(option.value);
    return {
      id: option.value,
      label: option.label,
      description: option.description,
      group: seed.group,
      catalogMode: seed.catalogMode,
      capabilities: seed.capabilities,
      image: getStorefrontTemplateReferenceImage(option.value),
      cardStyle: definition.presentation.cardStyle,
    };
  }), []);

  const categories = useMemo(() => ["Recommended", "All", ...Array.from(new Set(templates.map((item) => item.group)))], [templates]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return templates.filter((item) => {
      const categoryMatch = category === "All" || (category === "Recommended" ? recommendedIds.includes(item.id) : item.group === category);
      const searchMatch = !needle || [item.label, item.description, item.group, item.catalogMode, ...item.capabilities].join(" ").toLowerCase().includes(needle);
      return categoryMatch && searchMatch;
    });
  }, [category, search, templates]);

  const selected = templates.find((item) => item.id === selectedId) ?? templates[0];
  const preview = previewId ? templates.find((item) => item.id === previewId) : null;

  return (
    <div className="space-y-6" data-testid="merchant-design-picker">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
          <div><p className="text-sm font-semibold">Choose the closest starting design</p><p className="mt-1 text-xs leading-5 text-muted-foreground">You are choosing a starting point, not locking the store forever. Sections, colors, copy, and layout can be edited later.</p></div>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => <Button key={item} type="button" size="sm" variant={category === item ? "default" : "outline"} onClick={() => setCategory(item)} className="rounded-full">{item}</Button>)}
        </div>
        <div className="relative min-w-0 lg:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." className="pl-9" /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => {
          const active = selectedId === item.id;
          return (
            <article key={item.id} className={cn("overflow-hidden rounded-3xl border bg-card transition-all", active ? "border-primary ring-2 ring-primary/15 shadow-lg" : "border-border hover:border-primary/35")}> 
              <button type="button" onClick={() => onSelect(item.id)} className="block w-full text-left">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {item.image ? <img src={item.image} alt={`${item.label} storefront preview`} className="h-full w-full object-cover object-top transition-transform duration-300 hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center"><LayoutTemplate className="h-8 w-8 text-muted-foreground" /></div>}
                  <div className="absolute left-3 top-3 flex gap-2"><Badge className="bg-background/90 text-foreground backdrop-blur">{item.group}</Badge>{recommendedIds.includes(item.id) ? <Badge className="bg-primary/90 text-primary-foreground">Recommended</Badge> : null}</div>
                  {active ? <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"><Check className="h-4 w-4" /></span> : null}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="font-heading text-lg font-bold text-foreground">{item.label}</h3><p className="mt-1 text-xs font-medium text-primary">{formatMode(item.catalogMode)}</p></div><Badge variant="secondary">Mobile ready</Badge></div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{item.capabilities.slice(0, 3).map((capability) => <span key={capability} className="rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground">{capability}</span>)}</div>
                </div>
              </button>
              <div className="flex gap-2 border-t border-border p-3">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => { setPreviewId(item.id); setViewport("desktop"); }}><Eye className="mr-2 h-3.5 w-3.5" /> Preview</Button>
                <Button type="button" size="sm" className="flex-1" variant={active ? "default" : "secondary"} onClick={() => onSelect(item.id)}>{active ? "Selected" : "Use this"}</Button>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No templates match that search. Try another category or keyword.</div> : null}

      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}><ChevronLeft className="mr-2 h-4 w-4" /> Back to store</Button>
        <div className="min-w-0 text-center sm:text-left"><p className="truncate text-sm font-semibold text-foreground">{selected?.label} selected for {storeName || "your store"}</p><p className="text-xs text-muted-foreground">Next: a short setup questionnaire.</p></div>
        <Button type="button" data-testid="merchant-signup-design-next" onClick={onContinue} className="h-11 rounded-xl">Continue to setup <ChevronRight className="ml-2 h-4 w-4" /></Button>
      </div>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreviewId(null)}>
        <DialogContent className="max-w-6xl overflow-hidden p-0">
          {preview ? (
            <div className="flex max-h-[90vh] flex-col">
              <DialogHeader className="border-b border-border p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><DialogTitle>{preview.label}</DialogTitle><p className="mt-1 text-sm text-muted-foreground">{preview.description}</p></div><div className="flex rounded-xl border border-border p-1"><Button type="button" size="sm" variant={viewport === "desktop" ? "secondary" : "ghost"} onClick={() => setViewport("desktop")}><Monitor className="mr-2 h-4 w-4" /> Desktop</Button><Button type="button" size="sm" variant={viewport === "mobile" ? "secondary" : "ghost"} onClick={() => setViewport("mobile")}><Smartphone className="mr-2 h-4 w-4" /> Mobile</Button></div></div>
              </DialogHeader>
              <div className="overflow-auto bg-secondary/35 p-4 sm:p-8"><div className={cn("mx-auto overflow-hidden border border-border bg-background shadow-2xl transition-all", viewport === "mobile" ? "max-w-[390px] rounded-[2rem]" : "max-w-5xl rounded-2xl")}>{preview.image ? <img src={preview.image} alt={`${preview.label} preview`} className="h-auto w-full object-cover object-top" /> : null}</div></div>
              <div className="flex items-center justify-between gap-3 border-t border-border p-4"><p className="text-xs text-muted-foreground">Preview imagery represents the template’s starting visual direction.</p><Button type="button" onClick={() => { onSelect(preview.id); setPreviewId(null); }}>Use {preview.label}</Button></div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
