import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { Heart, Globe, Leaf } from "lucide-react";

const values = [
  { icon: Heart, title: "Crafted with Care", desc: "Every tee is made with premium fabrics and attention to detail in Bangladesh." },
  { icon: Globe, title: "Made in Bangladesh", desc: "We proudly support local manufacturing and Bangladeshi craftsmanship." },
  { icon: Leaf, title: "Sustainable Approach", desc: "We use eco-friendly dyes and minimize waste in our production process." },
];

const About = () => {
  return (
    <Layout>
      <PageTransition>
        <section className="py-20">
          <div className="container mx-auto max-w-3xl px-4">
            <AnimatedSection>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Our Story</p>
              <h1 className="mb-6 font-heading text-4xl font-bold text-foreground md:text-5xl">About ThreadBD</h1>
              <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
                ThreadBD was born from a simple belief: Bangladesh deserves a homegrown streetwear brand that matches global quality. 
                We craft premium t-shirts using locally sourced cotton, supporting our garment industry while delivering 
                designs that speak to the culture and energy of Dhaka's streets.
              </p>
              <p className="text-lg leading-relaxed text-muted-foreground">
                From the vibrant chaos of Old Dhaka to the modern pulse of Gulshan, our tees are made for 
                every corner of Bangladesh — and beyond. Each piece is a statement of pride, quality, and style.
              </p>
            </AnimatedSection>
          </div>
        </section>

        <section className="border-t border-border py-20">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <h2 className="mb-12 text-center font-heading text-3xl font-bold text-foreground">Our Values</h2>
            </AnimatedSection>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {values.map((v, i) => (
                <AnimatedSection key={v.title} delay={i * 150}>
                  <div className="rounded-lg border border-border bg-card p-8 text-center">
                    <v.icon className="mx-auto mb-4 h-8 w-8 text-primary" />
                    <h3 className="mb-2 font-heading text-lg font-semibold text-foreground">{v.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default About;
