import type { ComponentType, CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { Link } from "@/lib/react-router-dom-shim";
import { storefrontPath } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type { StorefrontVariantOptions } from "@/lib/cms/storefront-platform/variants/variant-option-contract";
import { resolveSectionOptionClasses } from "@/components/storefront/section-styles/section-option-primitives";
import {
  resolveCategoryVisualStyleId,
  type CategoryVisualStyleId,
} from "@/components/storefront/section-styles/visual-section-style-catalog";

export type CategoryVisualItem = {
  label: string;
  type: string;
  tagline: string;
  image_url: string | null;
  icon: ComponentType<{ className?: string }>;
  filterKey: "category" | "type";
};

type CategoryVisualStylesProps = {
  layoutVariant?: string;
  tagline: string;
  title: string;
  items: CategoryVisualItem[];
  storeSlug?: string | null;
  fallbackImageUrl?: string | null;
  imageObjectPosition?: CSSProperties["objectPosition"];
  containerClass: string;
  variantOptions?: StorefrontVariantOptions;
};

function categoryHref(item: CategoryVisualItem, storeSlug?: string | null) {
  return storefrontPath(`/shop?${item.filterKey}=${encodeURIComponent(item.type)}`, storeSlug);
}

function CategoryMedia({
  item,
  fallbackImageUrl,
  imageObjectPosition,
  className,
  iconClassName = "h-7 w-7",
}: {
  item: CategoryVisualItem;
  fallbackImageUrl?: string | null;
  imageObjectPosition?: CSSProperties["objectPosition"];
  className: string;
  iconClassName?: string;
}) {
  const Icon = item.icon;
  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      {item.image_url ? (
        <SafeStorefrontImage
          src={item.image_url}
          fallbackSrc={fallbackImageUrl ?? null}
          fill
          alt={item.label}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          style={{ objectPosition: imageObjectPosition }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary via-muted to-background">
          <Icon className={`${iconClassName} text-primary/75`} />
        </div>
      )}
    </div>
  );
}

function SectionHeading({ styleId, tagline, title }: { styleId: CategoryVisualStyleId; tagline: string; title: string }) {
  if (styleId === "compact-list") {
    return (
      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">{tagline}</p>
        <h2 className="mt-3 max-w-[9ch] font-heading text-4xl font-black leading-[0.94] tracking-tight text-foreground sm:text-5xl lg:text-6xl">{title}</h2>
      </div>
    );
  }

  if (styleId === "carousel") {
    return (
      <div className="mb-7 flex items-end justify-between gap-6 border-b border-border pb-5 sm:mb-9">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">{tagline}</p>
          <h2 className="mt-2 font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-5xl">{title}</h2>
        </div>
      </div>
    );
  }

  if (styleId === "circular-categories") {
    return (
      <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary sm:text-xs">{tagline}</p>
        <h2 className="mt-3 font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-5xl">{title}</h2>
      </div>
    );
  }

  return (
    <div className="mb-8 grid gap-4 sm:mb-11 md:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)] md:items-end md:gap-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary sm:text-xs">{tagline}</p>
      <h2 className="max-w-3xl font-heading text-4xl font-black leading-[0.96] tracking-tight text-foreground sm:text-5xl md:text-6xl">{title}</h2>
    </div>
  );
}

function ImageCards(props: CategoryVisualStylesProps) {
  const options = resolveSectionOptionClasses(props.variantOptions);
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4", options.mobile.isScroll && "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] md:grid md:overflow-visible [&::-webkit-scrollbar]:hidden", options.mobile.isCompact && "gap-2 sm:gap-3")}>
      {props.items.map((item, index) => (
        <AnimatedSection key={item.filterKey + "-" + item.type} delay={index * 45} animation="blur" className={cn(options.mobile.isScroll && "w-[78vw] max-w-[320px] shrink-0 snap-start sm:w-[42vw] md:w-auto md:max-w-none md:shrink md:snap-none")}>
          <Link to={categoryHref(item, props.storeSlug)} className="group block overflow-hidden rounded-[1.25rem] border border-border bg-card transition hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl">
            <CategoryMedia item={item} fallbackImageUrl={props.fallbackImageUrl} imageObjectPosition={props.imageObjectPosition} className={cn("aspect-[4/5]", options.mobile.isCompact && "aspect-square md:aspect-[4/5]")} />
            <div className={cn("p-3 sm:p-4", options.mobile.isCompact && "p-2 sm:p-3")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm font-bold text-foreground sm:text-base">{item.label}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground sm:text-xs sm:leading-5">{item.tagline}</p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        </AnimatedSection>
      ))}
    </div>
  );
}

