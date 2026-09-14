"use client";

import Link from "next/link";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { StorefrontSurface } from "@/components/storefront/platform/StorefrontSurface";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProducts } from "@/hooks/useProducts";
import type { StorePageBlock } from "@/lib/cms/schema";
import type { CompositionNode } from "@/lib/cms/storefront-platform/composition/contracts";
import {
  buildCompositionDataSlotRequest,
  getCompositionDataSlotContract,
  type CompositionDataSlotItem,
  type CompositionDataSlotRequest,
} from "@/lib/cms/storefront-platform/composition/data-slot-contracts";
import { compositionDocumentSchema } from "@/lib/cms/storefront-platform/composition/schema";
import { storefrontPath } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { buildCompositionDataSlotPayload } from "@/lib/storefront-platform/data/composition-data-slot-provider";

type BindingContext = Readonly<Record<string, CompositionDataSlotItem | undefined>>;

type CompositionBlock = Extract<StorePageBlock, { type: "composition" }>;

function stringValue(value: unknown, bindings: BindingContext): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const binding = value as { kind?: unknown; slotId?: unknown; field?: unknown; fallback?: unknown };
  if (binding.kind !== "binding" || typeof binding.slotId !== "string" || typeof binding.field !== "string") return "";
  const resolved = bindings[binding.slotId]?.[binding.field as keyof CompositionDataSlotItem];
  if (typeof resolved === "string" || typeof resolved === "number") return String(resolved);
  return typeof binding.fallback === "string" ? binding.fallback : "";
}

function gapClass(value: unknown) {
  return ({ none: "gap-0", xs: "gap-1.5", sm: "gap-3", md: "gap-5", lg: "gap-8", xl: "gap-12" } as const)[String(value) as "none"] ?? "gap-5";
}

