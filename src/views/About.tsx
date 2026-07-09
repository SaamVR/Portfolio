import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { Heart, Globe, Leaf, Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { absoluteUrl } from "@/lib/siteUrl";

interface AboutSettings {
  title?: string;
  content?: string;
  values?: { icon?: string; title: string; desc: string }[];
}

const iconMap: Record<string, React.ElementType> = { Heart, Globe, Leaf };

const defaultValues = [
  { icon: "Heart", title: "Comfort First", desc: "Every piece is selected for fabric feel, fit, stitching, and durability before it reaches your wardrobe." },
  { icon: "Globe", title: "Made for Bangladesh", desc: "Our fits, fabrics, and delivery experience are built around local weather, daily movement, and Bangladeshi shoppers." },
  { icon: "Leaf", title: "Responsible Growth", desc: "We keep collections focused, avoid unnecessary waste, and work toward better sourcing as the brand grows." },
];

const About = () => {
  const { data: about, isLoading } = useSiteSettings<AboutSettings>("about_page");

  const title = about?.title || "About ThreadBD";
  const defaultContent = `ThreadBD is a Dhaka-born menswear brand built around clean everyday essentials: tees, polos, shirts, pants, and innerwear that feel good in real Bangladeshi weather.
  
We started with a simple idea: make premium-looking basics easier to buy locally, with clear sizing, honest pricing, and payment options people already trust, including bKash, Nagad, and Cash on Delivery.

Our focus is not loud fashion for one photo. It is reliable clothing you can wear often: sharper fits, softer fabrics, better finishing, and support that answers quickly when you need help.

We are still growing, but the promise is simple: thoughtful menswear, made for daily life in Bangladesh, with a shopping experience that feels clear from product page to delivery.`;
  const content = about?.content || defaultContent;
  const values = about?.values ?? defaultValues;

  return (
    <Layout>
      <SEOHead
        title="About Us"
        description="Learn about ThreadBD - premium menswear and everyday essentials made for Bangladesh."
        canonical={absoluteUrl("/about")}
      />
      <PageTransition>
        <section className="py-20">
          <div className="container mx-auto max-w-3xl px-4">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <AnimatedSection>
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Our Story</p>
                <h1 className="mb-6 font-heading text-4xl font-bold text-foreground md:text-5xl">{title}</h1>
                {content.split("\n").filter(Boolean).map((para, i) => (
                  <p key={i} className="mb-4 text-lg leading-relaxed text-muted-foreground">{para}</p>
                ))}
              </AnimatedSection>
            )}
          </div>
        </section>

        <section className="border-t border-border py-20">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <h2 className="mb-12 text-center font-heading text-3xl font-bold text-foreground">Our Values</h2>
            </AnimatedSection>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {values.map((v, i) => {
                const Icon = iconMap[v.icon ?? "Heart"] || Heart;
                return (
                  <AnimatedSection key={v.title} delay={i * 150}>
                    <div className="rounded-lg border border-border bg-card p-8 text-center">
                      <Icon className="mx-auto mb-4 h-8 w-8 text-primary" />
                      <h3 className="mb-2 font-heading text-lg font-semibold text-foreground">{v.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
                    </div>
                  </AnimatedSection>
                );
              })}
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default About;

