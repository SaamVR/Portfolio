import { Link } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";

const HeroSection = () => {
  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBanner} alt="Premium T-shirts" className="h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute inset-0 bg-background/50" />
      </div>
      <div className="relative z-10 container mx-auto px-4 text-center">
        <p className="mb-4 animate-fade-in text-sm font-medium uppercase tracking-[0.3em] text-primary">
          Premium Streetwear from Dhaka
        </p>
        <h1 className="mb-6 font-heading text-5xl font-bold leading-tight text-foreground opacity-0 animate-fade-in md:text-7xl" style={{ animationDelay: "0.2s" }}>
          Wear Your <span className="text-gradient">Identity</span>
        </h1>
        <p className="mx-auto mb-10 max-w-lg text-lg text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          Handcrafted tees designed in Bangladesh. Premium fabrics, bold designs, bKash checkout.
        </p>
        <div className="flex items-center justify-center gap-4 opacity-0 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <Link
            to="/shop"
            className="rounded-md bg-primary px-8 py-3 font-heading text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow-shadow"
          >
            Shop Now
          </Link>
          <Link
            to="/shop"
            className="rounded-md border border-border px-8 py-3 font-heading text-sm font-semibold text-foreground transition-all hover:bg-secondary"
          >
            View Collection
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
