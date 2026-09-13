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
  const storageKey = getScopedStorefrontStorageKey(
    "newsletter-subscribed",
    store?.id,
  );
  useEffect(() => {
    try {
      setSubscribed(localStorage.getItem(storageKey) === "true");
    } catch {
      setSubscribed(false);
    }
  }, [storageKey]);
  const isReferencePreview = store?.id === "preview-threads";
  const shop = storefrontPath("/shop", store?.slug);
  const brand = isReferencePreview
    ? "CHAPCHITRA"
    : footer?.brand_name || store?.name || "THREADS";
  const about = isReferencePreview
    ? "Wear your story through art, culture, people and everyday objects."
    : footer?.about_text ||
      store?.description ||
      "Wear your story through art, culture, people and everyday objects.";
  const shopLinks = useMemo(
    () =>
      categories.slice(0, 5).map((c) => ({
        label: c.name,
        url: `${shop}?category=${encodeURIComponent(c.name)}`,
      })),
    [categories, shop],
  );
  const support = [
    { label: "Track Your Order", url: "/track-order" },
    { label: "Returns & Exchanges", url: "/returns" },
    { label: "Shipping Info", url: "/faq" },
    { label: "Size Guide", url: "/faq" },
    { label: "FAQs", url: "/faq" },
    { label: "Contact Us", url: "/contact" },
  ];
  const referenceAbout = [
    { label: "Our Story", url: "/about" },
    { label: "Sustainability", url: "/about" },
    { label: "Journal", url: "/blog" },
    { label: "Careers", url: "/contact" },
    { label: "Wholesale", url: "/contact" },
  ];
  const aboutLinks = isReferencePreview
    ? referenceAbout
    : footer?.company_links?.length
      ? footer.company_links
      : referenceAbout;
  const resolvedShopLinks = shopLinks.length
    ? [
        ...shopLinks,
        { label: "Sale", url: `${shop}?sale=1` },
        { label: "New Arrivals", url: `${shop}?sort=newest` },
      ]
    : [
        { label: "Shop all", url: shop },
        { label: "Sale", url: `${shop}?sale=1` },
        { label: "New Arrivals", url: `${shop}?sort=newest` },
      ];
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
    setSubscribed(true);
    setEmail("");
  };
  return (
    <footer className="relative overflow-hidden bg-primary text-primary-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-7 right-0 hidden w-[42%] max-w-[620px] text-primary-foreground/18 md:block"
      >
        <svg
          viewBox="0 0 640 250"
          fill="none"
          className="h-auto w-full"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M8 226h624M42 226v-58h38v58m0-34h34v34m12 0v-92h46v92m0-64h38v64m16 0v-122h58v122m0-86h42v86m14 0v-72h52v72m0-46h34v46m18 0v-104h54v104m0-62h38v62m18 0v-82h50v82" />
          <path d="M133 134l16-22 16 22M242 104l29-28 29 28M449 122l27-31 27 31M536 144l22-24 22 24" />
          <path
            d="M18 210c70-21 117-22 174-3 47 16 86 16 135 0 54-18 109-18 173 1 39 12 83 13 128 3"
            opacity=".7"
          />
          <circle cx="552" cy="52" r="34" opacity=".45" />
          <path d="M526 52h52M552 26v52" opacity=".45" />
        </svg>
      </div>
      <div className="relative mx-auto grid max-w-[1280px] gap-6 px-5 py-7 md:grid-cols-[1.2fr_.55fr_.65fr_.65fr_1.15fr] md:gap-9 md:px-8 md:py-12">
        <div>
          <div className="font-serif text-[28px] uppercase leading-none">
            {brand}
          </div>
          <div className="mt-1 text-[6px] uppercase tracking-[.18em] text-primary-foreground/60">
            Art · Culture · People · A Higher Thread
          </div>
          <p className="mt-5 hidden max-w-[230px] text-[11px] leading-5 text-primary-foreground/70 md:block">
            {about}
          </p>
          <div className="mt-5 hidden gap-4 md:flex">
            <Instagram className="h-4 w-4" />
            <Facebook className="h-4 w-4" />
            <Youtube className="h-4 w-4" />
          </div>
        </div>
        <div className="divide-y divide-primary-foreground/20 border-y border-primary-foreground/20 md:hidden">
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[10px] font-semibold">
              Shop <span aria-hidden>+</span>
            </summary>
            <div className="space-y-2 pb-4 text-[10px] text-primary-foreground/75">
              {resolvedShopLinks.map((x) => (
                <Link key={x.label} to={x.url} className="block py-1">
                  {x.label}
                </Link>
              ))}
            </div>
          </details>
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[10px] font-semibold">
              Customer Care <span aria-hidden>+</span>
            </summary>
            <div className="space-y-2 pb-4 text-[10px] text-primary-foreground/75">
              {support.map((x) => (
                <Link
                  key={x.label}
                  to={storefrontPath(x.url, store?.slug)}
                  className="block py-1"
                >
                  {x.label}
                </Link>
              ))}
            </div>
          </details>
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[10px] font-semibold">
              About <span aria-hidden>+</span>
            </summary>
            <div className="space-y-2 pb-4 text-[10px] text-primary-foreground/75">
              {aboutLinks.map((x, i) =>
                x.label && x.url ? (
                  <Link
                    key={`${x.label}-${i}`}
                    to={storefrontPath(x.url, store?.slug)}
                    className="block py-1"
                  >
                    {x.label}
                  </Link>
                ) : null,
              )}
            </div>
          </details>
        </div>
        <div className="hidden md:block">
          <h3 className="mb-3 text-[11px] font-semibold">Shop</h3>
          <div className="space-y-2 text-[10px] text-primary-foreground/75">
            {resolvedShopLinks.map((x) => (
              <Link key={x.label} to={x.url} className="block">
                {x.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="hidden md:block">
          <h3 className="mb-3 text-[11px] font-semibold">Support</h3>
          <div className="space-y-2 text-[10px] text-primary-foreground/75">
            {support.map((x) => (
              <Link
                key={x.label}
                to={storefrontPath(x.url, store?.slug)}
                className="block"
              >
                {x.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="hidden md:block">
          <h3 className="mb-3 text-[11px] font-semibold">About</h3>
          <div className="space-y-2 text-[10px] text-primary-foreground/75">
            {aboutLinks.map((x, i) =>
              x.label && x.url ? (
                <Link
                  key={`${x.label}-${i}`}
                  to={storefrontPath(x.url, store?.slug)}
                  className="block"
                >
                  {x.label}
                </Link>
              ) : null,
            )}
          </div>
        </div>
        <div>
          {footer?.show_newsletter !== false ? (
            <>
              <h3 className="text-[11px] font-semibold">
                {isReferencePreview
                  ? "Stay in the Story"
                  : footer?.newsletter_heading || "Stay in the Story"}
              </h3>
              <p className="mt-2 text-[10px] leading-4 text-primary-foreground/65">
                {isReferencePreview
                  ? "New drops, studio stories and thoughtful things, occasionally."
                  : footer?.newsletter_description ||
                    "New drops, studio stories and thoughtful things, occasionally."}
              </p>
              {subscribed ? (
                <p className="mt-4 text-[11px]">
                  {footer?.newsletter_subscribed || "You're subscribed!"}
                </p>
              ) : (
                <form
                  onSubmit={submit}
                  className="mt-4 flex min-h-11 overflow-hidden rounded-sm bg-background"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    aria-label="Email address for newsletter"
                    className="min-w-0 flex-1 bg-transparent px-3 text-[10px] text-foreground outline-none"
                  />
                  <button
                    type="submit"
                    className="grid min-w-11 place-items-center bg-secondary text-foreground"
                    aria-label="Subscribe"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </>
          ) : null}
          <div className="mt-5 flex gap-4 md:hidden">
            <Instagram className="h-4 w-4" />
            <Facebook className="h-4 w-4" />
            <Youtube className="h-4 w-4" />
          </div>
          <div className="mt-6 font-serif text-[22px] italic leading-[.95] text-primary-foreground/70 md:mt-7 md:text-[24px]">
            A Kinder
            <br />
            Tomorrow
          </div>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-5 text-[9px] text-primary-foreground/55 md:flex-row md:items-center md:justify-between md:px-8">
          <span>
            {isReferencePreview
              ? `© ${new Date().getFullYear()} CHAPCHITRA. All rights reserved.`
              : footer?.copyright ||
                `© ${new Date().getFullYear()} ${brand}. All rights reserved.`}
          </span>
          <span>
            Privacy Policy &nbsp; | &nbsp; Terms of Service &nbsp; | &nbsp;
            Cookie Settings
          </span>
        </div>
      </div>
    </footer>
  );
}
