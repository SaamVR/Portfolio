import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { absoluteUrl } from "@/lib/siteUrl";
import { useOptionalStore } from "@/components/storefront/store-context";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const DEFAULT_OG_IMAGE = absoluteUrl("/og-image.png");

const SEOHead = ({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noindex = false,
  jsonLd,
}: SEOHeadProps) => {
  const currentStore = useOptionalStore();
  const { data: brand } = useSiteSettings("brand_settings", currentStore?.id);

  const SITE_NAME = brand?.name ? `${brand.name}${brand.highlight || ""}` : "Storefront";
  const DEFAULT_DESC = brand?.seo_description || "Browse products, offers, pages, and support details in one storefront.";
  
  const finalDescription = description || DEFAULT_DESC;
  const fullTitle = title ? `${title} | ${SITE_NAME}` : (brand?.seo_title || SITE_NAME);

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", finalDescription);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", finalDescription);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:image", ogImage);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", finalDescription);
    setMeta("name", "twitter:image", ogImage);

    if (noindex) {
      setMeta("name", "robots", "noindex, nofollow");
    } else {
      const robotsMeta = document.querySelector('meta[name="robots"]');
      if (robotsMeta) robotsMeta.remove();
    }

    // Canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    } else {
      link?.remove();
    }

    // JSON-LD
    const existingScripts = document.querySelectorAll('script[data-seo-jsonld]');
    existingScripts.forEach((s) => s.remove());

    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      items.forEach((ld) => {
        const script = document.createElement("script");
        script.setAttribute("type", "application/ld+json");
        script.setAttribute("data-seo-jsonld", "true");
        script.textContent = JSON.stringify(ld);
        document.head.appendChild(script);
      });
    }

    return () => {
      document.querySelectorAll('script[data-seo-jsonld]').forEach((s) => s.remove());
    };
  }, [fullTitle, finalDescription, canonical, ogImage, ogType, noindex, jsonLd]);

  return null;
};

export default SEOHead;

