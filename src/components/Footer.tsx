import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { buildAutoFooterLinks } from "@/lib/cms/page-listing-preferences";

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
  { label: "Track order", url: "/track-order" },
];

const defaultSectionOrder: FooterSection[] = [
  { id: "brand", label: "Brand" },
  { id: "shop", label: "Shop" },
  { id: "company", label: "Company" },
  { id: "newsletter", label: "Updates" },
];

function FooterLinkList({ links, storeSlug }: { links: FooterLink[]; storeSlug?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {links.map((link, index) => (
        <Link
          key={`${link.url}-${link.label}-${index}`}
          href={storefrontPath(link.url, storeSlug)}
          className="inline-flex min-h-11 items-center rounded-lg px-2 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function ResponsiveFooterSection({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="hidden md:block">
        <h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-[0.14em] text-foreground">{title}</h3>
        {children}
      </div>
      <div className="border-b border-border/60 md:hidden">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value={value} className="border-0">
            <AccordionTrigger className="min-h-14 py-3 font-heading text-sm font-bold uppercase tracking-[0.14em] text-foreground hover:no-underline">
              {title}
            </AccordionTrigger>
            <AccordionContent className="pb-3">{children}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

const Footer = () => {
  const currentStore = useOptionalStore();
  const preloadedFooter = currentStore?.siteSettings?.footer as FooterSettings | undefined;
  const { data: fetchedFooter } = useSiteSettings<FooterSettings>("footer", currentStore?.id);
  const footer = fetchedFooter ?? preloadedFooter;
  const { data: dynamicProductTypes = [] } = useProductTypes(currentStore?.id);
  const { data: dynamicProductCategories = [] } = useProductCategories(currentStore?.id);

  const brandName = footer?.brand_name?.trim() || currentStore?.name?.trim() || "Store";
  const brandHighlight = footer?.brand_highlight?.trim() || "";
  const aboutText = footer?.about_text?.trim() || currentStore?.description?.trim() || "";
  const updatesHeading = footer?.newsletter_heading?.trim() || "Store updates";
  const updatesDescription = footer?.newsletter_description?.trim()
    || "Contact the store for current releases, availability, announcements, or other updates.";
  const autoFooterLinks = buildAutoFooterLinks(currentStore);
  const companyLinks = [...(footer?.company_links?.length ? footer.company_links : defaultCompanyLinks), ...autoFooterLinks.company];
  const extraLinks = [...(footer?.extra_links ?? []), ...autoFooterLinks.extra];
  const extraLinksTitle = footer?.extra_links_title?.trim() || "Quick links";
  const sectionOrder = footer?.section_order?.length ? footer.section_order : defaultSectionOrder;
  const paymentText = footer?.payment_text?.trim()
    || "Payment methods, delivery terms, and checkout options are shown during the order flow.";
  const copyrightText = footer?.copyright?.trim() || `Copyright ${new Date().getFullYear()}. All rights reserved.`;
  const showShopLinks = footer?.show_shop_links ?? true;
  const showUpdates = footer?.show_newsletter ?? true;
  const storeSlug = currentStore?.slug;

  const shopLinks: FooterLink[] = dynamicProductCategories.length > 0
    ? dynamicProductCategories.slice(0, 6).map((category: any) => ({
        label: String(category.name),
        url: `/shop?category=${encodeURIComponent(String(category.name))}`,
      }))
    : dynamicProductTypes.length > 0
      ? dynamicProductTypes.slice(0, 6).map((type: any) => ({
          label: String(type.name),
          url: `/shop?type=${encodeURIComponent(String(type.name))}`,
        }))
      : [{ label: "Browse catalog", url: "/shop" }];

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "brand":
        return (
          <div key="brand" className="max-w-sm md:pr-4">
            <Link href={storefrontPath("/", storeSlug)} className="inline-flex min-h-11 items-center rounded-lg font-heading text-xl font-bold tracking-tight text-foreground">
              {brandName}{brandHighlight ? <span className="text-primary">{brandHighlight}</span> : null}
            </Link>
            {aboutText ? <p className="mt-3 max-w-[38ch] text-sm leading-6 text-muted-foreground">{aboutText}</p> : null}
          </div>
        );
      case "shop":
        if (!showShopLinks) return null;
        return (
          <ResponsiveFooterSection key="shop" title="Shop" value="footer-shop">
            <FooterLinkList links={shopLinks} storeSlug={storeSlug} />
          </ResponsiveFooterSection>
        );
      case "company":
        return (
          <ResponsiveFooterSection key="company" title="Company" value="footer-company">
            <FooterLinkList links={companyLinks} storeSlug={storeSlug} />
          </ResponsiveFooterSection>
        );
      case "newsletter":
        if (!showUpdates) return null;
        return (
          <div key="newsletter" className="rounded-[var(--sf-card-radius)] border border-border bg-background/55 p-5 md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Updates</p>
            <h3 className="mt-2 font-heading text-lg font-bold text-foreground">{updatesHeading}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{updatesDescription}</p>
            <Link
              href={storefrontPath("/contact", storeSlug)}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              Contact store
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        );
      case "extra":
        if (extraLinks.length === 0) return null;
        return (
          <ResponsiveFooterSection key="extra" title={extraLinksTitle} value="footer-extra">
            <FooterLinkList links={extraLinks} storeSlug={storeSlug} />
          </ResponsiveFooterSection>
        );
      default:
        return null;
    }
  };

  const sections = [...sectionOrder];
  if (extraLinks.length > 0 && !sections.some((section) => section.id === "extra")) {
    sections.push({ id: "extra", label: extraLinksTitle });
  }
  const renderedSections = sections.map((section) => renderSection(section.id)).filter(Boolean);

  return (
    <footer className="relative overflow-hidden border-t border-border bg-secondary/75" aria-label="Store footer">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" aria-hidden="true" />
      <div className="container mx-auto px-4 pb-24 pt-12 md:pb-16 md:pt-16 lg:py-20">
        <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2 md:gap-y-10 lg:grid-cols-4">
          {renderedSections}
        </div>
        <div className="mt-12 flex flex-col items-center justify-center gap-3 border-t border-border/70 pt-8 text-center text-xs leading-5 text-muted-foreground md:mt-16">
          <p className="max-w-3xl">{paymentText}</p>
          <p>{copyrightText}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
