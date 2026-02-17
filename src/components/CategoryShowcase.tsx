import { Link } from "react-router-dom";
import { Shirt, Blend, Scissors, ShieldCheck, Footprints, StretchHorizontal } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";

const categories = [
  { label: "T-Shirts", type: "T-Shirt", tagline: "Everyday essentials", icon: Shirt },
  { label: "Polos", type: "Polo", tagline: "Smart casual staples", icon: Blend },
  { label: "Shirts", type: "Shirt", tagline: "Refined & versatile", icon: StretchHorizontal },
  { label: "Drop Shoulders", type: "Drop Shoulder", tagline: "Bold streetwear", icon: Scissors },
  { label: "Undergarments", type: "Undergarment", tagline: "Comfort first", icon: ShieldCheck },
  { label: "Pants", type: "Pants", tagline: "Complete the look", icon: Footprints },
];

const CategoryShowcase = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <AnimatedSection animation="blur">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Categories</p>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">Shop by Category</h2>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <AnimatedSection key={cat.type} delay={i * 80} animation="blur">
                <Link
                  to={`/shop?type=${cat.type}`}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center smooth-hover hover:border-primary/40 hover:-translate-y-1 hover:premium-shadow"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary smooth-hover group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-semibold text-foreground">{cat.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{cat.tagline}</p>
                  </div>
                </Link>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryShowcase;