function EditorialRail(props: CategoryVisualStylesProps) {
  const options = resolveSectionOptionClasses(props.variantOptions);
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden">
      {props.items.map((item, index) => (
        <AnimatedSection key={`${item.filterKey}-${item.type}`} delay={index * 40} animation="blur" className={cn("min-w-[82vw] max-w-[360px] snap-start sm:min-w-[330px]", options.mobile.isCompact && "min-w-[64vw] max-w-[300px] sm:min-w-[280px]")}>
          <Link to={categoryHref(item, props.storeSlug)} className="group grid min-h-[132px] grid-cols-[104px_minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40 sm:grid-cols-[124px_minmax(0,1fr)]">
            <CategoryMedia item={item} fallbackImageUrl={props.fallbackImageUrl} imageObjectPosition={props.imageObjectPosition} className="h-full min-h-[132px] rounded-none" iconClassName="h-6 w-6" />
            <div className="flex min-w-0 flex-col justify-between p-4">
              <span className="font-heading text-[10px] font-bold uppercase tracking-[0.25em] text-primary">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="truncate font-heading text-lg font-bold text-foreground">{item.label}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.tagline}</p>
              </div>
            </div>
          </Link>
        </AnimatedSection>
      ))}
    </div>
  );
}

function CircularCategories(props: CategoryVisualStylesProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4 sm:gap-x-5 lg:grid-cols-6">
      {props.items.map((item, index) => (
        <AnimatedSection key={`${item.filterKey}-${item.type}`} delay={index * 40} animation="blur">
          <Link to={categoryHref(item, props.storeSlug)} className="group block text-center">
            <CategoryMedia item={item} fallbackImageUrl={props.fallbackImageUrl} imageObjectPosition={props.imageObjectPosition} className="mx-auto aspect-square w-full rounded-full border border-border transition group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-xl" iconClassName="h-6 w-6 sm:h-8 sm:w-8" />
            <p className="mt-3 line-clamp-1 font-heading text-xs font-bold text-foreground sm:text-sm">{item.label}</p>
            <p className="mt-1 hidden line-clamp-1 text-[11px] text-muted-foreground sm:block">{item.tagline}</p>
          </Link>
        </AnimatedSection>
      ))}
    </div>
  );
}

function CollectionTiles(props: CategoryVisualStylesProps) {
  return (
    <div className="grid auto-rows-[minmax(180px,auto)] grid-cols-2 gap-3 sm:gap-4 md:grid-cols-12 md:auto-rows-[220px]">
      {props.items.map((item, index) => {
        const span = index === 0
          ? "col-span-2 min-h-[300px] md:col-span-7 md:row-span-2 md:min-h-0"
          : index === 1
            ? "col-span-2 min-h-[230px] md:col-span-5 md:min-h-0"
            : index === 2
              ? "col-span-1 min-h-[210px] md:col-span-5 md:min-h-0"
              : "col-span-1 min-h-[210px] md:col-span-4 md:min-h-0";
        return (
          <AnimatedSection key={`${item.filterKey}-${item.type}`} delay={index * 45} animation="blur" className={span}>
            <Link to={categoryHref(item, props.storeSlug)} className="group relative block h-full min-h-full overflow-hidden rounded-[1.25rem] bg-muted">
              <CategoryMedia item={item} fallbackImageUrl={props.fallbackImageUrl} imageObjectPosition={props.imageObjectPosition} className="h-full w-full rounded-none" iconClassName="h-8 w-8" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                <p className="font-heading text-lg font-bold leading-tight sm:text-xl">{item.label}</p>
                <p className="mt-1 line-clamp-2 max-w-sm text-[11px] leading-4 text-white/75 sm:text-xs sm:leading-5">{item.tagline}</p>
              </div>
            </Link>
          </AnimatedSection>
        );
      })}
    </div>
  );
}

