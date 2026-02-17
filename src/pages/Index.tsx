import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import CategoryShowcase from "@/components/CategoryShowcase";
import FeaturedProducts from "@/components/FeaturedProducts";
import RecentlyViewed from "@/components/RecentlyViewed";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <CategoryShowcase />
      <FeaturedProducts />
      <RecentlyViewed />
    </Layout>
  );
};

export default Index;
