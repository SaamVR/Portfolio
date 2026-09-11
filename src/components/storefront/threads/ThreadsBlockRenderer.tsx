"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronDown, CreditCard, Leaf, PackageCheck, RotateCcw, ShieldCheck, Shirt, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { ThreadsProductCard } from "@/components/storefront/threads/ThreadsProductCard";
import { storefrontPath } from "@/lib/slug";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";

const s = (v: unknown) => typeof v === "string" ? v.trim() : "";
type DecorationLevel = "none" | "subtle" | "full";
const deco = (block: StorePageBlock): DecorationLevel => block.decoration ?? "subtle";

function Botanical({ side = "left", level = "subtle", inverse = false }: { side?: "left" | "right"; level?: DecorationLevel; inverse?: boolean }) {
  if (level === "none") return null;
  return <div aria-hidden className={`pointer-events-none absolute z-[1] hidden md:block ${side === "left" ? "-left-5" : "-right-5 -scale-x-100"} ${level === "full" ? "scale-110 opacity-100" : "opacity-70"} ${inverse ? "text-primary-foreground/13" : "text-primary/20"}`}>
    <Leaf className="h-28 w-28 -rotate-[24deg] stroke-[1]" /><Leaf className="-mt-12 ml-12 h-20 w-20 rotate-[10deg] stroke-[1]" /><Leaf className="-mt-9 ml-2 h-16 w-16 -rotate-[55deg] stroke-[1]" />
  </div>;
}

function useAutoRail(ref: RefObject<HTMLDivElement | null>, interval: number, enabled: boolean) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let paused = false;
    const stop = () => { paused = true; };
    const start = () => { paused = false; };
    ["mouseenter", "focusin", "pointerdown"].forEach(e => node.addEventListener(e, stop));
    ["mouseleave", "focusout", "pointerup"].forEach(e => node.addEventListener(e, start));
    const timer = window.setInterval(() => {
      if (paused || node.scrollWidth <= node.clientWidth + 8) return;
      const step = Math.max(250, node.clientWidth * .72);
      const end = node.scrollLeft + node.clientWidth >= node.scrollWidth - 12;
      node.scrollTo({ left: end ? 0 : node.scrollLeft + step, behavior: "smooth" });
    }, interval);
    return () => { window.clearInterval(timer); ["mouseenter", "focusin", "pointerdown"].forEach(e => node.removeEventListener(e, stop)); ["mouseleave", "focusout", "pointerup"].forEach(e => node.removeEventListener(e, start)); };
  }, [enabled, interval, ref]);
}

function RailButtons({ rail, inverse = false }: { rail: RefObject<HTMLDivElement | null>; inverse?: boolean }) {
  const move = (n: number) => rail.current?.scrollBy({ left: n * Math.max(260, (rail.current?.clientWidth ?? 360) * .74), behavior: "smooth" });
  const cls = inverse ? "border-primary-foreground/45 text-primary-foreground hover:bg-primary-foreground hover:text-primary" : "border-border bg-background text-foreground hover:border-primary";
  return <div className="flex gap-2"><button type="button" onClick={() => move(-1)} className={`grid h-9 w-9 place-items-center rounded-full border ${cls}`} aria-label="Previous"><ArrowLeft className="h-4 w-4" /></button><button type="button" onClick={() => move(1)} className={`grid h-9 w-9 place-items-center rounded-full border ${cls}`} aria-label="Next"><ArrowRight className="h-4 w-4" /></button></div>;
}