function alignClass(value: unknown) {
  return ({ start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" } as const)[String(value) as "start"] ?? "items-stretch";
}

function textAlignClass(value: unknown) {
  return ({ left: "text-left", center: "text-center", right: "text-right" } as const)[String(value) as "left"] ?? "text-left";
}
function sectionClasses(props: Record<string, unknown>) {
  const width = ({ contained: "container mx-auto px-4", wide: "mx-auto max-w-[1500px] px-4", full: "w-full" } as Record<string, string>)[String(props.width)] ?? "container mx-auto px-4";
  const padding = ({ none: "py-0", compact: "py-6 md:py-8", comfortable: "py-10 md:py-14", spacious: "py-14 md:py-20" } as Record<string, string>)[String(props.padding)] ?? "py-10 md:py-14";
  const tone = ({ default: "bg-background text-foreground", muted: "bg-muted/35 text-foreground", accent: "bg-primary/10 text-foreground", inverse: "bg-foreground text-background" } as Record<string, string>)[String(props.tone)] ?? "bg-background text-foreground";
  return { width, padding, tone };
}

function surfaceClasses(props: Record<string, unknown>) {
  const border = ({ none: "border-0", subtle: "border border-border", strong: "border-2 border-border" } as Record<string, string>)[String(props.border)] ?? "border border-border";
  const radius = ({ none: "rounded-none", sm: "rounded-sm", md: "rounded-lg", lg: "rounded-2xl", xl: "rounded-3xl" } as Record<string, string>)[String(props.radius)] ?? "rounded-lg";
  const elevation = ({ none: "shadow-none", soft: "shadow-sm", raised: "shadow-lg" } as Record<string, string>)[String(props.elevation)] ?? "shadow-none";
  const padding = ({ compact: "p-4", comfortable: "p-6", spacious: "p-8 md:p-10" } as Record<string, string>)[String(props.padding)] ?? "p-6";
  return cn(border, radius, elevation, padding);
}

function columnClasses(props: Record<string, unknown>) {
  const ratio = ({ "1:1": "md:grid-cols-2", "2:1": "md:grid-cols-[2fr_1fr]", "1:2": "md:grid-cols-[1fr_2fr]", "3:2": "md:grid-cols-[3fr_2fr]", "2:3": "md:grid-cols-[2fr_3fr]" } as Record<string, string>)[String(props.ratio)] ?? "md:grid-cols-2";
  const reverse = props.mobileOrder === "reverse"
    ? "[&>*:first-child]:order-2 [&>*:last-child]:order-1 md:[&>*:first-child]:order-1 md:[&>*:last-child]:order-2"
    : "";
  return cn("grid grid-cols-1", ratio, gapClass(props.gap), reverse);
}

function gridClasses(props: Record<string, unknown>) {
  const mobile = props.mobileColumns === 2 ? "grid-cols-2" : "grid-cols-1";
  const tablet = ({ 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" } as Record<number, string>)[Number(props.tabletColumns)] ?? "sm:grid-cols-2";
  const desktop = ({ 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6" } as Record<number, string>)[Number(props.desktopColumns)] ?? "lg:grid-cols-3";
  return cn("grid", mobile, tablet, desktop, gapClass(props.gap));
}
function ResolvedDataSlot({
  request,
  node,
  bindings,
  products,
}: {
  request: CompositionDataSlotRequest;
  node: CompositionNode;
  bindings: BindingContext;
  products: ReturnType<typeof useProducts>["data"];
}) {
  const store = useOptionalStore();
  const payload = buildCompositionDataSlotPayload(request, { products: products ?? [], store });
  const contract = getCompositionDataSlotContract(request.slot);
  const children = node.children ?? [];

  if (payload.items.length === 0) {
    if (contract.emptyBehavior === "hide-slot") return null;
    return <>{children.map((child) => <CompositionNodeView key={child.id} node={child} bindings={bindings} />)}</>;
  }

  return <>{payload.items.map((item, index) => (
    <div key={`${node.id}-${index}`} data-composition-slot={request.slot} data-composition-slot-item={index}>
      {children.map((child) => (
        <CompositionNodeView key={child.id} node={child} bindings={{ ...bindings, [node.id]: item }} />
      ))}
    </div>
  ))}</>;
}

function ProductDataSlot({ request, node, bindings }: { request: CompositionDataSlotRequest; node: CompositionNode; bindings: BindingContext }) {
  const products = useProducts();
  if (products.isLoading) return <div className="min-h-24 animate-pulse rounded-lg bg-muted/50" aria-busy="true" />;
  return <ResolvedDataSlot request={request} node={node} bindings={bindings} products={products.data} />;
}

function DataSlotNode({ node, bindings }: { node: CompositionNode; bindings: BindingContext }) {
  const request = buildCompositionDataSlotRequest({
    nodeId: node.id,
    slot: node.props.slot as CompositionDataSlotRequest["slot"],
    source: (node.props.source ?? "default") as CompositionDataSlotRequest["source"],
    limit: (node.props.limit ?? 6) as number,
    filters: {
      category: typeof node.props.category === "string" ? node.props.category : undefined,
      productType: typeof node.props.productType === "string" ? node.props.productType : undefined,
    },
  });
  const needsProducts = request.slot === "products" || request.slot === "featured-products" || request.slot === "categories";
  if (needsProducts) return <ProductDataSlot request={request} node={node} bindings={bindings} />;
  return <ResolvedDataSlot request={request} node={node} bindings={bindings} products={[]} />;
}
function CompositionChildren({ node, bindings }: { node: CompositionNode; bindings: BindingContext }) {
  return <>{node.children?.map((child) => <CompositionNodeView key={child.id} node={child} bindings={bindings} />)}</>;
}

function CompositionNodeView({ node, bindings }: { node: CompositionNode; bindings: BindingContext }) {
  const store = useOptionalStore();
  const props = node.props;

  switch (node.primitive) {
    case "section": {
      const classes = sectionClasses(props);
      return <section className={cn("relative overflow-hidden", classes.tone, classes.padding)}><div className={classes.width}><CompositionChildren node={node} bindings={bindings} /></div></section>;
    }
    case "container": {
      const width = ({ narrow: "max-w-2xl", content: "max-w-4xl", wide: "max-w-7xl", full: "max-w-none" } as Record<string, string>)[String(props.width)] ?? "max-w-4xl";
      const align = ({ start: "mr-auto", center: "mx-auto", end: "ml-auto" } as Record<string, string>)[String(props.align)] ?? "mx-auto";
      return <div className={cn("w-full", width, align)}><CompositionChildren node={node} bindings={bindings} /></div>;
    }
    case "stack":
      return <div className={cn("flex flex-col", gapClass(props.gap), alignClass(props.align))}><CompositionChildren node={node} bindings={bindings} /></div>;
    case "row": {
      const justify = ({ start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between" } as Record<string, string>)[String(props.justify)] ?? "justify-start";
      return <div className={cn("flex", props.wrap === false ? "flex-nowrap" : "flex-wrap", gapClass(props.gap), alignClass(props.align), justify)}><CompositionChildren node={node} bindings={bindings} /></div>;
    }
    case "grid":
      return <div className={gridClasses(props)}><CompositionChildren node={node} bindings={bindings} /></div>;
    case "columns":
      return <div className={columnClasses(props)}><CompositionChildren node={node} bindings={bindings} /></div>;
    case "surface":
    case "card":
    case "panel": {
      const tone = props.tone === "inverse" ? "inverse" : props.tone === "accent" ? "brand" : props.tone === "muted" ? "muted" : "default";
      return <StorefrontSurface tone={tone} className={surfaceClasses(props)}><CompositionChildren node={node} bindings={bindings} /></StorefrontSurface>;
    }
    case "heading": {
      const text = stringValue(props.text, bindings);
      const className = cn(
        props.emphasis === "display" ? "font-heading text-4xl font-semibold leading-tight md:text-6xl" : "font-heading text-2xl font-semibold md:text-4xl",
        textAlignClass(props.align),
      );
      if (props.level === "h3") return <h3 className={className}>{text}</h3>;
      if (props.level === "h4") return <h4 className={className}>{text}</h4>;
      return <h2 className={className}>{text}</h2>;
    }
    case "text": {
      const style = ({ body: "text-base leading-7", lead: "text-lg leading-8 md:text-xl", caption: "text-sm leading-6 text-muted-foreground" } as Record<string, string>)[String(props.style)] ?? "text-base leading-7";
      return <p className={cn(style, textAlignClass(props.align))}>{stringValue(props.text, bindings)}</p>;
    }
    case "rich-text":
      return <div className={cn("space-y-4", textAlignClass(props.align))}>{Array.isArray(props.paragraphs) ? props.paragraphs.map((paragraph, index) => <p key={index} className="text-base leading-7">{String(paragraph)}</p>) : null}</div>;
    case "badge":
      return <span className="inline-flex w-fit min-h-8 items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">{stringValue(props.text, bindings)}</span>;
    case "divider": {
      const strength = props.strength === "strong" ? "border-t-2" : "border-t";
      const spacing = ({ sm: "my-3", md: "my-5", lg: "my-8" } as Record<string, string>)[String(props.spacing)] ?? "my-5";
      return <hr className={cn("border-border", strength, spacing)} />;
    }
    case "cta-group": {
      const justify = props.align === "center" ? "justify-center" : props.align === "right" ? "justify-end" : "justify-start";
      const actions = Array.isArray(props.actions) ? props.actions as Array<{ label: string; href: string; style: "primary" | "secondary" | "ghost" }> : [];
      return <div className={cn("flex flex-wrap gap-3", justify)}>{actions.map((action) => {
        const classes = action.style === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : action.style === "secondary"
            ? "border border-border bg-background text-foreground hover:bg-muted"
            : "text-foreground underline-offset-4 hover:underline";
        return <Link key={`${action.href}-${action.label}`} href={storefrontPath(action.href, store?.slug)} className={cn("inline-flex min-h-11 items-center justify-center rounded-md px-5 text-sm font-semibold transition-colors", classes)}>{action.label}</Link>;
      })}</div>;
    }
    case "image": {
      const src = stringValue(props.src, bindings);
      const alt = stringValue(props.alt, bindings);
      const aspect = ({ "1:1": "aspect-square", "4:5": "aspect-[4/5]", "3:2": "aspect-[3/2]", "16:9": "aspect-video", auto: "aspect-[3/2]" } as Record<string, string>)[String(props.aspect)] ?? "aspect-[3/2]";
      const objectPosition = ({ top: "top", bottom: "bottom", left: "left", right: "right", center: "center" } as Record<string, string>)[String(props.focalPoint)] ?? "center";
      return <div className={cn("relative w-full overflow-hidden bg-muted", aspect)}><SafeStorefrontImage src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw" className={props.fit === "contain" ? "object-contain" : "object-cover"} style={{ objectPosition }} /></div>;
    }
    case "media": {
      const src = stringValue(props.src, bindings);
      const aspect = ({ "1:1": "aspect-square", "4:5": "aspect-[4/5]", "3:2": "aspect-[3/2]", "16:9": "aspect-video", auto: "aspect-[3/2]" } as Record<string, string>)[String(props.aspect)] ?? "aspect-[3/2]";
      if (props.kind === "video") return <video src={src} className={cn("w-full bg-muted", aspect, props.fit === "contain" ? "object-contain" : "object-cover")} controls playsInline muted={props.autoplay === true} autoPlay={props.autoplay === true} />;
      return <div className={cn("relative w-full overflow-hidden bg-muted", aspect)}><SafeStorefrontImage src={src} alt={typeof props.alt === "string" ? props.alt : ""} fill sizes="(max-width: 768px) 100vw, 50vw" className={props.fit === "contain" ? "object-contain" : "object-cover"} /></div>;
    }
    case "decorative-layer": {
      const placement = ({ background: "inset-0", "top-left": "left-0 top-0 h-1/2 w-1/2", "top-right": "right-0 top-0 h-1/2 w-1/2", "bottom-left": "bottom-0 left-0 h-1/2 w-1/2", "bottom-right": "bottom-0 right-0 h-1/2 w-1/2" } as Record<string, string>)[String(props.placement)] ?? "inset-0";
      const opacity = props.intensity === "medium" ? "opacity-20" : "opacity-10";
      return <div aria-hidden="true" data-store-decoration="true" className={cn("pointer-events-none absolute bg-primary", placement, opacity, props.kind === "line" && "h-px", props.kind === "gradient" && "bg-gradient-to-br from-primary to-transparent")} />;
    }
    case "data-slot":
      return <DataSlotNode node={node} bindings={bindings} />;
    default:
      return null;
  }
}

export function StorefrontCompositionRenderer({ block }: { block: CompositionBlock }) {
  const parsed = compositionDocumentSchema.safeParse(block.props);
  if (!parsed.success) return null;
  return <div data-storefront-composition={parsed.data.recipeId ?? "custom"}><CompositionNodeView node={parsed.data.tree} bindings={{}} /></div>;
}
