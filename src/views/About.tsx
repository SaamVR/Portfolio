import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { Heart, Globe, Leaf, Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { absoluteUrl } from "@/lib/siteUrl";
import { useOptionalStore } from "@/components/storefront/store-context";

interface AboutSettings {
  title?: string;
  content?: string;
  values?: { icon?: string; title: string; desc: string }[];
}

const iconMap: Record<string, React.ElementType> = { Heart, Globe, Leaf };

const defaultValues = [
  { icon: "Heart", title: "Customer First", desc: "We focus on clarity, responsiveness, and a buying experience that feels straightforward from discovery to delivery." },
  { icon: "Globe", title: "Built with Care", desc: "Every collection, service, or offer is shaped to reflect the brand clearly and help shoppers understand what makes it worth choosing." },
  { icon: "Leaf", title: "Steady Growth", desc: "We improve the store thoughtfully over time, with better presentation, better operations, and a stronger customer experience." },
];

const About = () => {
  const currentStore = useOptionalStore();
  const storeName = currentStore?.name ?? "Our Brand";
  const { data: about, isLoading } = useSiteSettings<AboutSettings>("about_page");

  const title = about?.title || `About ${storeName}`;
  const defaultContent = `${storeName} is built to offer a clearer, more trustworthy buying experience for customers discovering the brand online.

We started with a simple goal: present what we offer in a way that feels useful, honest, and easy to navigate, with clear details, practical support, and checkout options that fit how our customers buy.

As the store grows, we keep refining the experience across product discovery, communication, and delivery so the brand feels consistent from first visit to completed order.

Our promise is simple: thoughtful presentation, dependable service, and a storefront experience designed to make choosing with confidence easier.`;
  const content = about?.content || defaultContent;
  const values = about?.values ?? defaultValues;

  return (
    <Layout>
      <SEOHead
        title="About Us"
        description={`Learn about ${storeName} and what the brand stands for.`}
        canonical={absoluteUrl("/about")}
      />
      <PageTransition>
        <section className="py-20">
          <div className="container mx-auto max-w-3xl px-4">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <AnimatedSection>
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">About</p>
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

