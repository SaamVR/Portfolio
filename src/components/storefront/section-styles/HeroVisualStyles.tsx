import Link from "next/link";
import type { ComponentType, ReactElement, ReactNode, Ref } from "react";
import { ArrowRight, MoveDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StorefrontVariantOptions } from "@/lib/cms/storefront-platform/variants/variant-option-contract";
import { resolveSectionOptionClasses } from "@/components/storefront/section-styles/section-option-primitives";
import {
  resolveHeroVisualStyleId,
  type HeroVisualStyleId,
} from "@/components/storefront/section-styles/visual-section-style-catalog";

type TrustHighlight = {
  icon: ComponentType<{ className?: string }>;
  label: string;
};

type HeroVisualStylesProps = {
  anchorId?: string;
  sectionRef?: Ref<HTMLElement>;
  layoutVariant?: string;
  variantOptions?: StorefrontVariantOptions;
  tagline: string;
  title: string;
  highlight: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  overlayColor?: string;
  overlayOpacity?: number;
  trustHighlights: TrustHighlight[];
  renderMedia: (className: string) => ReactNode;
};

type ActionTone = "light" | "dark" | "minimal" | "poster";

function HeroActions({
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
  tone,
}: Pick<HeroVisualStylesProps, "ctaText" | "ctaLink" | "secondaryCtaText" | "secondaryCtaLink"> & { tone: ActionTone }) {
  const primary = tone === "poster" || tone === "dark"
    ? "bg-white text-black hover:bg-white/90"
    : "bg-primary text-primary-foreground hover:brightness-95";
  const secondary = tone === "poster" || tone === "dark"
    ? "border-white/40 bg-black/15 text-white hover:bg-black/25"
    : "border-border bg-background/75 text-foreground hover:border-primary/40 hover:bg-primary/5";
  const radius = tone === "poster" ? "rounded-none" : tone === "minimal" ? "rounded-full" : "rounded-lg";

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
      <Link
        href={ctaLink}
        className={`${radius} ${primary} inline-flex min-h-12 items-center justify-center gap-2 px-6 py-3 text-sm font-semibold transition sm:px-7`}
      >
        {ctaText}
        <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        href={secondaryCtaLink}
        className={`${radius} ${secondary} inline-flex min-h-12 items-center justify-center border px-6 py-3 text-sm font-semibold backdrop-blur-md transition sm:px-7`}
      >
        {secondaryCtaText}
      </Link>
    </div>
  );
}

