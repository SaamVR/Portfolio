import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { Heart, Globe, Leaf, Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface AboutSettings {
  title?: string;
  content?: string;
  values?: { icon?: string; title: string; desc: string }[];
}

const iconMap: Record<string, React.ElementType> = { Heart, Globe, Leaf };

const defaultValues = [
  { icon: "Heart", title: "Crafted with Care", desc: "Every tee is made with premium fabrics and attention to detail in Bangladesh." },
  { icon: "Globe", title: "Made in Bangladesh", desc: "We proudly support local manufacturing and Bangladeshi craftsmanship." },
  { icon: "Leaf", title: "Sustainable Approach", desc: "We use eco-friendly dyes and minimize waste in our production process." },
];

const About = () => {
  const { data: about, isLoading } = useSiteSettings<AboutSettings>("about_page");

  const title = about?.title || "About ThreadBD";
  const content = about?.content || "";
  const values = about?.values ?? defaultValues;

  return (
    <Layout>
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
