import Link from "next/link";
import { useEffect, useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";

const emailSchema = z.string().trim().email("Please enter a valid email");

interface FooterLink {
  label: string;
  url: string;
}

interface FooterSection {
  id: string;
  label: string;
}

interface FooterSettings {
  brand_name?: string;
  brand_highlight?: string;
  about_text?: string;
  newsletter_heading?: string;
  newsletter_description?: string;
  newsletter_subscribed?: string;
  company_links?: FooterLink[];
  extra_links?: FooterLink[];
  extra_links_title?: string;
  section_order?: FooterSection[];
  payment_text?: string;
  copyright?: string;
  show_shop_links?: boolean;
  show_newsletter?: boolean;
}

const defaultCompanyLinks: FooterLink[] = [
  { label: "About", url: "/about" },
  { label: "Contact", url: "/contact" },
  { label: "FAQ", url: "/faq" },
  { label: "Track Order", url: "/track-order" },
];

const defaultSectionOrder: FooterSection[] = [
  { id: "brand", label: "Brand & Tagline" },
  { id: "shop", label: "Shop Links" },
  { id: "company", label: "Company Links" },
  { id: "newsletter", label: "Newsletter" },
];

const Footer = () => {
  const currentStore = useOptionalStore();
  const subscribedStorageKey = getScopedStorefrontStorageKey("newsletter-subscribed", currentStore?.id);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(subscribedStorageKey) === "true";
      } catch {
        return false;
      }
    }

    return false;
  });
  const [error, setError] = useState("");
  const { data: footer } = useSiteSettings<FooterSettings>("footer", currentStore?.id);
  const { data: dynamicProductTypes = [] } = useProductTypes(currentStore?.id);
  const { data: dynamicProductCategories = [] } = useProductCategories(currentStore?.id);

  useEffect(() => {
    try {
      setSubscribed(localStorage.getItem(subscribedStorageKey) === "true");
    } catch {
      setSubscribed(false);
    }
  }, [subscribedStorageKey]);

  const brandName = footer?.brand_name || currentStore?.name || "Store";
  const brandHighlight = footer?.brand_highlight || "";
  const aboutText = footer?.about_text || currentStore?.description || "";
  const newsletterHeading = footer?.newsletter_heading || "Stay Updated";
  const newsletterDesc = footer?.newsletter_description || "Share updates, launches, offers, or announcements with interested customers.";
  const subscribedMsg = footer?.newsletter_subscribed || "You're subscribed!";
  const companyLinks = footer?.company_links?.length ? footer.company_links : defaultCompanyLinks;
  const extraLinks = footer?.extra_links ?? [];
  const extraLinksTitle = footer?.extra_links_title || "Quick Links";
  const sectionOrder = footer?.section_order?.length ? footer.section_order : defaultSectionOrder;
  const paymentText = footer?.payment_text || "Accepted payment methods, delivery terms, and checkout options are shown during the order flow.";
  const copyrightText = footer?.copyright || `Copyright ${new Date().getFullYear()}. All rights reserved.`;
  const showShopLinks = footer?.show_shop_links ?? true;
  const showNewsletter = footer?.show_newsletter ?? true;
  const shopLinks = dynamicProductCategories.length > 0
    ? dynamicProductCategories.slice(0, 6).map((category: any) => ({
        label: category.name,
        href: storefrontPath(`/shop?category=${encodeURIComponent(category.name)}`, currentStore?.slug),
      }))
    : dynamicProductTypes.length > 0
      ? dynamicProductTypes.slice(0, 6).map((type: any) => ({
          label: type.name,
          href: storefrontPath(`/shop?type=${encodeURIComponent(type.name)}`, currentStore?.slug),
        }))
      : [
          { label: "Browse Catalog", href: storefrontPath("/shop", currentStore?.slug) },
          { label: "Latest Additions", href: storefrontPath("/shop", currentStore?.slug) },
          { label: "Explore More", href: storefrontPath("/shop", currentStore?.slug) },
        ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError("");
    localStorage.setItem(subscribedStorageKey, "true");
    setSubscribed(true);
    setEmail("");
    toast.success("You're subscribed!", { description: "Thanks for joining the list." });
  };

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "brand":
        return (
          <div key="brand">
            <h3 className="font-heading text-lg font-bold text-foreground">
              {brandName}{brandHighlight ? <span className="text-primary">{brandHighlight}</span> : null}
            </h3>
            {aboutText ? <p className="mt-3 text-sm text-muted-foreground">{aboutText}</p> : null}
          </div>
        );
      case "shop":
        if (!showShopLinks) return null;
        return (
          <div key="shop">
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground">Shop</h4>
            <div className="flex flex-col gap-2">
              {shopLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground smooth-hover"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        );
      case "company":
        return (
          <div key="company">
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground">Company</h4>
            <div className="flex flex-col gap-2">
              {companyLinks.map((link, i) => (
                <Link key={i} href={storefrontPath(link.url, currentStore?.slug)} className="text-sm text-muted-foreground hover:text-foreground smooth-hover">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        );
      case "newsletter":
        if (!showNewsletter) return null;
        return (
          <div key="newsletter">
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground">{newsletterHeading}</h4>
            {subscribed ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">{subscribedMsg}</span>
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted-foreground">{newsletterDesc}</p>
                <form onSubmit={handleSubscribe} className="relative z-10 flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="you@email.com"
                    className="flex-1 rounded-md border border-white/10 bg-background/50 px-4 py-2.5 text-sm text-foreground shadow-inner outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-background/80 focus:ring-1 focus:ring-primary/50 backdrop-blur-sm"
                  />
                  <button
                    type="submit"
                    className="button-premium flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-primary-foreground shadow-lg"
                    aria-label="Subscribe to newsletter"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
                {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
              </>
            )}
          </div>
        );
      case "extra":
        if (!extraLinks.length) return null;
        return (
          <div key="extra">
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground">{extraLinksTitle}</h4>
            <div className="flex flex-col gap-2">
              {extraLinks.map((link, i) => (
                <Link key={i} href={storefrontPath(link.url, currentStore?.slug)} className="text-sm text-muted-foreground hover:text-foreground smooth-hover">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const sections = [...sectionOrder];
  if (extraLinks.length && !sections.find((s) => s.id === "extra")) {
    sections.push({ id: "extra", label: "Extra Links" });
  }

  const renderedSections = sections.map((s) => renderSection(s.id)).filter(Boolean);

  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-secondary">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-4 pt-16 pb-24 md:pb-16 lg:py-20">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">{renderedSections}</div>
        <div className="mt-16 flex flex-col items-center justify-center gap-4 border-t border-white/5 pt-8 text-[13px] text-muted-foreground/60">
          <p className="tracking-wide">{paymentText}</p>
          <p className="tracking-wider">{copyrightText}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
