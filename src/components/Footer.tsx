import { useState } from "react";
import { Link } from "react-router-dom";
import { Send, CheckCircle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { productTypes } from "@/data/products";
import { useSiteSettings } from "@/hooks/useSiteSettings";

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
  { label: "About Us", url: "/about" },
  { label: "Contact", url: "/contact" },
  { label: "FAQ & Returns", url: "/faq" },
  { label: "Track Order", url: "/track-order" },
];

const defaultSectionOrder: FooterSection[] = [
  { id: "brand", label: "Brand & Tagline" },
  { id: "shop", label: "Shop Links" },
  { id: "company", label: "Company Links" },
  { id: "newsletter", label: "Newsletter" },
];

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(() => localStorage.getItem("threadbd-subscribed") === "true");
  const [error, setError] = useState("");
  const { data: footer } = useSiteSettings<FooterSettings>("footer");

  const brandName = footer?.brand_name || "THREAD";
  const brandHighlight = footer?.brand_highlight || "BD";
  const aboutText = footer?.about_text || "Premium menswear crafted in Bangladesh. Quality fabrics, bold designs.";
  const newsletterHeading = footer?.newsletter_heading || "Newsletter";
  const newsletterDesc = footer?.newsletter_description || "Join 5,000+ ThreadBD fans for drops & deals.";
  const subscribedMsg = footer?.newsletter_subscribed || "You're subscribed!";
  const companyLinks = footer?.company_links?.length ? footer.company_links : defaultCompanyLinks;
  const extraLinks = footer?.extra_links ?? [];
  const extraLinksTitle = footer?.extra_links_title || "Quick Links";
  const sectionOrder = footer?.section_order?.length ? footer.section_order : defaultSectionOrder;
  const paymentText = footer?.payment_text || "We accept bKash, Nagad, and Cash on Delivery across Bangladesh.";
  const copyrightText = footer?.copyright || "© 2026 ThreadBD. All rights reserved.";
  const showShopLinks = footer?.show_shop_links ?? true;
  const showNewsletter = footer?.show_newsletter ?? true;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError("");
    localStorage.setItem("threadbd-subscribed", "true");
    setSubscribed(true);
    setEmail("");
    toast.success("You're subscribed!", { description: "Welcome to the ThreadBD family." });
  };

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "brand":
        return (
          <div key="brand">
            <h3 className="font-heading text-lg font-bold text-foreground">
              {brandName}<span className="text-primary">{brandHighlight}</span>
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">{aboutText}</p>
          </div>
        );
      case "shop":
        if (!showShopLinks) return null;
        return (
          <div key="shop">
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground">Shop</h4>
            <div className="flex flex-col gap-2">
              {productTypes.map((t) => (
                <Link
                  key={t.value}
                  to={t.value === "All" ? "/shop" : `/shop?type=${t.value}`}
                  className="text-sm text-muted-foreground hover:text-foreground smooth-hover"
                >
                  {t.label}
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
                <Link key={i} to={link.url} className="text-sm text-muted-foreground hover:text-foreground smooth-hover">
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
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="you@email.com"
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90 smooth-hover"
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
                <Link key={i} to={link.url} className="text-sm text-muted-foreground hover:text-foreground smooth-hover">
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

  // Build sections list, include "extra" if links exist
  const sections = [...sectionOrder];
  if (extraLinks.length && !sections.find((s) => s.id === "extra")) {
    sections.push({ id: "extra", label: "Extra Links" });
  }

  const renderedSections = sections.map((s) => renderSection(s.id)).filter(Boolean);
  const colCount = renderedSections.length;

  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {renderedSections}
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p className="mb-2">{paymentText}</p>
          {copyrightText}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
