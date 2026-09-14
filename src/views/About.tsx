import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { ArrowRight, Heart, Globe, Leaf, Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { useOptionalStore } from "@/components/storefront/store-context";
import { Link } from "@/lib/react-router-dom-shim";
import { storefrontPath } from "@/lib/slug";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";

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
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : currentStore?.slug ?? null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const isThreads = templateId === "threads";

  const title = about?.title || `About ${storeName}`;
  const content = about?.content?.trim() || currentStore?.description || "";
  const paragraphs = content.split("\n").map((paragraph) => paragraph.trim()).filter(Boolean);
  const values = (about?.values ?? []).filter((value) => value?.title?.trim() && value?.desc?.trim());

  if (isThreads) {
    return (
      <LayoutWrapper>
        <SEOHead
          title={title}
          description={`Learn about ${storeName} and what the brand stands for.`}
          canonical={absoluteStoreUrl(currentStore, "/about")}
        />
        <PageTransition>
          <section className="border-b border-border/60 bg-secondary/30">
            <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 md:px-8 md:py-16 lg:py-20">
              {isLoading ? (
                <div className="grid animate-pulse gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20" aria-label="Loading brand story" aria-live="polite">
                  <div>
                    <div className="h-3 w-24 bg-secondary" />
                    <div className="mt-5 h-20 w-4/5 bg-secondary" />
                  </div>
                  <div className="space-y-4 pt-2">
                    <div className="h-4 bg-secondary" />
                    <div className="h-4 bg-secondary" />
                    <div className="h-4 w-4/5 bg-secondary" />
                  </div>
                </div>
              ) : (
                <div className="grid gap-9 lg:grid-cols-[.78fr_1.22fr] lg:gap-20">
                  <AnimatedSection>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[.22em] text-primary">Our story</p>
                      <h1 className="mt-4 max-w-[620px] font-serif text-[44px] font-semibold leading-[.88] tracking-[-.05em] sm:text-[56px] md:text-[68px]">
                        {title}
                      </h1>
                      <div className="mt-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
                        <span className="h-px w-12 bg-primary/45" /> {storeName}
                      </div>
                    </div>
                  </AnimatedSection>

                  <AnimatedSection delay={80}>
                    <div className="border-t border-border pt-6 lg:mt-14">
                      {paragraphs.length > 0 ? (
                        <div className="space-y-5">
                          {paragraphs.map((paragraph, index) => (
                            <p
                              key={`${paragraph.slice(0, 24)}-${index}`}
                              className={`${index === 0 ? "font-serif text-[24px] leading-[1.22] tracking-[-.02em] text-foreground sm:text-[28px]" : "max-w-[720px] text-[13px] leading-7 text-foreground/70 sm:text-[14px]"}`}
                            >
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <div className="max-w-xl">
                          <p className="font-serif text-[25px] leading-[1.2] text-foreground">The story is still being written.</p>
                          <p className="mt-4 text-[13px] leading-7 text-muted-foreground">Explore the current collection while {storeName} prepares more about the people, ideas, and process behind the brand.</p>
                        </div>
                      )}
                    </div>
                  </AnimatedSection>
                </div>
              )}
            </div>
          </section>

          {values.length > 0 ? (
            <section className="border-b border-border/60 bg-background py-12 md:py-16">
              <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-8">
                <AnimatedSection>
                  <div className="mb-8 grid gap-3 border-b border-border pb-6 md:grid-cols-[.7fr_1.3fr] md:items-end">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[.2em] text-primary">What guides the work</p>
                      <h2 className="mt-3 font-serif text-[34px] font-semibold leading-[.92] tracking-[-.035em] md:text-[44px]">Values with a point of view.</h2>
                    </div>
                    <p className="max-w-2xl text-[12px] leading-6 text-muted-foreground md:justify-self-end md:text-[13px]">
                      The principles {storeName} has chosen to publish for customers.
                    </p>
                  </div>
                </AnimatedSection>
                <div className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
                  {values.map((value, index) => {
                    const Icon = iconMap[value.icon ?? "Heart"] || Heart;
                    return (
                      <AnimatedSection key={value.title} delay={index * 80}>
                        <article className="min-h-full py-7 md:px-7 md:py-8 first:md:pl-0 last:md:pr-0">
                          <div className="mb-6 flex items-center justify-between">
                            <Icon className="h-5 w-5 stroke-[1.4] text-primary" />
                            <span className="font-serif text-[24px] italic text-primary/35">0{index + 1}</span>
                          </div>
                          <h3 className="font-serif text-[24px] font-semibold leading-tight">{value.title}</h3>
                          <p className="mt-3 text-[12px] leading-6 text-muted-foreground md:text-[13px]">{value.desc}</p>
                        </article>
                      </AnimatedSection>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}

          <section className="bg-primary text-primary-foreground">
            <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-9 sm:px-6 md:flex-row md:items-center md:justify-between md:px-8 md:py-11">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[.2em] text-primary-foreground/60">Continue the story</p>
                <p className="mt-2 font-serif text-[28px] leading-none md:text-[34px]">See what the brand is making now.</p>
              </div>
              <Link
                to={storefrontPath("/shop", currentStore?.slug)}
                className="inline-flex min-h-11 items-center gap-2 self-start border border-primary-foreground/40 px-5 text-[10px] font-bold uppercase tracking-[.1em] transition hover:bg-primary-foreground hover:text-primary md:self-auto"
              >
                Shop the collection <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </PageTransition>
      </LayoutWrapper>
    );
  }

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
                  ? paragraphs.map((para, i) => (
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
