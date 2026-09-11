"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CreditCard, Home, Leaf, PackageCheck, RotateCcw, Shirt, ShoppingBag, Sparkles, Tag } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { ThreadsProductCard } from "@/components/storefront/threads/ThreadsProductCard";
import { storefrontPath } from "@/lib/slug";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";

const s = (v: unknown) => typeof v === "string" ? v.trim() : "";
type DecorationLevel = "none" | "subtle" | "full";
const deco = (block: StorePageBlock): DecorationLevel => block.decoration ?? "subtle";
const isReferenceStore = (id?: string | null) => id === "preview-threads";

function repeatForLoop<T>(items: T[], minimumSlides = 10): T[] {
  if (items.length <= 1 || items.length >= minimumSlides) return items;
  const copies = Math.ceil(minimumSlides / items.length);
  return Array.from({ length: copies }, () => items).flat();
}

function Botanical({ side = "left", level = "subtle", inverse = false }: { side?: "left" | "right"; level?: DecorationLevel; inverse?: boolean }) {
  if (level === "none") return null;
  return <div aria-hidden className={`pointer-events-none absolute z-[1] hidden md:block ${side === "left" ? "-left-5" : "-right-5 -scale-x-100"} ${level === "full" ? "scale-110 opacity-100" : "opacity-70"} ${inverse ? "text-primary-foreground/13" : "text-primary/20"}`}>
    <Leaf className="h-28 w-28 -rotate-[24deg] stroke-[1]" /><Leaf className="-mt-12 ml-12 h-20 w-20 rotate-[10deg] stroke-[1]" /><Leaf className="-mt-9 ml-2 h-16 w-16 -rotate-[55deg] stroke-[1]" />
  </div>;
}

function useThreadsAutoplay(api: CarouselApi | undefined, interval: number, enabled: boolean) {
  const pausedRef = useRef(false);

  useEffect(() => {
    if (!api || !enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = api.rootNode();
    const pause = () => { pausedRef.current = true; };
    const resume = () => { pausedRef.current = false; };
    const timer = window.setInterval(() => {
      if (!pausedRef.current) api.scrollNext();
    }, interval);

    root.addEventListener("mouseenter", pause);
    root.addEventListener("mouseleave", resume);
    root.addEventListener("focusin", pause);
    root.addEventListener("focusout", resume);
    root.addEventListener("pointerdown", pause);
    root.addEventListener("pointerup", resume);
    root.addEventListener("pointercancel", resume);

    return () => {
      window.clearInterval(timer);
      root.removeEventListener("mouseenter", pause);
      root.removeEventListener("mouseleave", resume);
      root.removeEventListener("focusin", pause);
      root.removeEventListener("focusout", resume);
      root.removeEventListener("pointerdown", pause);
      root.removeEventListener("pointerup", resume);
      root.removeEventListener("pointercancel", resume);
    };
  }, [api, enabled, interval]);
}

function ThreadsCarouselTicks({ api, count }: { api: CarouselApi | undefined; count: number }) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!api) return;
    const sync = () => setSelected(count > 0 ? api.selectedScrollSnap() % count : 0);
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => { api.off("select", sync); api.off("reInit", sync); };
  }, [api, count]);

  return <div className="mt-4 flex items-center gap-1.5" aria-label="Carousel position">{Array.from({ length: count }, (_, index) => <button key={index} type="button" onClick={() => api?.scrollTo(index)} aria-label={`Go to slide ${index + 1}`} aria-current={selected === index ? "true" : undefined} className={`h-[2px] transition-all ${selected === index ? "w-7 bg-primary-foreground" : "w-3 bg-primary-foreground/30"}`} />)}</div>;
}

