import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { CountdownTimer } from "@/components/CountdownTimer";
import HeroSection from "@/components/HeroSection";
import PromoBanner from "@/components/PromoBanner";
import CategoryShowcase from "@/components/CategoryShowcase";
import FeaturedProducts from "@/components/FeaturedProducts";
import RecentlyViewed from "@/components/RecentlyViewed";
import { absoluteUrl, siteUrl } from "@/lib/siteUrl";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ThreadBD",
  url: siteUrl,
  description: "Premium streetwear t-shirts from Bangladesh. bKash & COD accepted.",
  potentialAction: {
    "@type": "SearchAction",
    target: absoluteUrl("/shop?q={search_term_string}"),
    "query-input": "required name=search_term_string",
  },
};

const Index = () => {
  return (
    <Layout>
      <SEOHead
        canonical={absoluteUrl("/")}
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
