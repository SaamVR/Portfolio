import type { StorePageBlock } from "@/lib/cms/schema";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import type { StorefrontVariantDefinition } from "@/lib/cms/storefront-platform/variants/contracts";
import { getSectionStylePreviewFixtureById } from "@/lib/cms/storefront-platform/variants/preview-fixtures";
import { cn } from "@/lib/utils";

export type SectionStylePreviewMode = "desktop" | "mobile";

function PreviewImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  if (!src) return <div className={cn("bg-gradient-to-br from-emerald-900 via-emerald-700 to-amber-200", className)} />;
  return <SafeStorefrontImage src={src} alt={alt} width={480} height={320} className={cn("object-cover", className)} />;
}

function HeroPreview({ definition, mode }: { definition: StorefrontVariantDefinition; mode: SectionStylePreviewMode }) {
  const fixture = getSectionStylePreviewFixtureById(definition.previewSpec.fixtureId, "hero");
  const mobile = mode === "mobile";
  const copy = (
    <div className={cn("flex min-w-0 flex-col justify-center", mobile ? "gap-1.5 p-3" : "gap-2 p-4")}>
      <span className="text-[7px] font-semibold uppercase tracking-[0.18em] text-emerald-700">{fixture.eyebrow}</span>
      <p className={cn("font-serif font-semibold leading-[0.96] text-slate-950", mobile ? "text-[16px]" : "text-[20px]")}>{fixture.title}</p>
      <p className={cn("line-clamp-2 leading-snug text-slate-600", mobile ? "text-[7px]" : "text-[8px]")}>{fixture.subtitle}</p>
      <span className="mt-1 w-fit rounded-full bg-emerald-900 px-2.5 py-1 text-[7px] font-semibold text-white">{fixture.ctaLabel}</span>
    </div>
  );

  if (definition.id === "full-bleed") {
    return (
      <div className="relative h-full overflow-hidden bg-slate-950">
        <PreviewImage src={fixture.primaryMediaUrl} alt="Hero preview" className="h-full w-full opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/15 to-transparent" />
        <div className={cn("absolute inset-x-0 bottom-0 text-white", mobile ? "p-3" : "p-4")}>
          <span className="text-[7px] font-semibold uppercase tracking-[0.18em] text-white/70">{fixture.eyebrow}</span>
          <p className={cn("mt-1 max-w-[78%] font-serif font-semibold leading-none", mobile ? "text-[15px]" : "text-[20px]")}>{fixture.title}</p>
          <p className="mt-1.5 max-w-[70%] line-clamp-2 text-[7px] text-white/70">{fixture.subtitle}</p>
          <span className="mt-2 inline-block rounded-full bg-white px-2 py-1 text-[7px] font-semibold text-slate-950">{fixture.ctaLabel}</span>
        </div>
      </div>
    );
  }

  if (definition.id === "poster") {
    return (
      <div className="relative h-full overflow-hidden bg-slate-950">
        <PreviewImage src={fixture.primaryMediaUrl} alt="Hero preview" className="h-full w-full opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-2 border border-white/45" />
        <div className={cn("absolute inset-x-0 bottom-0 text-white", mobile ? "p-4" : "p-5")}>
          <div className="flex items-center justify-between border-b border-white/40 pb-1 text-[6px] uppercase tracking-[0.2em] text-white/70"><span>{fixture.eyebrow}</span><span>Campaign</span></div>
          <p className={cn("mt-2 max-w-[88%] font-sans font-black uppercase leading-[0.83] tracking-[-0.05em]", mobile ? "text-[18px]" : "text-[25px]")}>{fixture.title}</p>
          <span className="mt-2 inline-block border-b border-white pb-0.5 text-[7px] font-semibold uppercase">{fixture.ctaLabel}</span>
        </div>
      </div>
    );
  }

  if (definition.id === "centered") {
    return (
      <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#f4efe4] text-center">
        <div className="absolute inset-x-0 top-0 h-[35%] overflow-hidden opacity-30"><PreviewImage src={fixture.primaryMediaUrl} alt="Hero preview" className="h-full w-full" /></div>
        <div className={cn("relative z-10 max-w-[80%]", mobile ? "pt-5" : "pt-4")}>
          <span className="text-[7px] font-semibold uppercase tracking-[0.18em] text-emerald-700">{fixture.eyebrow}</span>
          <p className={cn("mt-1 font-serif font-semibold leading-none text-slate-950", mobile ? "text-[16px]" : "text-[20px]")}>{fixture.title}</p>
          <p className="mx-auto mt-1.5 line-clamp-2 text-[7px] leading-snug text-slate-600">{fixture.subtitle}</p>
          <span className="mt-2 inline-block rounded-full bg-emerald-900 px-2.5 py-1 text-[7px] font-semibold text-white">{fixture.ctaLabel}</span>
        </div>
      </div>
    );
  }

  if (definition.id === "editorial") {
    return (
      <div className={cn("grid h-full gap-1 bg-[#f7f3ea] p-2", mobile ? "grid-rows-[0.52fr_0.48fr]" : "grid-cols-[1.08fr_0.72fr]")}>
        <div className="flex min-w-0 flex-col justify-between border-y border-slate-300 py-2">
          <div><span className="text-[6px] font-semibold uppercase tracking-[0.22em] text-emerald-700">{fixture.eyebrow}</span><p className={cn("mt-1 max-w-[8ch] font-sans font-black leading-[0.82] tracking-[-0.06em] text-slate-950", mobile ? "text-[18px]" : "text-[25px]")}>{fixture.title}</p></div>
          <p className="line-clamp-2 max-w-[85%] text-[7px] text-slate-600">{fixture.subtitle}</p>
        </div>
        <PreviewImage src={fixture.primaryMediaUrl} alt="Hero preview" className="h-full w-full" />
      </div>
    );
  }

  if (definition.id === "collection-spotlight") {
    return (
      <div className={cn("grid h-full bg-[#f7f3ea]", mobile ? "grid-rows-[0.55fr_0.45fr]" : "grid-cols-[1.15fr_0.85fr]")}>
        <div className="relative overflow-hidden"><PreviewImage src={fixture.primaryMediaUrl} alt="Hero preview" className="h-full w-full" /><span className="absolute bottom-2 left-2 bg-black/55 px-2 py-1 text-[6px] uppercase tracking-wider text-white">Collection</span></div>
        <div className="flex flex-col justify-center bg-white p-3"><span className="text-[7px] uppercase tracking-[0.18em] text-emerald-700">{fixture.eyebrow}</span><p className={cn("mt-1 font-serif font-semibold leading-none", mobile ? "text-[14px]" : "text-[18px]")}>{fixture.title}</p><p className="mt-1.5 line-clamp-2 text-[7px] text-slate-600">{fixture.subtitle}</p><span className="mt-2 w-fit border-b border-emerald-800 pb-0.5 text-[7px] font-semibold text-emerald-900">{fixture.ctaLabel}</span></div>
      </div>
    );
  }

  return (
    <div className={cn("grid h-full overflow-hidden bg-[#f7f3ea]", mobile ? "grid-rows-2" : "grid-cols-2")}>
      {copy}
      <PreviewImage src={fixture.primaryMediaUrl} alt="Hero preview" className="h-full w-full" />
    </div>
  );
}

