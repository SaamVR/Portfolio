import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { Heart, Globe, Leaf, Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { useOptionalStore } from "@/components/storefront/store-context";

interface AboutSettings {
  title?: string;
  content?: string;
  values?: { icon?: string; title: string; desc: string }[];
}

const iconMap: Record<string, React.ElementType> = { Heart, Globe, Leaf };

const About = () => {
  const currentStore = useOptionalStore();
  const storeName = currentStore?.name ?? "This Brand";
  const { data: about, isLoading } = useSiteSettings<AboutSettings>("about_page", currentStore?.id);
  const LayoutWrapper = currentStore?.id ? StorefrontLayout : Layout;

  const title = about?.title || `About ${storeName}`;
  const content = about?.content?.trim() || currentStore?.description || "";
  const values = (about?.values ?? []).filter((value) => value?.title?.trim() && value?.desc?.trim());

  return (
    <LayoutWrapper>
      <SEOHead
        title={title}
        description={`Learn about ${storeName} and what the brand stands for.`}
        canonical={absoluteStoreUrl(currentStore, "/about")}
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
                {content
                  ? content.split("\n").filter(Boolean).map((para, i) => (
                      <p key={i} className="mb-4 text-lg leading-relaxed text-muted-foreground">{para}</p>
                    ))
                  : <p className="text-lg leading-relaxed text-muted-foreground">{storeName} has not published an about story yet.</p>}
              </AnimatedSection>
            )}
          </div>
        </section>

        {values.length > 0 ? (
          <section className="border-t border-border py-20">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <h2 className="mb-12 text-center font-heading text-3xl font-bold text-foreground">Why Customers Choose {storeName}</h2>
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
        ) : null}
      </PageTransition>
    </LayoutWrapper>
  );
};

export default About;

