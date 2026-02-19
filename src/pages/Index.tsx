import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import HeroSection from "@/components/HeroSection";
import CategoryShowcase from "@/components/CategoryShowcase";
import FeaturedProducts from "@/components/FeaturedProducts";
import RecentlyViewed from "@/components/RecentlyViewed";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ThreadBD",
  url: "https://threadbd.lovable.app",
  description: "Premium streetwear t-shirts from Bangladesh. bKash & COD accepted.",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://threadbd.lovable.app/shop?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const Index = () => {
  return (
    <Layout>
      <SEOHead
        canonical="https://threadbd.lovable.app/"
        jsonLd={jsonLd}
      />
      <HeroSection />
      <CategoryShowcase />
      <FeaturedProducts />
      <RecentlyViewed />
    </Layout>
  );
};

export default Index;