function ThreadsHero({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const image = s(p.imageUrl) || s(p.mediaUrl);
  const mobile = s(p.mobileImageUrl) || image;
  const title = s(p.title) || "Wear Your Story";
  const subtitle = s(p.subtitle) || "Thoughtfully designed. Made for your everyday.";
  return <section className="relative overflow-hidden border-b border-border bg-secondary/35">
    <Botanical side="left" level={deco(block)} />
    <div className="grid min-h-[320px] md:grid-cols-[46%_54%] lg:min-h-[365px]">
      <div className="relative z-10 flex items-center bg-background/94 px-7 py-10 md:px-[8vw] md:py-12">
        <div className="max-w-[430px]"><p className="mb-2 text-[9px] font-semibold uppercase tracking-[.32em]">{s(p.tagline) || "New Collection"}</p><h1 className="font-serif text-[48px] font-medium leading-[.84] tracking-[-.055em] sm:text-[58px] lg:text-[68px]">{title}</h1><p className="mt-3 text-[15px] leading-5 text-foreground/80">{subtitle}</p><Link href={storefrontPath(s(p.ctaLink) || "/shop", store?.slug)} className="mt-4 inline-flex h-10 items-center gap-5 rounded bg-primary px-5 text-[11px] font-medium text-primary-foreground">{s(p.ctaText) || "Shop New Arrivals"}<ArrowRight className="h-4 w-4" /></Link></div>
      </div>
      <div className="relative min-h-[300px] bg-secondary sm:min-h-[360px]">{image ? <><div className="absolute inset-0 hidden sm:block"><SafeStorefrontImage src={image} alt={s(p.imageAlt) || title} fill priority className="object-cover" /></div><div className="absolute inset-0 sm:hidden"><SafeStorefrontImage src={mobile} alt={s(p.imageAlt) || title} fill priority className="object-cover" /></div></> : null}<div className="absolute inset-y-0 right-5 flex w-[155px] items-center bg-background/75 px-5 backdrop-blur-[2px] md:right-10"><div className="font-serif text-[24px] leading-[.92]">People<br/>Places<br/>A Brighter<br/>Tomorrow<div className="mt-4 h-px w-12 bg-foreground" /></div></div></div>
    </div>
  </section>;
}

const trustIcons = [PackageCheck, RotateCcw, CreditCard, Leaf];
function ThreadsTrust({ block }: { block: StorePageBlock }) {
  const p = block.props as Record<string, unknown>;
  const raw = Array.isArray(p.badges) ? p.badges.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];
  const defaults = [
    { label: "Free Shipping", description: "On orders over ৳2000" }, { label: "Easy Returns", description: "Within 14 days" }, { label: "Secure Payments", description: "100% protected" }, { label: "Sustainable Choices", description: "For a brighter tomorrow" },
  ];
  const badges = raw.length ? raw : defaults;
  return <section className="border-b border-border bg-background"><div className="mx-auto grid max-w-[1280px] grid-cols-2 px-4 md:grid-cols-4">{badges.slice(0,4).map((b,i) => { const Icon = trustIcons[i] ?? Check; return <div key={i} className="flex items-center gap-3 border-border px-3 py-4 md:border-r md:px-7 last:border-r-0"><Icon className="h-7 w-7 shrink-0 stroke-[1.5]" /><div><div className="text-[11px] font-semibold">{s(b.label)}</div><div className="mt-0.5 text-[9px] text-muted-foreground">{s(b.description)}</div></div></div>; })}</div></section>;
}

const fallbackIcons: ReactNode[] = [<Shirt key="a" className="h-8 w-8"/>, <Sparkles key="b" className="h-8 w-8"/>, <Leaf key="c" className="h-8 w-8"/>];
function ThreadsCategories({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: categories = [] } = useProductCategories(store?.id);
  const p = block.props as Record<string, unknown>;
  const explicit = Array.isArray(p.items) ? p.items.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];
  const items = (explicit.length ? explicit.map(x => ({ name: s(x.label)||s(x.name), image: s(x.imageUrl)||s(x.image_url), value: s(x.value)||s(x.label)||s(x.name) })) : categories.map(x => ({ name: x.name, image: (x as {image_url?: string}).image_url || "", value: x.name }))).slice(0, typeof p.limit === "number" ? p.limit : 8);
  const rail = useRef<HTMLDivElement>(null); useAutoRail(rail, typeof p.autoplayIntervalMs === "number" ? p.autoplayIntervalMs : 3800, p.autoplay !== false);
  if (!items.length) return null;
  const shop = storefrontPath("/shop", store?.slug);
  return <section className="relative overflow-hidden bg-background py-7 md:py-8"><Botanical side="right" level={deco(block)} /><div className="mx-auto max-w-[1280px] px-5 md:px-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-[20px] font-semibold tracking-[-.02em] md:text-[24px]">{s(p.title)||"Shop by Category"}</h2><Link href={shop} className="text-[10px] font-semibold">View All →</Link></div><div className="relative"><button onClick={() => rail.current?.scrollBy({left:-300,behavior:"smooth"})} className="absolute -left-4 top-[42%] z-10 hidden h-8 w-8 place-items-center rounded-full bg-background shadow md:grid" aria-label="Previous"><ArrowLeft className="h-4 w-4"/></button><div ref={rail} className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{items.map((item,i) => <Link key={`${item.name}-${i}`} href={`${shop}?category=${encodeURIComponent(item.value)}`} className="w-[69vw] max-w-[190px] shrink-0 snap-start overflow-hidden rounded-md border border-border bg-card shadow-sm sm:w-[32vw] md:w-[185px] lg:w-[190px]"><div className="relative aspect-[.83] bg-secondary">{item.image ? <SafeStorefrontImage src={item.image} alt={item.name} fill className="object-cover"/> : <div className="grid h-full place-items-center text-primary">{fallbackIcons[i%fallbackIcons.length]}</div>}</div><div className="flex h-9 items-center justify-between px-3 text-[11px] font-semibold"><span>{item.name}</span><ArrowRight className="h-3.5 w-3.5"/></div></Link>)}</div><button onClick={() => rail.current?.scrollBy({left:300,behavior:"smooth"})} className="absolute -right-4 top-[42%] z-10 hidden h-8 w-8 place-items-center rounded-full bg-background shadow md:grid" aria-label="Next"><ArrowRight className="h-4 w-4"/></button></div></div></section>;
}

