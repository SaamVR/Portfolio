import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CategoryShowcase from "@/components/CategoryShowcase";
import FeaturedProducts from "@/components/FeaturedProducts";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <CategoryShowcase />
        <FeaturedProducts />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