function CategoryPreview({ definition, mode }: { definition: StorefrontVariantDefinition; mode: SectionStylePreviewMode }) {
  const fixture = getSectionStylePreviewFixtureById(definition.previewSpec.fixtureId, "category-showcase");
  const items = fixture.items ?? [];
  const mobile = mode === "mobile";
  if (definition.id === "compact-list") {
    return <div className="flex h-full flex-col bg-white p-3"><p className="font-serif text-[14px] font-semibold">{fixture.title}</p><div className="mt-2 divide-y divide-slate-200">{items.slice(0, 4).map((item, index) => <div key={item.title} className="flex items-center justify-between py-1.5 text-[8px]"><span>{item.title}</span><span className="text-slate-400">0{index + 1}</span></div>)}</div></div>;
  }
  if (definition.id === "circular-categories") {
    return <div className="h-full bg-[#f7f3ea] p-2.5"><p className="font-serif text-[13px] font-semibold">{fixture.title}</p><div className={cn("mt-2 grid gap-2", mobile ? "grid-cols-2" : "grid-cols-4")}>{items.slice(0, 4).map((item) => <div key={item.title} className="text-center"><div className="mx-auto aspect-square w-[82%] overflow-hidden rounded-full border border-slate-200"><PreviewImage src={item.imageUrl} alt={item.title} className="h-full w-full" /></div><p className="mt-1 truncate text-[7px] font-semibold">{item.title}</p></div>)}</div></div>;
  }
  if (definition.id === "collection-tiles") {
    return <div className="grid h-full grid-cols-2 grid-rows-2 gap-1 bg-[#f7f3ea] p-2">{items.slice(0, 3).map((item, index) => <div key={item.title} className={cn("relative overflow-hidden", index === 0 && "row-span-2")}><PreviewImage src={item.imageUrl} alt={item.title} className="h-full w-full" /><div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" /><span className="absolute bottom-1 left-1 text-[7px] font-semibold text-white">{item.title}</span></div>)}</div>;
  }
  if (definition.id === "masonry") {
    return <div className="grid h-full grid-cols-2 grid-rows-2 gap-1 bg-[#f7f3ea] p-2">{items.slice(0, 3).map((item, index) => <div key={item.title} className={cn("relative overflow-hidden", index === 0 && "row-span-2")}><PreviewImage src={item.imageUrl} alt={item.title} className="h-full w-full" /><span className="absolute bottom-1 left-1 bg-white/90 px-1.5 py-0.5 text-[7px] font-semibold">{item.title}</span></div>)}</div>;
  }
  const cardWidth = definition.id === "carousel" ? (mobile ? "w-[58%] shrink-0" : "w-[30%] shrink-0") : "";
  return <div className="h-full bg-[#f7f3ea] p-2.5"><p className="font-serif text-[13px] font-semibold">{fixture.title}</p><div className={cn("mt-2 gap-1.5", definition.id === "carousel" ? "flex overflow-hidden" : mobile ? "grid grid-cols-2" : "grid grid-cols-4")}>{items.slice(0, 4).map((item) => <div key={item.title} className={cn("overflow-hidden bg-white", cardWidth)}><PreviewImage src={item.imageUrl} alt={item.title} className={cn("w-full", mobile ? "h-12" : "h-16")} /><p className="truncate px-1.5 py-1 text-[7px] font-semibold">{item.title}</p></div>)}</div></div>;
}

function ProductPreview({ definition, mode, blockType }: { definition: StorefrontVariantDefinition; mode: SectionStylePreviewMode; blockType: StorePageBlock["type"] }) {
  const fixture = getSectionStylePreviewFixtureById(definition.previewSpec.fixtureId, blockType);
  const items = fixture.items ?? [];
  const mobile = mode === "mobile";
  const tile = (item: (typeof items)[number], className?: string) => (
    <div className={cn("overflow-hidden bg-white", className)}>
      <PreviewImage src={item.imageUrl} alt={item.title} className={cn("w-full", mobile ? "h-14" : "h-16")} />
      <div className="p-1"><p className="truncate text-[7px] font-semibold">{item.title}</p><p className="text-[6px] text-emerald-800">{item.meta}</p></div>
    </div>
  );
  if (definition.id === "editorial-grid") return <div className="h-full bg-[#f3efe5] p-2"><div className="flex items-end justify-between border-b border-slate-300 pb-1"><p className="max-w-[60%] font-serif text-[14px] font-semibold leading-none">{fixture.title}</p><span className="text-[6px] uppercase">Edit 01</span></div><div className="mt-1.5 grid h-[78%] grid-cols-2 gap-1">{items.slice(0, 3).map((item, index) => <div key={item.title} className={cn(index === 0 && "row-span-2")}>{tile(item, "h-full")}</div>)}</div></div>;
  if (definition.id === "carousel") return <div className="h-full overflow-hidden bg-white p-2"><div className="flex items-end justify-between"><p className="font-serif text-[12px] font-semibold">{fixture.title}</p><span className="text-[6px] uppercase text-emerald-700">View all</span></div><div className="mt-2 flex justify-start gap-1.5">{items.slice(0, 3).map((item) => <div key={item.title} className="w-[31%] shrink-0">{tile(item)}</div>)}</div></div>;
  if (definition.id === "center-focus-rail") return <div className="h-full overflow-hidden bg-[#f3efe5] p-2 text-center"><p className="font-serif text-[13px] font-semibold">{fixture.title}</p><div className="mt-2 flex justify-center gap-1.5">{items.slice(0, 3).map((item, index) => <div key={item.title} className={cn(index === 1 ? "w-[42%]" : "w-[27%] opacity-70")}>{tile(item)}</div>)}</div></div>;
  if (definition.id === "compact-commerce-grid") return <div className="h-full bg-white p-2"><p className="font-serif text-[12px] font-semibold">{fixture.title}</p><div className={cn("mt-1.5 grid gap-1", mobile ? "grid-cols-2" : "grid-cols-4")}>{items.slice(0, 4).map((item) => <div key={item.title}>{tile(item)}</div>)}</div></div>;
  if (definition.id === "product-spotlight") return <div className="h-full bg-[#f7f3ea] p-2"><p className="font-serif text-[13px] font-semibold">{fixture.title}</p><div className="mt-1.5 grid h-[80%] grid-cols-2 gap-1">{items.slice(0, 3).map((item, index) => <div key={item.title} className={cn(index === 0 && "row-span-2")}>{tile(item, "h-full")}</div>)}</div></div>;
  if (definition.id === "magazine-rail") return <div className="h-full overflow-hidden bg-[#f3efe5] p-2"><p className="font-serif text-[13px] font-semibold">{fixture.title}</p><div className="mt-2 flex items-start gap-1.5">{items.slice(0, 4).map((item, index) => <div key={item.title} className={cn("w-[29%] shrink-0", index % 2 === 1 && "pt-3")}>{tile(item)}</div>)}</div></div>;
  if (definition.id === "dense-catalog") return <div className="h-full bg-white p-2"><div className={cn("grid h-full gap-1", mobile ? "grid-cols-2" : "grid-cols-4")}>{items.slice(0, 4).map((item) => <div key={item.title}>{tile(item)}</div>)}</div></div>;
  const sidebar = definition.id.includes("sidebar");
  const columns = definition.id === "2-col" ? 2 : definition.id === "4-col" ? 4 : 3;
  const cards = <div className={cn(definition.id === "carousel" ? "flex gap-1.5 overflow-hidden" : "grid gap-1.5", !definition.id.includes("carousel") && (mobile ? "grid-cols-2" : columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-4" : "grid-cols-3"))}>{items.slice(0, 4).map((item) => <div key={item.title} className={cn("overflow-hidden bg-white", definition.id === "carousel" && (mobile ? "w-[62%] shrink-0" : "w-[30%] shrink-0"))}><PreviewImage src={item.imageUrl} alt={item.title} className={cn("w-full", mobile ? "h-14" : "h-16")} /><div className="p-1"><p className="truncate text-[7px] font-semibold">{item.title}</p><p className="mt-0.5 text-[6px] text-emerald-800">{item.meta}</p></div></div>)}</div>;
  return <div className="h-full bg-[#f3efe5] p-2.5"><div className="flex items-end justify-between"><p className="font-serif text-[13px] font-semibold">{fixture.title}</p><span className="text-[6px] uppercase tracking-widest text-slate-500">Shop all</span></div><div className={cn("mt-2", sidebar && !mobile ? "grid grid-cols-[0.28fr_0.72fr] gap-2" : "")}>{sidebar && !mobile ? <><div className={cn("border border-emerald-900/20 bg-emerald-950 p-2 text-white", definition.id.endsWith("right") && "order-2")}><p className="text-[8px] font-semibold">Curated edit</p><p className="mt-1 text-[6px] text-white/60">A supporting filter or story panel.</p></div><div>{cards}</div></> : cards}</div></div>;
}

function PromoPreview({ definition, mode }: { definition: StorefrontVariantDefinition; mode: SectionStylePreviewMode }) {
  const fixture = getSectionStylePreviewFixtureById(definition.previewSpec.fixtureId, "promo-banner");
  const mobile = mode === "mobile";
  if (definition.id === "contact-cta") return <div className="flex h-full flex-col items-center justify-center bg-emerald-950 p-4 text-center text-white"><span className="text-[7px] uppercase tracking-[0.2em] text-amber-200">Talk to us</span><p className={cn("mt-1 font-serif font-semibold", mobile ? "text-[15px]" : "text-[18px]")}>Need help choosing?</p><p className="mt-1 max-w-[80%] text-[7px] text-white/65">Friendly support, quotes, and product questions.</p><span className="mt-2 rounded-full bg-white px-2.5 py-1 text-[7px] font-semibold text-emerald-950">Contact us</span></div>;
  if (definition.id === "image-campaign-banner") return <div className="relative h-full overflow-hidden bg-slate-950"><PreviewImage src={fixture.primaryMediaUrl} alt="Campaign preview" className="h-full w-full opacity-85" /><div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/30 to-transparent" /><div className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-center p-3 text-white"><span className="text-[7px] uppercase tracking-[0.18em] text-amber-200">{fixture.eyebrow}</span><p className={cn("mt-1 font-serif font-semibold leading-none", mobile ? "text-[15px]" : "text-[19px]")}>{fixture.title}</p><span className="mt-2 w-fit border-b border-white pb-0.5 text-[7px]">{fixture.ctaLabel} →</span></div></div>;
  if (definition.id === "dual-promo") return <div className={cn("grid h-full gap-1 bg-[#f3efe5] p-1.5", mobile ? "grid-rows-2" : "grid-cols-2")}>{[fixture.title, "A second campaign"].map((title, index) => <div key={title} className="relative overflow-hidden bg-slate-900"><PreviewImage src={index === 0 ? fixture.primaryMediaUrl : fixture.secondaryMediaUrl || fixture.primaryMediaUrl} alt={title} className="h-full w-full opacity-75" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-2 text-white"><p className="font-serif text-[11px] font-semibold leading-none">{title}</p><span className="mt-1 inline-block text-[6px] uppercase tracking-wider">Shop now →</span></div></div>)}</div>;
  if (definition.id === "campaign-cta") return <div className="flex h-full items-end bg-emerald-950 p-3 text-white"><div className={cn("grid w-full gap-2", mobile ? "" : "grid-cols-[1fr_auto] items-end")}><div><span className="text-[7px] uppercase tracking-[0.18em] text-white/60">{fixture.eyebrow}</span><p className={cn("mt-1 max-w-[12ch] font-serif font-semibold leading-none", mobile ? "text-[15px]" : "text-[18px]")}>{fixture.title}</p><p className="mt-1 text-[7px] text-white/65">{fixture.subtitle}</p></div><span className="w-fit border-b border-white pb-0.5 text-[7px]">{fixture.ctaLabel} →</span></div></div>;
  return <div className="relative h-full overflow-hidden"><PreviewImage src={fixture.primaryMediaUrl} alt="Promo preview" className="h-full w-full" /><div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 to-transparent" /><div className="absolute inset-y-0 left-0 flex max-w-[72%] flex-col justify-center p-3 text-white"><span className="text-[7px] uppercase tracking-[0.18em] text-amber-200">{fixture.eyebrow}</span><p className={cn("mt-1 font-serif font-semibold leading-none", mobile ? "text-[15px]" : "text-[18px]")}>{fixture.title}</p><span className="mt-2 w-fit border border-white/60 px-2 py-1 text-[7px]">{fixture.ctaLabel}</span></div></div>;
}

function StoryPreview({ definition, mode }: { definition: StorefrontVariantDefinition; mode: SectionStylePreviewMode }) {
  const fixture = getSectionStylePreviewFixtureById(definition.previewSpec.fixtureId, "rich-text");
  const mobile = mode === "mobile";
  if (definition.id === "brand-story" || definition.id === "split-brand-story") return <div className={cn("grid h-full bg-[#f7f3ea]", mobile ? "grid-rows-[0.55fr_0.45fr]" : "grid-cols-2")}><PreviewImage src={fixture.primaryMediaUrl} alt="Story preview" className="h-full w-full" /><div className="flex flex-col justify-center p-3"><span className="text-[7px] uppercase tracking-[0.18em] text-emerald-700">{fixture.eyebrow}</span><p className={cn("mt-1 font-serif font-semibold leading-none", mobile ? "text-[14px]" : "text-[17px]")}>{fixture.title}</p><p className="mt-1.5 line-clamp-3 text-[7px] leading-snug text-slate-600">{fixture.subtitle}</p></div></div>;
  if (definition.id === "editorial-quote") return <div className="flex h-full items-center bg-[#f3efe5] p-3"><div className={cn("grid w-full gap-2 border-y border-slate-300 py-3", mobile ? "" : "grid-cols-[0.25fr_0.75fr]")}><span className="font-serif text-[34px] leading-none text-emerald-800/35">“</span><div><span className="text-[7px] uppercase tracking-[0.18em] text-emerald-700">{fixture.eyebrow}</span><p className={cn("mt-1 font-serif font-semibold leading-tight", mobile ? "text-[14px]" : "text-[16px]")}>{fixture.title}</p><p className="mt-1.5 line-clamp-2 text-[7px] text-slate-600">{fixture.subtitle}</p></div></div></div>;
  if (definition.id === "minimal-story") return <div className="flex h-full items-center bg-white p-4"><div className="border-l border-emerald-700/40 pl-3"><span className="text-[7px] uppercase tracking-[0.18em] text-emerald-700">{fixture.eyebrow}</span><p className={cn("mt-1 font-serif font-semibold", mobile ? "text-[15px]" : "text-[17px]")}>{fixture.title}</p><p className="mt-1.5 max-w-[90%] text-[7px] leading-relaxed text-slate-600">{fixture.subtitle}</p></div></div>;
  if (definition.id === "blog-posts") return <div className="h-full bg-white p-3"><span className="text-[7px] uppercase tracking-[0.18em] text-emerald-700">Journal</span><p className="mt-1 font-serif text-[15px] font-semibold">From the studio</p><div className="mt-2 space-y-1.5">{["How we make it", "Materials worth keeping", "A slower way to shop"].map((title) => <div key={title} className="flex items-center justify-between border-t border-slate-200 py-1.5 text-[7px]"><span>{title}</span><span>→</span></div>)}</div></div>;
  return <div className="flex h-full items-center bg-white p-4"><div><span className="text-[7px] uppercase tracking-[0.18em] text-emerald-700">{fixture.eyebrow}</span><p className="mt-1 font-serif text-[16px] font-semibold">{fixture.title}</p><p className="mt-1.5 max-w-[90%] text-[7px] leading-relaxed text-slate-600">{fixture.subtitle}</p></div></div>;
}

function GenericPreview({ blockType, definition }: { blockType: StorePageBlock["type"]; definition: StorefrontVariantDefinition }) {
  const fixture = getSectionStylePreviewFixtureById(definition.previewSpec.fixtureId, blockType);
  return <div className="flex h-full flex-col justify-center bg-[#f7f3ea] p-3"><span className="text-[7px] uppercase tracking-[0.18em] text-emerald-700">{fixture.eyebrow ?? blockType.replaceAll("-", " ")}</span><p className="mt-1 font-serif text-[15px] font-semibold text-slate-950">{fixture.title}</p><p className="mt-1 text-[7px] text-slate-600">{definition.description}</p><div className="mt-2 grid grid-cols-2 gap-1.5">{(fixture.items ?? []).slice(0, 4).map((item) => <div key={item.title} className="rounded-sm border border-slate-200 bg-white p-1.5"><p className="text-[7px] font-semibold">{item.title}</p><p className="text-[6px] text-slate-500">{item.meta}</p></div>)}</div></div>;
}

export function SectionStylePreview({
  blockType,
  definition,
  mode = "desktop",
  className,
}: {
  blockType: StorePageBlock["type"];
  definition: StorefrontVariantDefinition;
  mode?: SectionStylePreviewMode;
  className?: string;
}) {
  const target = definition.previewSpec[mode];
  const frameClassName = cn(
    "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm",
    mode === "mobile" ? "aspect-[9/14]" : "aspect-[16/9]",
    className,
  );

  if (target.mode === "asset" && target.assetUrl) {
    return (
      <div className={frameClassName} aria-label={definition.previewSpec.alt}>
        <PreviewImage src={target.assetUrl} alt={definition.previewSpec.alt} className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className={frameClassName} aria-label={definition.previewSpec.alt}>
      {blockType === "hero" ? <HeroPreview definition={definition} mode={mode} /> : null}
      {blockType === "category-showcase" ? <CategoryPreview definition={definition} mode={mode} /> : null}
      {blockType === "featured-products" || blockType === "recommended-products" ? <ProductPreview definition={definition} mode={mode} blockType={blockType} /> : null}
      {blockType === "promo-banner" ? <PromoPreview definition={definition} mode={mode} /> : null}
      {blockType === "rich-text" ? <StoryPreview definition={definition} mode={mode} /> : null}
      {!(["hero", "category-showcase", "featured-products", "recommended-products", "promo-banner", "rich-text"] as string[]).includes(blockType) ? <GenericPreview blockType={blockType} definition={definition} /> : null}
    </div>
  );
}