function ThreadsHero({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const reference = isReferenceStore(store?.id);
  const image = s(p.imageUrl) || s(p.mediaUrl);
  const mobile = s(p.mobileImageUrl) || image;
  const title = reference ? "Wear Your Story" : (s(p.title) || "Wear Your Story");
  const subtitle = reference ? "Thoughtfully designed. Made for your everyday." : (s(p.subtitle) || "Thoughtfully designed. Made for your everyday.");
  const tagline = reference ? "New Collection" : (s(p.tagline) || "New Collection");
  const cta = reference ? "Shop New Arrivals" : (s(p.ctaText) || "Shop New Arrivals");
  return <section className="relative overflow-hidden border-b border-border bg-secondary/35">
    <Botanical side="left" level={deco(block)} />
    <div className="grid min-h-[320px] md:grid-cols-[46%_54%] lg:min-h-[365px]">
      <div className="relative z-10 flex items-center bg-background/94 px-7 py-10 md:px-[8vw] md:py-12">
        <div className="max-w-[430px]"><p className="mb-2 text-[9px] font-semibold uppercase tracking-[.32em]">{tagline}</p><h1 className="font-serif text-[48px] font-medium leading-[.84] tracking-[-.055em] sm:text-[58px] lg:text-[68px]">{title}</h1><p className="mt-3 text-[15px] leading-5 text-foreground/80">{subtitle}</p><Link href={storefrontPath(s(p.ctaLink) || "/shop", store?.slug)} className="mt-4 inline-flex h-10 items-center gap-5 rounded bg-primary px-5 text-[11px] font-medium text-primary-foreground">{cta}<ArrowRight className="h-4 w-4" /></Link></div>
      </div>
      <div className="relative min-h-[300px] bg-secondary sm:min-h-[360px]">{image ? <><div className="absolute inset-0 hidden sm:block"><SafeStorefrontImage src={image} alt={s(p.imageAlt) || title} fill priority className="object-cover" /></div><div className="absolute inset-0 sm:hidden"><SafeStorefrontImage src={mobile} alt={s(p.imageAlt) || title} fill priority className="object-cover" /></div></> : null}<div className="absolute inset-y-0 right-5 flex w-[155px] items-center bg-background/75 px-5 backdrop-blur-[2px] md:right-10"><div className="font-serif text-[24px] leading-[.92]">People<br/>Places<br/>A Brighter<br/>Tomorrow<div className="mt-4 h-px w-12 bg-foreground" /></div></div></div>
    </div>
  </section>;
}

const trustIcons = [PackageCheck, RotateCcw, CreditCard, Leaf];
function ThreadsTrust({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const raw = Array.isArray(p.badges) ? p.badges.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];
  const defaults = [
    { label: "Free Shipping", description: "On orders over ৳2000" }, { label: "Easy Returns", description: "Within 14 days" }, { label: "Secure Payments", description: "100% protected" }, { label: "Sustainable Choices", description: "For a brighter tomorrow" },
  ];
  const badges = isReferenceStore(store?.id) ? defaults : (raw.length ? raw : defaults);
  return <section className="border-b border-border bg-background"><div className="mx-auto grid max-w-[1280px] grid-cols-2 px-4 md:grid-cols-4">{badges.slice(0,4).map((b,i) => { const Icon = trustIcons[i] ?? Check; return <div key={i} className="flex items-center gap-3 border-border px-3 py-4 md:border-r md:px-7 last:border-r-0"><Icon className="h-7 w-7 shrink-0 stroke-[1.5]" /><div><div className="text-[11px] font-semibold">{s(b.label)}</div><div className="mt-0.5 text-[9px] text-muted-foreground">{s(b.description)}</div></div></div>; })}</div></section>;
}

function categoryFallbackIcon(name: string): ReactNode {
  const value = name.toLowerCase();
  if (value.includes("t-shirt") || value.includes("shirt") || value.includes("men") || value.includes("women")) return <Shirt className="h-8 w-8" />;
  if (value.includes("accessor")) return <ShoppingBag className="h-8 w-8" />;
  if (value.includes("home") || value.includes("living")) return <Home className="h-8 w-8" />;
  if (value.includes("sale")) return <Tag className="h-8 w-8" />;
  return <Sparkles className="h-8 w-8" />;
}
function ThreadsCategories({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: categories = [] } = useProductCategories(store?.id);
  const p = block.props as Record<string, unknown>;
  const explicit = Array.isArray(p.items) ? p.items.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];
  const baseItems = explicit.length ? explicit.map(x => ({ name: s(x.label)||s(x.name), image: s(x.imageUrl)||s(x.image_url), value: s(x.value)||s(x.label)||s(x.name) })) : categories.map(x => ({ name: x.name, image: (x as {image_url?: string}).image_url || "", value: x.name }));
  const referenceNames = ["Women", "Men", "T-Shirts", "Accessories", "Home & Living", "Sale"];
  const items = isReferenceStore(store?.id) ? referenceNames.map((name, i) => ({ name, image: baseItems[i]?.image || "", value: name })) : baseItems.slice(0, typeof p.limit === "number" ? p.limit : 8);
  const carouselItems = repeatForLoop(items);
  const [api, setApi] = useState<CarouselApi>();
  const autoplay = p.autoplay !== false;
  const interval = typeof p.autoplayIntervalMs === "number" ? p.autoplayIntervalMs : 3800;
  useThreadsAutoplay(api, interval, autoplay && items.length > 1);
  if (!items.length) return null;
  const shop = storefrontPath("/shop", store?.slug);
  const title = isReferenceStore(store?.id) ? "Shop by Category" : (s(p.title) || "Shop by Category");
  return <section className="relative overflow-hidden bg-background py-8 md:py-11">
    <Botanical side="right" level={deco(block)} />
    <div className="mx-auto max-w-[1280px] px-5 md:px-8">
      <div className="mb-5 flex items-end justify-between gap-5"><h2 className="font-serif text-[28px] leading-none tracking-[-.025em] md:text-[32px]">{title}</h2><Link href={shop} className="text-[10px] font-semibold uppercase tracking-[.12em]">View All →</Link></div>
      <Carousel setApi={setApi} opts={{ align: "start", loop: items.length > 1, skipSnaps: false }} className="relative">
        <CarouselContent className="-ml-3 pb-1">
          {carouselItems.map((item,i) => <CarouselItem key={`${item.name}-${i}`} className="basis-[72%] pl-3 sm:basis-[36%] md:basis-[24%] lg:basis-[16.9%]">
            <Link href={`${shop}?category=${encodeURIComponent(item.value)}`} className="group block overflow-hidden rounded-[5px] border border-border bg-card shadow-[0_8px_24px_rgba(20,40,28,.06)]">
              <div className="relative aspect-[.80] bg-secondary">{item.image ? <SafeStorefrontImage src={item.image} alt={item.name} fill className="object-cover transition duration-500 group-hover:scale-[1.02]"/> : <div className="grid h-full place-items-center text-primary">{categoryFallbackIcon(item.name)}</div>}</div>
              <div className="flex h-11 items-center justify-between bg-card px-3.5 text-[11px] font-semibold"><span>{item.name}</span><ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"/></div>
            </Link>
          </CarouselItem>)}
        </CarouselContent>
        {p.showArrows !== false ? <><CarouselPrevious className="-left-4 top-[44%] z-20 hidden border-border bg-background shadow-md hover:bg-background md:inline-flex"/><CarouselNext className="-right-4 top-[44%] z-20 hidden border-border bg-background shadow-md hover:bg-background md:inline-flex"/></> : null}
      </Carousel>
    </div>
  </section>;
}

