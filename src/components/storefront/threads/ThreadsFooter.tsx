"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Leaf } from "lucide-react";
import { Link } from "@/lib/react-router-dom-shim";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProductCategories } from "@/hooks/useProductCategories";
import { storefrontPath } from "@/lib/slug";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";

type FooterLink = { label?: string; url?: string };
type FooterSettings = {
  brand_name?: string;
  brand_highlight?: string;
  about_text?: string;
  newsletter_heading?: string;
  newsletter_description?: string;
  newsletter_subscribed?: string;
  company_links?: FooterLink[];
  extra_links?: FooterLink[];
  extra_links_title?: string;
  copyright?: string;
  show_shop_links?: boolean;
  show_newsletter?: boolean;
};

export function ThreadsFooter() {
  const store = useOptionalStore();
  const { data: footer } = useSiteSettings<FooterSettings>("footer", store?.id);
  const { data: categories = [] } = useProductCategories(store?.id);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const storageKey = getScopedStorefrontStorageKey("newsletter-subscribed", store?.id);

  useEffect(() => {
    try { setSubscribed(localStorage.getItem(storageKey) === "true"); } catch { setSubscribed(false); }
  }, [storageKey]);

  const shop = storefrontPath("/shop", store?.slug);
  const brandName = footer?.brand_name || store?.name || "Threads";
  const about = footer?.about_text || store?.description || "Everyday clothing with a grounded point of view.";
  const companyLinks = footer?.company_links?.length ? footer.company_links : [
    { label: "Our story", url: "/about" },
    { label: "Contact", url: "/contact" },
    { label: "FAQ", url: "/faq" },
    { label: "Shipping & returns", url: "/policy" },
  ];
  const shopLinks = useMemo(() => categories.slice(0, 5).map((category) => ({ label: category.name, url: `${shop}?category=${encodeURIComponent(category.name)}` })), [categories, shop]);

  const submitNewsletter = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    try { localStorage.setItem(storageKey, "true"); } catch { /* no-op */ }
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="relative overflow-hidden bg-foreground text-background">
      <div aria-hidden className="pointer-events-none absolute -right-14 top-2 text-primary-foreground/10"><Leaf className="h-56 w-56 rotate-12 stroke-[.8]" /><Leaf className="-mt-20 -ml-24 h-44 w-44 -rotate-12 stroke-[.8]" /></div>
      {footer?.show_newsletter !== false ? (
        <div className="border-b border-background/12">
          <div className="mx-auto grid max-w-[1450px] gap-8 px-5 py-12 md:grid-cols-[1fr_.9fr] md:items-center md:px-8 md:py-16 lg:px-12">
            <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-background/45">Stay close</p><h2 className="max-w-[15ch] text-3xl font-black leading-[.98] tracking-[-.045em] md:text-5xl">{footer?.newsletter_heading || "Join the Threads community"}</h2><p className="mt-4 max-w-xl text-sm leading-6 text-background/55">{footer?.newsletter_description || "New drops, useful offers, and styling notes—sent occasionally."}</p></div>
            {subscribed ? <p className="text-sm font-semibold text-background">{footer?.newsletter_subscribed || "You're subscribed!"}</p> : <form onSubmit={submitNewsletter} className="flex min-w-0 items-center rounded-full border border-background/20 bg-background/5 p-1.5"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" aria-label="Email address" className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-background outline-none placeholder:text-background/40" /><button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Subscribe"><ArrowRight className="h-4 w-4" /></button></form>}
          </div>
        </div>
      ) : null}

      <div className="relative mx-auto grid max-w-[1450px] gap-10 px-5 py-12 md:grid-cols-[1.4fr_.8fr_.8fr_.8fr] md:px-8 md:py-16 lg:px-12">
        <div><p className="text-3xl font-black uppercase tracking-[-.05em]">{brandName}{footer?.brand_highlight ? <span className="text-primary">{footer.brand_highlight}</span> : null}</p><p className="mt-4 max-w-md text-sm leading-6 text-background/55">{about}</p></div>
        {footer?.show_shop_links !== false ? <div><p className="mb-4 text-[10px] font-bold uppercase tracking-[.18em] text-background/40">Shop</p><div className="space-y-3 text-sm">{(shopLinks.length ? shopLinks : [{ label: "Shop all", url: shop }, { label: "New in", url: `${shop}?sort=newest` }]).map((item) => <Link key={`${item.label}-${item.url}`} to={item.url} className="block text-background/75 transition hover:text-background">{item.label}</Link>)}</div></div> : null}
        <div><p className="mb-4 text-[10px] font-bold uppercase tracking-[.18em] text-background/40">Company</p><div className="space-y-3 text-sm">{companyLinks.map((item, index) => item.label && item.url ? <Link key={`${item.label}-${index}`} to={storefrontPath(item.url, store?.slug)} className="block text-background/75 transition hover:text-background">{item.label}</Link> : null)}</div></div>
        {footer?.extra_links?.length ? <div><p className="mb-4 text-[10px] font-bold uppercase tracking-[.18em] text-background/40">{footer.extra_links_title || "More"}</p><div className="space-y-3 text-sm">{footer.extra_links.map((item, index) => item.label && item.url ? <Link key={`${item.label}-${index}`} to={storefrontPath(item.url, store?.slug)} className="block text-background/75 transition hover:text-background">{item.label}</Link> : null)}</div></div> : null}
      </div>
      <div className="border-t border-background/10 px-5 py-5 text-center text-[10px] uppercase tracking-[.16em] text-background/35">{footer?.copyright || `Copyright ${new Date().getFullYear()}. All rights reserved.`} · Powered by EZComo</div>
    </footer>
  );
}
