import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { CountdownTimer } from "@/components/CountdownTimer";
import HeroSection from "@/components/HeroSection";
import PromoBanner from "@/components/PromoBanner";
import CategoryShowcase from "@/components/CategoryShowcase";
import FeaturedProducts from "@/components/FeaturedProducts";
import RecentlyViewed from "@/components/RecentlyViewed";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { useOptionalStore } from "@/components/storefront/store-context";

const Index = () => {
  const currentStore = useOptionalStore();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: currentStore?.name ?? "Online Store",
    url: absoluteStoreUrl(currentStore),
    description: "A configurable storefront for products, collections, and merchant-managed checkout experiences.",
    potentialAction: {
      "@type": "SearchAction",
      target: absoluteStoreUrl(currentStore, "/shop?q={search_term_string}"),
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Layout>
      <SEOHead
        canonical={absoluteStoreUrl(currentStore)}
        jsonLd={jsonLd}
      />
      <CountdownTimer />
      <HeroSection />
      <PromoBanner />
      <CategoryShowcase />
      <FeaturedProducts />
      <RecentlyViewed />
    </Layout>
  );
};

export default Index;
