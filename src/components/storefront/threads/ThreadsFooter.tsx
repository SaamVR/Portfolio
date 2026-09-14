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
  about_text?: string;
  newsletter_heading?: string;
  newsletter_description?: string;
  newsletter_subscribed?: string;
  company_links?: FooterLink[];
  copyright?: string;
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
    ? "EZCOMO"
    : footer?.brand_name || store?.name || "THREADS";
  const about = isReferencePreview
    ? "Modern clothing inspired by places, people and a more meaningful way of living."
    : footer?.about_text ||
      store?.description ||
      "Thoughtful clothing and everyday objects with a point of view.";
  const shopLinks = useMemo(
    () =>
      categories
        .slice(0, 4)
        .map((c) => ({
          label: c.name,
          url: `${shop}?category=${encodeURIComponent(c.name)}`,
        })),
    [categories, shop],
  );
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
  const aboutLinks =
    footer?.company_links?.length && !isReferencePreview
      ? footer.company_links
      : referenceAbout;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes("@")) return;
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-[1280px] gap-6 px-6 py-7 min-[900px]:grid-cols-[1.25fr_.55fr_.75fr_.65fr_1.2fr] md:gap-7 md:px-8 md:py-8">
        <div>
          <div className="font-serif text-[28px] font-semibold uppercase leading-[.78] tracking-[-.04em]">
            {brand}
          </div>
          <div className="mt-1 text-[5px] font-semibold uppercase tracking-[.16em] text-primary-foreground/60">
            {isReferencePreview
              ? "PEOPLE · PLACES · A BRIGHTER TOMORROW"
              : "ART · CULTURE · EVERYDAY"}
          </div>
          <p className="mt-5 max-w-[235px] text-[9px] leading-[1.7] text-primary-foreground/72 md:text-[10px]">
            {about}
          </p>
          <div className="mt-5 flex gap-4 text-primary-foreground/90">
            <Instagram className="h-4 w-4" />
            <Facebook className="h-4 w-4" />
            <Youtube className="h-4 w-4" />
          </div>
        </div>

        <div className="hidden min-[900px]:block">
          <h3 className="mb-3 text-[10px] font-semibold">Shop</h3>
          <div className="space-y-1.5 text-[9px] text-primary-foreground/76">
            {resolvedShopLinks.slice(0, 6).map((item) => (
              <Link
                key={item.label}
                to={item.url}
                className="block hover:text-primary-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="hidden min-[900px]:block">
          <h3 className="mb-3 text-[10px] font-semibold">Support</h3>
          <div className="space-y-1.5 text-[9px] text-primary-foreground/76">
            {support.map((item) => (
              <Link
                key={item.label}
                to={storefrontPath(item.url, store?.slug)}
                className="block hover:text-primary-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="hidden min-[900px]:block">
          <h3 className="mb-3 text-[10px] font-semibold">About</h3>
          <div className="space-y-1.5 text-[9px] text-primary-foreground/76">
            {aboutLinks.map((item, index) =>
              item.label && item.url ? (
                <Link
                  key={`${item.label}-${index}`}
                  to={storefrontPath(item.url, store?.slug)}
                  className="block hover:text-primary-foreground"
                >
                  {item.label}
                </Link>
              ) : null,
            )}
          </div>
        </div>

        <div>
          {footer?.show_newsletter !== false ? (
            <>
              <h3 className="text-[10px] font-semibold">
                {isReferencePreview
                  ? "Be the First to Know"
                  : footer?.newsletter_heading || "Be the First to Know"}
              </h3>
              <p className="mt-2 max-w-[300px] text-[9px] leading-4 text-primary-foreground/68">
                {isReferencePreview
                  ? "Join for new drops, stories and exclusive offers."
                  : footer?.newsletter_description ||
                    "Join for new drops, stories and exclusive offers."}
              </p>
              {subscribed ? (
                <p className="mt-4 text-[10px]">
                  {footer?.newsletter_subscribed || "You're subscribed!"}
                </p>
              ) : (
                <form
                  onSubmit={submit}
                  className="mt-4 flex min-h-11 overflow-hidden max-w-[290px] rounded-[3px] bg-background"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    aria-label="Email address for newsletter"
                    className="min-w-0 flex-1 bg-transparent px-3 text-[9px] text-foreground outline-none"
                  />
                  <button
                    type="submit"
                    className="grid min-w-11 place-items-center bg-[#e8c995] text-foreground"
                    aria-label="Subscribe"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </>
          ) : null}
        </div>

        <div className="divide-y divide-primary-foreground/15 border-y border-primary-foreground/15 min-[900px]:hidden">
          {[
            { title: "Shop", links: resolvedShopLinks },
            { title: "Support", links: support },
            { title: "About", links: aboutLinks },
          ].map((group) => (
            <details key={group.title}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[10px] font-semibold">
                {group.title}
                <span>+</span>
              </summary>
              <div className="space-y-2 pb-4 text-[10px] text-primary-foreground/75">
                {group.links.map((item, index) =>
                  item.label && item.url ? (
                    <Link
                      key={`${group.title}-${item.label}-${index}`}
                      to={storefrontPath(item.url, store?.slug)}
                      className="flex min-h-11 items-center py-1"
                    >
                      {item.label}
                    </Link>
                  ) : null,
                )}
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex min-h-[68px] max-w-[1280px] flex-col justify-center gap-2 px-6 py-4 text-[8px] text-primary-foreground/58 md:flex-row md:items-center md:justify-between md:px-8">
          <span>
            {isReferencePreview
              ? `© 2024 EZCOMO. All rights reserved.`
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