function ThreadsPromo({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore(); const p = block.props as Record<string, unknown>;
  const cards = [{ image:s(p.imageUrl), title:s(p.title)||"Everyday Essentials", subtitle:s(p.subtitle)||"Comfort meets purpose.", cta:s(p.ctaText)||"Explore the Collection", href:s(p.ctaLink)||"/shop", reverse:false }, { image:s(p.secondaryImageUrl), title:s(p.secondaryTitle)||"Sustainable Choices", subtitle:s(p.secondarySubtitle)||"Better materials. A brighter tomorrow.", cta:s(p.secondaryCtaText)||"Learn More", href:s(p.secondaryCtaLink)||"/shop", reverse:true }];
  return <section className="bg-background px-5 pb-3 pt-1 md:px-8"><div className="mx-auto grid max-w-[1280px] gap-3 md:grid-cols-2">{cards.map((c,i) => <article key={i} className="grid min-h-[175px] overflow-hidden rounded-md bg-secondary md:grid-cols-[58%_42%]"><div className={`relative min-h-[175px] ${c.reverse ? "md:order-2" : ""}`}>{c.image ? <SafeStorefrontImage src={c.image} alt={c.title} fill className="object-cover"/> : null}</div><div className="flex items-center p-5"><div><h2 className="font-serif text-[28px] leading-[.9] md:text-[34px]">{c.title}</h2><p className="mt-2 text-[13px]">{c.subtitle}</p><Link href={storefrontPath(c.href, store?.slug)} className="mt-3 inline-flex h-9 items-center gap-4 rounded bg-primary px-4 text-[9px] text-primary-foreground">{c.cta}<ArrowRight className="h-3.5 w-3.5"/></Link></div></div></article>)}</div></section>;
}

function ThreadsProducts({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore(); const { data: products = [] } = useProducts(store?.id); const p = block.props as Record<string, unknown>;
  const source = s(p.source); const visible = (source === "featured" ? products.filter(x=>x.featured) : products).slice(0, typeof p.limit === "number" ? p.limit : 8); const rail=useRef<HTMLDivElement>(null); useAutoRail(rail, typeof p.autoplayIntervalMs === "number" ? p.autoplayIntervalMs : 4300, p.autoplay !== false); if(!visible.length)return null;
  return <section className="relative overflow-hidden bg-primary py-7 text-primary-foreground md:py-8"><Botanical side="left" level={deco(block)} inverse/><Botanical side="right" level={deco(block)} inverse/><div className="mx-auto grid max-w-[1280px] gap-5 px-5 md:grid-cols-[190px_1fr] md:px-8"><div className="relative z-10 flex flex-col justify-center"><h2 className="font-serif text-[28px] leading-none md:text-[30px]">{s(p.title)||"Featured Products"}</h2><p className="mt-1 text-[12px] text-primary-foreground/75">{s(p.subtitle)||"Stories you can wear."}</p><Link href={storefrontPath("/shop",store?.slug)} className="mt-4 inline-flex w-fit items-center gap-4 rounded border border-primary-foreground/55 px-4 py-2 text-[9px]">View All Products<ArrowRight className="h-3.5 w-3.5"/></Link><div className="mt-4 hidden md:block"><RailButtons rail={rail} inverse/></div></div><div ref={rail} className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{visible.map(product => <div key={product.id} className="w-[62vw] max-w-[170px] shrink-0 snap-start sm:w-[34vw] md:w-[160px]"><ThreadsProductCard product={product} framed/></div>)}</div></div></section>;
}

function ThreadsNewArrivals({ block }: { block: StorePageBlock }) {
  const store=useOptionalStore(); const {data:products=[]}=useProducts(store?.id); const p=block.props as Record<string,unknown>; const visible=products.slice(0, typeof p.limit === "number"?p.limit:6); if(!visible.length)return null;
  return <section className="relative overflow-hidden bg-background py-7 md:py-8"><Botanical side="left" level={deco(block)}/><Botanical side="right" level={deco(block)}/><div className="mx-auto max-w-[1280px] px-5 md:px-8"><h2 className="mb-5 text-center font-serif text-[25px]">{s(p.title)||"New at EZCOMO"}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{visible.map(product=><ThreadsProductCard key={product.id} product={product}/>)}</div></div></section>;
}

function ThreadsCommunity({ block }: { block: StorePageBlock }) {
  const p=block.props as Record<string,unknown>; const [email,setEmail]=useState(""); const [done,setDone]=useState(false);
  return <section className="relative overflow-hidden border-y border-border bg-secondary/45 py-7"><Botanical side="left" level={deco(block)}/><Botanical side="right" level={deco(block)}/><div className="mx-auto grid max-w-[1100px] items-center gap-5 px-5 md:grid-cols-[1fr_1.1fr] md:px-8"><div><h2 className="font-serif text-[27px] leading-none">{s(p.title)||"Join Our Community"}</h2><p className="mt-1 text-[11px] text-muted-foreground">{s(p.subtitle)||"Get updates on new collections, offers and more."}</p></div>{done?<p className="text-sm font-medium">Thank you for subscribing.</p>:<form onSubmit={e=>{e.preventDefault();if(email.includes("@"))setDone(true)}} className="flex h-10 overflow-hidden rounded border border-border bg-background"><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Your email address" className="min-w-0 flex-1 bg-transparent px-4 text-[11px] outline-none"/><button className="w-32 bg-primary text-[10px] text-primary-foreground">Subscribe</button></form>}</div></section>;
}

function ThreadsFaq({ block }: { block: StorePageBlock }) {
  const p=block.props as Record<string,unknown>; const entries=Array.isArray(p.faqs)?p.faqs.filter((x):x is Record<string,unknown>=>!!x&&typeof x==="object"):[]; const [open,setOpen]=useState<number|null>(null); if(!entries.length)return null;
  return <section className="bg-background py-8 md:py-10"><div className="mx-auto grid max-w-[1100px] gap-8 px-5 md:grid-cols-[.75fr_1.25fr] md:px-8"><div><h2 className="font-serif text-[34px] leading-[.92] md:text-[42px]">Frequently<br/>Asked Questions</h2><p className="mt-3 text-[12px]">Everything you need to know, right here.</p></div><div>{entries.slice(0,6).map((e,i)=>{const q=s(e.question)||s(e.q),a=s(e.answer)||s(e.a);return <div key={i} className="border-b border-border"><button onClick={()=>setOpen(open===i?null:i)} className="flex w-full items-center justify-between py-3 text-left text-[11px]"><span>{q}</span><span className="text-base">{open===i?"−":"+"}</span></button>{open===i?<p className="pb-3 pr-8 text-[11px] leading-5 text-muted-foreground">{a}</p>:null}</div>})}</div></div></section>;
}

function extractText(v:unknown):string[]{if(typeof v==="string")return v.trim()?[v.trim()]:[];if(!v||typeof v!=="object")return[];const n=v as Record<string,unknown>;return[...(typeof n.text==="string"&&n.text.trim()?[n.text.trim()]:[]),...(Array.isArray(n.content)?n.content.flatMap(extractText):[])]}
function ThreadsStory({ block }: { block: StorePageBlock }) {
  const p=block.props as Record<string,unknown>; const image=s(p.imageUrl); const para=extractText(p.body); return <section className="relative min-h-[310px] overflow-hidden bg-secondary md:min-h-[390px]">{image?<SafeStorefrontImage src={image} alt={s(p.imageAlt)||s(p.title)||"Style travels further"} fill className="object-cover"/>:null}<div className="absolute inset-y-0 left-0 flex w-full items-center bg-gradient-to-r from-background via-background/92 to-transparent px-6 md:w-[46%] md:px-[8vw]"><div className="max-w-[300px]"><h2 className="font-serif text-[35px] leading-[.9] md:text-[42px]">{s(p.title)||"Style Travels Further"}</h2><p className="mt-3 text-[11px] leading-5">{para[0]||"Clothing for a more curious tomorrow. Inspired by places, people and a slower way of living."}</p><div className="mt-4 h-px w-12 bg-foreground"/></div></div></section>;
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