function TrustRow({ items, tone = "light" }: { items: TrustHighlight[]; tone?: "light" | "dark" }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-7 flex flex-wrap gap-2 sm:mt-9">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={[
              "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-medium leading-4 sm:text-xs",
              tone === "dark" ? "border-white/15 bg-black/25 text-white/90" : "border-border bg-card/80 text-foreground",
            ].join(" ")}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function FullImageStory(props: HeroVisualStylesProps) {
  const overlayOpacity = Math.min(90, Math.max(10, props.overlayOpacity ?? 50)) / 100;
  return (
    <section ref={props.sectionRef} id={props.anchorId} className="relative min-h-[78svh] overflow-hidden md:min-h-[88vh]">
      <div className="absolute inset-0">{props.renderMedia("h-full w-full")}</div>
      <div className="absolute inset-0" style={{ backgroundColor: props.overlayColor || "hsl(var(--background))", opacity: overlayOpacity }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/5" />
      <div className="relative z-10 mx-auto flex min-h-[78svh] max-w-7xl items-end px-4 pb-10 pt-28 sm:px-6 sm:pb-14 md:min-h-[88vh] md:px-8 md:pb-16 lg:px-10">
        <div className="grid w-full gap-8 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.32fr)] md:items-end">
          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/75 sm:text-xs">{props.tagline}</p>
            <h1 className="max-w-[11ch] font-heading text-[clamp(2.8rem,12vw,5.2rem)] font-black leading-[0.9] tracking-[-0.045em] text-white md:text-[clamp(4.8rem,8vw,7.5rem)]">
              {props.title} <span className="text-primary">{props.highlight}</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/78 sm:text-base sm:leading-7 md:text-lg">{props.subtitle}</p>
            <div className="mt-7"><HeroActions {...props} tone="dark" /></div>
          </div>
          <div className="hidden border-l border-white/20 pl-5 text-white/75 md:block">
            <MoveDownRight className="mb-6 h-5 w-5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">{props.tagline}</p>
            <p className="mt-2 font-heading text-2xl font-bold leading-tight text-white">{props.highlight || props.title}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function EditorialSplit(props: HeroVisualStylesProps) {
  const options = resolveSectionOptionClasses(props.variantOptions);
  return (
    <section ref={props.sectionRef} id={props.anchorId} className="overflow-hidden bg-background text-foreground">
      <div className={cn("mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:min-h-[78vh] lg:grid-cols-[minmax(0,0.82fr)_minmax(420px,1.18fr)] lg:items-center lg:gap-12 lg:px-8 xl:gap-16", options.contentWidthClassName, options.spacingClassName)}>
        <div className={cn("order-2 lg:order-1", options.alignment.textClassName)}>
          <div className="mb-6 flex items-center gap-3">
            <span className="h-px w-9 bg-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">{props.tagline}</p>
          </div>
          <h1 className={cn("max-w-[10ch] font-heading text-[clamp(2.75rem,11vw,4.5rem)] font-black leading-[0.92] tracking-[-0.045em] sm:text-6xl lg:text-7xl", options.alignment.marginClassName, options.emphasis.titleClassName)}>
            {props.title} <span className="text-primary">{props.highlight}</span>
          </h1>
          <p className={cn("mt-5 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7 md:text-lg", options.alignment.marginClassName, options.emphasis.copyClassName)}>{props.subtitle}</p>
          <div className={cn("mt-7 flex", options.alignment.justifyClassName)}><HeroActions {...props} tone="light" /></div>
          <TrustRow items={props.trustHighlights} />
        </div>
        <div className="order-1 lg:order-2">
          <div className={cn("relative min-h-[390px] overflow-hidden rounded-[1.5rem] border border-border bg-muted shadow-2xl sm:min-h-[500px] lg:min-h-[680px] lg:rounded-[2rem]", options.mobile.isCompact && "min-h-[300px] sm:min-h-[420px]")}>
            {props.renderMedia("absolute inset-0 h-full w-full")}
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-white backdrop-blur-md sm:bottom-6 sm:left-6 sm:right-6">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em]">{props.tagline}</span>
              <span className="max-w-[60%] truncate text-xs font-medium sm:text-sm">{props.highlight || props.title}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MinimalProductFocus(props: HeroVisualStylesProps) {
  const options = resolveSectionOptionClasses(props.variantOptions);
  return (
    <section ref={props.sectionRef} id={props.anchorId} className="bg-background text-foreground">
      <div className={cn("mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-16 md:py-20 lg:py-24", options.contentWidthClassName, options.spacingClassName, options.alignment.textClassName)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">{props.tagline}</p>
        <h1 className={cn("mt-4 max-w-[12ch] font-heading text-[clamp(2.65rem,11vw,4.75rem)] font-black leading-[0.94] tracking-[-0.045em] md:text-7xl", options.alignment.marginClassName || "mx-auto", options.emphasis.titleClassName)}>
          {props.title} <span className="text-primary">{props.highlight}</span>
        </h1>
        <p className={cn("mt-5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7 md:text-lg", options.alignment.marginClassName || "mx-auto", options.emphasis.copyClassName)}>{props.subtitle}</p>
        <div className={cn("mt-7 flex justify-center", options.alignment.justifyClassName)}><HeroActions {...props} tone="minimal" /></div>
        <div className={cn("relative mx-auto mt-10 aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-border bg-muted shadow-[0_24px_80px_rgba(0,0,0,0.10)] sm:mt-12 sm:aspect-[16/9] md:rounded-[2.5rem]", options.mobile.isCompact && "mt-7 aspect-[16/10] sm:mt-9")}>
          {props.renderMedia("absolute inset-0 h-full w-full")}
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </div>
      </div>
    </section>
  );
}

function MagazineBold(props: HeroVisualStylesProps) {
  return (
    <section ref={props.sectionRef} id={props.anchorId} className="overflow-hidden bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-18">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)] lg:gap-10">
          <div className="relative z-10 flex flex-col justify-between py-1 lg:py-8">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary sm:text-xs">{props.tagline}</p>
                <span className="max-w-[45%] truncate font-heading text-xs font-semibold text-muted-foreground">{props.highlight || props.title}</span>
              </div>
              <h1 className="mt-7 max-w-[9ch] font-heading text-[clamp(3.35rem,15vw,6rem)] font-black leading-[0.82] tracking-[-0.065em] sm:text-7xl lg:text-[7.5rem] xl:text-[8.6rem]">
                {props.title}<br /><span className="text-primary">{props.highlight}</span>
              </h1>
            </div>
            <div className="mt-8 grid gap-6 border-t border-border pt-5 sm:grid-cols-[1fr_auto] sm:items-end lg:mt-12">
              <p className="max-w-lg text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">{props.subtitle}</p>
              <HeroActions {...props} tone="light" />
            </div>
          </div>
          <div className="relative min-h-[430px] overflow-hidden rounded-lg bg-muted sm:min-h-[560px] lg:min-h-[720px]">
            {props.renderMedia("absolute inset-0 h-full w-full")}
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 border border-white/30 bg-black/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white backdrop-blur-md sm:bottom-6 sm:left-6">
              {props.highlight || props.title}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CampaignPoster(props: HeroVisualStylesProps) {
  const overlayOpacity = Math.min(85, Math.max(20, props.overlayOpacity ?? 55)) / 100;
  return (
    <section ref={props.sectionRef} id={props.anchorId} className="relative min-h-[82svh] overflow-hidden md:min-h-[92vh]">
      <div className="absolute inset-0">{props.renderMedia("h-full w-full")}</div>
      <div className="absolute inset-0" style={{ backgroundColor: props.overlayColor || "#000", opacity: overlayOpacity }} />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/25 to-transparent" />
      <div className="pointer-events-none absolute inset-3 border border-white/30 sm:inset-5" />
      <div className="relative z-10 mx-auto flex min-h-[82svh] max-w-7xl items-end px-7 pb-9 pt-24 sm:px-10 sm:pb-12 md:min-h-[92vh] lg:px-14 lg:pb-16">
        <div className="w-full">
          <div className="mb-4 flex items-center justify-between gap-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75 sm:text-xs">
            <span>{props.tagline}</span>
            <span className="hidden max-w-[40%] truncate sm:inline">{props.highlight || props.title}</span>
          </div>
          <h1 className="max-w-[9ch] font-heading text-[clamp(3.1rem,14vw,6rem)] font-black uppercase leading-[0.84] tracking-[-0.055em] text-white sm:text-7xl md:text-8xl lg:text-[8.4rem]">
            {props.title} <span className="text-primary">{props.highlight}</span>
          </h1>
          <div className="mt-6 grid gap-6 border-t border-white/30 pt-5 sm:grid-cols-[minmax(0,620px)_auto] sm:items-end sm:justify-between">
            <p className="max-w-xl text-sm leading-6 text-white/80 sm:text-base sm:leading-7">{props.subtitle}</p>
            <HeroActions {...props} tone="poster" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CollectionSpotlight(props: HeroVisualStylesProps) {
  return (
    <section ref={props.sectionRef} id={props.anchorId} className="bg-background text-foreground">
      <div className="mx-auto grid max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)] lg:px-8 lg:py-16">
        <div className="relative min-h-[420px] overflow-hidden rounded-[1.5rem] bg-muted sm:min-h-[540px] lg:min-h-[700px] lg:rounded-r-none">
          {props.renderMedia("absolute inset-0 h-full w-full")}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 max-w-[70%] text-white sm:bottom-7 sm:left-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">{props.tagline}</p>
            <p className="mt-2 font-heading text-xl font-bold sm:text-2xl">{props.highlight || props.title}</p>
          </div>
        </div>
        <div className="flex flex-col justify-center rounded-[1.5rem] bg-card px-5 py-9 sm:px-8 sm:py-12 lg:rounded-l-none lg:px-10 xl:px-14">
          <div className="flex items-center gap-3 text-primary">
            <span className="h-px w-8 bg-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] sm:text-xs">{props.tagline}</p>
          </div>
          <h1 className="mt-5 max-w-[10ch] font-heading text-[clamp(2.75rem,11vw,4.5rem)] font-black leading-[0.92] tracking-[-0.045em] md:text-6xl lg:text-7xl">
            {props.title} <span className="text-primary">{props.highlight}</span>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">{props.subtitle}</p>
          <div className="mt-7"><HeroActions {...props} tone="light" /></div>
          <TrustRow items={props.trustHighlights.slice(0, 2)} />
        </div>
      </div>
    </section>
  );
}

const STYLE_RENDERERS: Record<HeroVisualStyleId, (props: HeroVisualStylesProps) => ReactElement> = {
  "full-bleed": FullImageStory,
  split: EditorialSplit,
  centered: MinimalProductFocus,
  editorial: MagazineBold,
  poster: CampaignPoster,
  "collection-spotlight": CollectionSpotlight,
};

export function HeroVisualStyles(props: HeroVisualStylesProps) {
  const styleId = resolveHeroVisualStyleId(props.layoutVariant);
  const Renderer = STYLE_RENDERERS[styleId];
  return <Renderer {...props} />;
}