function Masonry(props: CategoryVisualStylesProps) {
  return (
    <div className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4">
      {props.items.map((item, index) => {
        const aspect = index % 4 === 0 ? "aspect-[4/5]" : index % 4 === 1 ? "aspect-square" : index % 4 === 2 ? "aspect-[3/4]" : "aspect-[5/4]";
        return (
          <AnimatedSection key={`${item.filterKey}-${item.type}`} delay={index * 45} animation="blur" className="mb-3 break-inside-avoid sm:mb-4">
            <Link to={categoryHref(item, props.storeSlug)} className="group relative block overflow-hidden rounded-xl bg-muted">
              <CategoryMedia item={item} fallbackImageUrl={props.fallbackImageUrl} imageObjectPosition={props.imageObjectPosition} className={aspect} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
                <p className="font-heading text-sm font-bold sm:text-base">{item.label}</p>
                <p className="mt-1 line-clamp-1 text-[10px] text-white/70 sm:text-xs">{item.tagline}</p>
              </div>
            </Link>
          </AnimatedSection>
        );
      })}
    </div>
  );
}

function MinimalList(props: CategoryVisualStylesProps) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {props.items.map((item, index) => (
        <AnimatedSection key={`${item.filterKey}-${item.type}`} delay={index * 35} animation="blur">
          <Link to={categoryHref(item, props.storeSlug)} className="group grid min-h-20 grid-cols-[42px_minmax(0,1fr)_56px] items-center gap-3 py-3 sm:grid-cols-[56px_minmax(0,1fr)_72px] sm:gap-5 sm:py-4">
            <span className="font-heading text-xs font-bold tracking-[0.18em] text-primary">{String(index + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-bold text-foreground sm:text-lg">{item.label}</p>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground sm:text-xs">{item.tagline}</p>
            </div>
            <div className="relative h-14 w-14 justify-self-end overflow-hidden rounded-lg sm:h-16 sm:w-16">
              <CategoryMedia item={item} fallbackImageUrl={props.fallbackImageUrl} imageObjectPosition={props.imageObjectPosition} className="h-full w-full rounded-lg" iconClassName="h-5 w-5" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                <ArrowRight className="h-4 w-4 translate-x-1 text-white opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
            </div>
          </Link>
        </AnimatedSection>
      ))}
    </div>
  );
}

export function CategoryVisualStyles(props: CategoryVisualStylesProps) {
  const styleId = resolveCategoryVisualStyleId(props.layoutVariant);
  const options = resolveSectionOptionClasses(props.variantOptions);
  const content = styleId === "carousel"
    ? <EditorialRail {...props} />
    : styleId === "circular-categories"
      ? <CircularCategories {...props} />
      : styleId === "collection-tiles"
        ? <CollectionTiles {...props} />
        : styleId === "masonry"
          ? <Masonry {...props} />
          : styleId === "compact-list"
            ? <MinimalList {...props} />
            : <ImageCards {...props} />;

  return (
    <section className={cn("bg-background py-12 text-foreground sm:py-14 md:py-18 lg:py-20", options.spacingClassName)}>
      <div className={cn("mx-auto px-4 sm:px-6", props.containerClass, options.contentWidthClassName)}>
        <AnimatedSection animation="blur">
          {styleId === "compact-list" ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(240px,0.36fr)_minmax(0,0.64fr)] lg:gap-14">
              <SectionHeading styleId={styleId} tagline={props.tagline} title={props.title} />
              {content}
            </div>
          ) : (
            <>
              <SectionHeading styleId={styleId} tagline={props.tagline} title={props.title} />
              {content}
            </>
          )}
        </AnimatedSection>
      </div>
    </section>
  );
}