function ThreadsPromo({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore(); const p = block.props as Record<string, unknown>; const reference = isReferenceStore(store?.id);
  const cards = [{ image:s(p.imageUrl), title:reference?"Everyday Essentials":(s(p.title)||"Everyday Essentials"), subtitle:reference?"Comfort meets purpose.":(s(p.subtitle)||"Comfort meets purpose."), cta:reference?"Explore the Collection":(s(p.ctaText)||"Explore the Collection"), href:s(p.ctaLink)||"/shop", reverse:false }, { image:s(p.secondaryImageUrl), title:reference?"Sustainable Choices":(s(p.secondaryTitle)||"Sustainable Choices"), subtitle:reference?"Better materials. A brighter tomorrow.":(s(p.secondarySubtitle)||"Better materials. A brighter tomorrow."), cta:reference?"Learn More":(s(p.secondaryCtaText)||"Learn More"), href:s(p.secondaryCtaLink)||"/shop", reverse:true }];
  return <section className="bg-background px-5 pb-6 pt-1 md:px-8 md:pb-8"><div className="mx-auto grid max-w-[1280px] gap-3.5 md:grid-cols-2">{cards.map((c,i) => <article key={i} className="grid min-h-[210px] overflow-hidden rounded-[6px] border border-border/70 bg-secondary md:min-h-[235px] md:grid-cols-[64%_36%]"><div className={`relative min-h-[190px] overflow-hidden ${c.reverse ? "md:order-2" : ""}`}>{c.image ? <SafeStorefrontImage src={c.image} alt={c.title} fill className="object-cover transition duration-700 hover:scale-[1.015]"/> : null}</div><div className="flex items-center bg-secondary/92 p-5 md:p-6"><div><h2 className="font-serif text-[29px] leading-[.9] tracking-[-.025em] md:text-[36px]">{c.title}</h2><p className="mt-2 text-[12px] leading-5 text-foreground/78">{c.subtitle}</p><Link href={storefrontPath(c.href, store?.slug)} className="mt-4 inline-flex h-9 items-center gap-4 rounded-sm bg-primary px-4 text-[9px] uppercase tracking-[.08em] text-primary-foreground">{c.cta}<ArrowRight className="h-3.5 w-3.5"/></Link></div></div></article>)}</div></section>;
}

function ThreadsProducts({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: products = [] } = useProducts(store?.id);
  const p = block.props as Record<string, unknown>;
  const source = s(p.source);
  const featured = products.filter(product => product.featured);
  const sourceProducts = source === "featured" ? featured : source === "featured-or-all" && featured.length >= 6 ? featured : products;
  const visible = sourceProducts.slice(0, typeof p.limit === "number" ? p.limit : 10);
  const carouselProducts = repeatForLoop(visible);
  const [api, setApi] = useState<CarouselApi>();
  const autoplay = p.autoplay !== false;
  const interval = typeof p.autoplayIntervalMs === "number" ? p.autoplayIntervalMs : 4300;
  useThreadsAutoplay(api, interval, autoplay && visible.length > 1);
  if (!visible.length) return null;
  return <section className="relative overflow-hidden bg-primary py-9 text-primary-foreground md:py-11">
    <Botanical side="left" level={deco(block)} inverse/><Botanical side="right" level={deco(block)} inverse/>
    <div className="mx-auto grid max-w-[1280px] gap-6 px-5 md:grid-cols-[205px_minmax(0,1fr)] md:px-8">
      <div className="relative z-10 flex flex-col justify-center">
        <h2 className="font-serif text-[31px] leading-[.92] md:text-[35px]">Featured<br className="hidden md:block"/> Products</h2>
        <p className="mt-2 text-[12px] text-primary-foreground/72">{isReferenceStore(store?.id)?"Stories you can wear.":(s(p.subtitle)||"Stories you can wear.")}</p>
        <Link href={storefrontPath("/shop",store?.slug)} className="mt-5 inline-flex w-fit items-center gap-4 rounded-sm border border-primary-foreground/45 px-4 py-2.5 text-[9px] uppercase tracking-[.1em]">View All Products<ArrowRight className="h-3.5 w-3.5"/></Link>
        {p.showArrows !== false ? <button type="button" onClick={() => api?.scrollPrev()} className="mt-5 hidden h-9 w-9 place-items-center rounded-full border border-primary-foreground/45 text-primary-foreground transition hover:bg-primary-foreground hover:text-primary md:grid" aria-label="Previous slide"><ArrowLeft className="h-4 w-4" /></button> : null}
      </div>
      <Carousel setApi={setApi} opts={{ align: "start", loop: visible.length > 1, skipSnaps: false }} className="min-w-0 pr-1">
        <CarouselContent className="-ml-3">
          {carouselProducts.map((product, index) => <CarouselItem key={`${product.id}-${index}`} className="basis-[66%] pl-3 sm:basis-[38%] md:basis-[27%] lg:basis-[18.2%]">
            <ThreadsProductCard product={product} framed/>
          </CarouselItem>)}
        </CarouselContent>
        {p.showArrows !== false ? <button type="button" onClick={() => api?.scrollNext()} className="absolute -right-3 top-[44%] z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground/45 bg-background text-primary shadow-md transition hover:scale-105 md:grid" aria-label="Next slide"><ArrowRight className="h-4 w-4" /></button> : null}
        <ThreadsCarouselTicks api={api} count={visible.length}/>
      </Carousel>
    </div>
  </section>;
}

function ThreadsNewArrivals({ block }: { block: StorePageBlock }) {
  const store=useOptionalStore(); const {data:products=[]}=useProducts(store?.id); const p=block.props as Record<string,unknown>; const visible=products.slice(0, typeof p.limit === "number"?p.limit:6); if(!visible.length)return null;
  const title=isReferenceStore(store?.id)?"New at EZCOMO":(s(p.title)||`New at ${store?.name || "Threads"}`);
  return <section className="relative overflow-hidden bg-background py-7 md:py-8"><Botanical side="left" level={deco(block)}/><Botanical side="right" level={deco(block)}/><div className="mx-auto max-w-[1280px] px-5 md:px-8"><h2 className="mb-5 text-center font-serif text-[25px]">{title}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{visible.map(product=><ThreadsProductCard key={product.id} product={product}/>)}</div></div></section>;
}

function ThreadsCommunity({ block }: { block: StorePageBlock }) {
  const store=useOptionalStore(); const p=block.props as Record<string,unknown>; const [email,setEmail]=useState(""); const [done,setDone]=useState(false); const reference=isReferenceStore(store?.id);
  return <section className="relative overflow-hidden border-y border-border bg-secondary/45 py-7"><Botanical side="left" level={deco(block)}/><Botanical side="right" level={deco(block)}/><div className="mx-auto grid max-w-[1100px] items-center gap-5 px-5 md:grid-cols-[1fr_1.1fr] md:px-8"><div><h2 className="font-serif text-[27px] leading-none">{reference?"Join Our Community":(s(p.title)||"Join Our Community")}</h2><p className="mt-1 text-[11px] text-muted-foreground">{reference?"Get updates on new collections, offers, and more.":(s(p.subtitle)||"Get updates on new collections, offers, and more.")}</p></div>{done?<p className="text-sm font-medium">Thank you for subscribing.</p>:<form onSubmit={e=>{e.preventDefault();if(email.includes("@"))setDone(true)}} className="flex h-10 overflow-hidden rounded border border-border bg-background"><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Your email address" className="min-w-0 flex-1 bg-transparent px-4 text-[11px] outline-none"/><button className="w-32 bg-primary text-[10px] text-primary-foreground">Subscribe</button></form>}</div></section>;
}

function ThreadsFaq({ block }: { block: StorePageBlock }) {
  const p=block.props as Record<string,unknown>; const entries=Array.isArray(p.faqs)?p.faqs.filter((x):x is Record<string,unknown>=>!!x&&typeof x==="object"):[]; const [open,setOpen]=useState<number|null>(null); if(!entries.length)return null;
  return <section className="bg-background py-8 md:py-10"><div className="mx-auto grid max-w-[1100px] gap-8 px-5 md:grid-cols-[.75fr_1.25fr] md:px-8"><div><h2 className="font-serif text-[34px] leading-[.92] md:text-[42px]">Frequently<br/>Asked Questions</h2><p className="mt-3 text-[12px]">Everything you need to know, right here.</p></div><div>{entries.slice(0,6).map((e,i)=>{const q=s(e.question)||s(e.q),a=s(e.answer)||s(e.a);return <div key={i} className="border-b border-border"><button onClick={()=>setOpen(open===i?null:i)} className="flex w-full items-center justify-between py-3 text-left text-[11px]"><span>{q}</span><span className="text-base">{open===i?"−":"+"}</span></button>{open===i?<p className="pb-3 pr-8 text-[11px] leading-5 text-muted-foreground">{a}</p>:null}</div>})}</div></div></section>;
}

function extractText(v:unknown):string[]{if(typeof v==="string")return v.trim()?[v.trim()]:[];if(!v||typeof v!=="object")return[];const n=v as Record<string,unknown>;return[...(typeof n.text==="string"&&n.text.trim()?[n.text.trim()]:[]),...(Array.isArray(n.content)?n.content.flatMap(extractText):[])]}
function ThreadsStory({ block }: { block: StorePageBlock }) {
  const store=useOptionalStore(); const p=block.props as Record<string,unknown>; const image=s(p.imageUrl); const para=extractText(p.body); const reference=isReferenceStore(store?.id); const title=reference?"Style Travels Further":(s(p.title)||"Style Travels Further"); const body=reference?"Clothing for a more curious tomorrow. Inspired by places, people and a slower way of living.":(para[0]||"Clothing for a more curious tomorrow. Inspired by places, people and a slower way of living.");
  return <section className="relative min-h-[310px] overflow-hidden bg-secondary md:min-h-[390px]">{image?<SafeStorefrontImage src={image} alt={s(p.imageAlt)||title} fill className="object-cover"/>:null}<div className="absolute inset-y-0 left-0 flex w-full items-center bg-gradient-to-r from-background via-background/92 to-transparent px-6 md:w-[46%] md:px-[8vw]"><div className="max-w-[300px]"><h2 className="font-serif text-[35px] leading-[.9] md:text-[42px]">{title}</h2><p className="mt-3 text-[11px] leading-5">{body}</p><div className="mt-4 h-px w-12 bg-foreground"/></div></div></section>;
}

function ThreadsTestimonials({ block }: { block: StorePageBlock }) { const p=block.props as Record<string,unknown>; const reviews=Array.isArray(p.reviews)?p.reviews.filter((x):x is Record<string,unknown>=>!!x&&typeof x==="object"):[]; if(!reviews.length)return null; return <section className="bg-secondary/35 py-8"><div className="mx-auto grid max-w-[1100px] gap-3 px-5 md:grid-cols-3">{reviews.slice(0,3).map((r,i)=><article key={i} className="bg-background p-5"><p className="text-xs text-primary">★★★★★</p><p className="mt-3 text-[12px] leading-5">“{s(r.comment)||s(r.text)}”</p><p className="mt-3 text-[9px] uppercase tracking-[.12em] text-muted-foreground">{s(r.name)||s(r.author)||"Customer"}</p></article>)}</div></section> }

export function ThreadsBlockRenderer({ block, template }: { block: StorePageBlock; template: StorefrontTemplateDefinition }) {
  switch(block.type){
    case "hero":return <ThreadsHero block={block}/>;
    case "trust-badges":return <ThreadsTrust block={block}/>;
    case "category-showcase":return <ThreadsCategories block={block}/>;
    case "promo-banner":return <ThreadsPromo block={block}/>;
    case "featured-products":return <ThreadsProducts block={block}/>;
    case "recommended-products":return <ThreadsNewArrivals block={block}/>;
    case "social-feed":return <ThreadsCommunity block={block}/>;
    case "faq-accordion":return <ThreadsFaq block={block}/>;
    case "rich-text":return <ThreadsStory block={block}/>;
    case "testimonials":return <ThreadsTestimonials block={block}/>;
    default:return <StorefrontBlockRenderer block={block} template={template}/>;
  }
}