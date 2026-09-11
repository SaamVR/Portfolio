"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Facebook, Instagram, Youtube } from "lucide-react";
import { Link } from "@/lib/react-router-dom-shim";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProductCategories } from "@/hooks/useProductCategories";
import { storefrontPath } from "@/lib/slug";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";

type FooterLink = { label?: string; url?: string };
type FooterSettings = {
  brand_name?: string; brand_highlight?: string; about_text?: string; newsletter_heading?: string; newsletter_description?: string; newsletter_subscribed?: string;
  company_links?: FooterLink[]; extra_links?: FooterLink[]; extra_links_title?: string; copyright?: string; show_shop_links?: boolean; show_newsletter?: boolean;
};

export function ThreadsFooter() {
  const store=useOptionalStore(); const {data:footer}=useSiteSettings<FooterSettings>("footer",store?.id); const {data:categories=[]}=useProductCategories(store?.id);
  const [email,setEmail]=useState(""); const [subscribed,setSubscribed]=useState(false); const storageKey=getScopedStorefrontStorageKey("newsletter-subscribed",store?.id);
  useEffect(()=>{try{setSubscribed(localStorage.getItem(storageKey)==="true")}catch{setSubscribed(false)}},[storageKey]);
  const isReferencePreview=store?.id==="preview-threads";
  const shop=storefrontPath("/shop",store?.slug); const brand=isReferencePreview?"EZCOMO":(footer?.brand_name||store?.name||"EZCOMO"); const about=isReferencePreview?"Modern clothing inspired by places, people and a more meaningful way of living.":(footer?.about_text||store?.description||"Modern clothing inspired by places, people and a more meaningful way of living.");
  const shopLinks=useMemo(()=>categories.slice(0,5).map(c=>({label:c.name,url:`${shop}?category=${encodeURIComponent(c.name)}`})),[categories,shop]);
  const referenceShopLinks=[{label:"Women",url:`${shop}?category=Women`},{label:"Men",url:`${shop}?category=Men`},{label:"Accessories",url:`${shop}?category=Accessories`},{label:"Home & Living",url:`${shop}?category=Home%20%26%20Living`},{label:"Sale",url:`${shop}?sale=1`},{label:"New Arrivals",url:`${shop}?sort=newest`}];
  const support=[{label:"Track Your Order",url:"/track-order"},{label:"Returns & Exchanges",url:"/returns"},{label:"Shipping Info",url:"/faq"},{label:"Size Guide",url:"/faq"},{label:"FAQs",url:"/faq"},{label:"Contact Us",url:"/contact"}];
  const referenceAbout=[{label:"Our Story",url:"/about"},{label:"Sustainability",url:"/about"},{label:"Journal",url:"/blog"},{label:"Careers",url:"/contact"},{label:"Wholesale",url:"/contact"}];
  const aboutLinks=isReferencePreview?referenceAbout:(footer?.company_links?.length?footer.company_links:referenceAbout);
  const resolvedShopLinks=isReferencePreview?referenceShopLinks:(shopLinks.length?shopLinks:[{label:"Shop all",url:shop},{label:"New Arrivals",url:`${shop}?sort=newest`}]);
  const submit=(e:React.FormEvent)=>{e.preventDefault();if(!email.includes("@"))return;try{localStorage.setItem(storageKey,"true")}catch{}setSubscribed(true);setEmail("")};
  return <footer className="relative overflow-hidden bg-primary text-primary-foreground">
    <div aria-hidden className="pointer-events-none absolute bottom-7 right-0 hidden w-[42%] max-w-[620px] text-primary-foreground/18 md:block">
      <svg viewBox="0 0 640 250" fill="none" className="h-auto w-full" stroke="currentColor" strokeWidth="1.4">
        <path d="M8 226h624M42 226v-58h38v58m0-34h34v34m12 0v-92h46v92m0-64h38v64m16 0v-122h58v122m0-86h42v86m14 0v-72h52v72m0-46h34v46m18 0v-104h54v104m0-62h38v62m18 0v-82h50v82"/>
        <path d="M133 134l16-22 16 22M242 104l29-28 29 28M449 122l27-31 27 31M536 144l22-24 22 24"/>
        <path d="M18 210c70-21 117-22 174-3 47 16 86 16 135 0 54-18 109-18 173 1 39 12 83 13 128 3" opacity=".7"/>
        <circle cx="552" cy="52" r="34" opacity=".45"/><path d="M526 52h52M552 26v52" opacity=".45"/>
      </svg>
    </div>
    <div className="relative mx-auto grid max-w-[1280px] gap-9 px-5 py-10 md:grid-cols-[1.2fr_.55fr_.65fr_.65fr_1.15fr] md:px-8 md:py-12">
      <div><div className="font-serif text-[28px] uppercase leading-none">{brand}</div><div className="mt-1 text-[6px] uppercase tracking-[.18em] text-primary-foreground/60">People · Places · A Brighter Tomorrow</div><p className="mt-5 max-w-[230px] text-[11px] leading-5 text-primary-foreground/70">{about}</p><div className="mt-5 flex gap-4"><Instagram className="h-4 w-4"/><Facebook className="h-4 w-4"/><Youtube className="h-4 w-4"/></div></div>
      <div><h3 className="mb-3 text-[11px] font-semibold">Shop</h3><div className="space-y-2 text-[10px] text-primary-foreground/75">{resolvedShopLinks.map(x=><Link key={x.label} to={x.url} className="block">{x.label}</Link>)}</div></div>
      <div><h3 className="mb-3 text-[11px] font-semibold">Support</h3><div className="space-y-2 text-[10px] text-primary-foreground/75">{support.map(x=><Link key={x.label} to={storefrontPath(x.url,store?.slug)} className="block">{x.label}</Link>)}</div></div>
      <div><h3 className="mb-3 text-[11px] font-semibold">About</h3><div className="space-y-2 text-[10px] text-primary-foreground/75">{aboutLinks.map((x,i)=>x.label&&x.url?<Link key={`${x.label}-${i}`} to={storefrontPath(x.url,store?.slug)} className="block">{x.label}</Link>:null)}</div></div>
      <div>{footer?.show_newsletter!==false?<><h3 className="text-[11px] font-semibold">{isReferencePreview?"Be the First to Know":(footer?.newsletter_heading||"Be the First to Know")}</h3><p className="mt-2 text-[10px] leading-4 text-primary-foreground/65">{isReferencePreview?"Join for new drops, stories and exclusive offers.":(footer?.newsletter_description||"Join for new drops, stories and exclusive offers.")}</p>{subscribed?<p className="mt-4 text-[11px]">{footer?.newsletter_subscribed||"You're subscribed!"}</p>:<form onSubmit={submit} className="mt-4 flex h-9 overflow-hidden rounded-sm bg-background"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email address" className="min-w-0 flex-1 bg-transparent px-3 text-[10px] text-foreground outline-none"/><button className="grid w-10 place-items-center bg-secondary text-foreground" aria-label="Subscribe"><ArrowRight className="h-4 w-4"/></button></form>}</>:null}<div className="mt-7 font-serif text-[24px] italic leading-[.95] text-primary-foreground/70">A Brighter<br/>Tomorrow</div></div>
    </div>
    <div className="border-t border-primary-foreground/15"><div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-5 text-[9px] text-primary-foreground/55 md:flex-row md:items-center md:justify-between md:px-8"><span>{isReferencePreview?`© ${new Date().getFullYear()} EZCOMO. All rights reserved.`:(footer?.copyright||`© ${new Date().getFullYear()} ${brand}. All rights reserved.`)}</span><span>Privacy Policy &nbsp; | &nbsp; Terms of Service &nbsp; | &nbsp; Cookie Settings</span></div></div>
  </footer>;
}