import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { useOptionalStore } from "@/components/storefront/store-context";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQEntry {
  q: string;
  a: string;
}

const FAQ = () => {
  const currentStore = useOptionalStore();
  const storeName = currentStore?.name ?? "this store";
  const { data: faqs, isLoading } = useSiteSettings<FAQEntry[]>("faq_entries", currentStore?.id);
  const LayoutWrapper = currentStore?.id ? StorefrontLayout : Layout;
  const entries = faqs?.filter((entry) => entry?.q?.trim() && entry?.a?.trim()) ?? [];
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : currentStore?.slug ?? null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const isThreads = templateId === "threads";

  if (isThreads) {
    return (
      <LayoutWrapper>
        <SEOHead
          title={`FAQ | ${storeName}`}
          description={`Frequently asked questions about ${storeName} orders, delivery, payments, and returns.`}
          canonical={absoluteStoreUrl(currentStore, "/faq")}
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: entries.map((entry) => ({
              "@type": "Question",
              name: entry.q,
              acceptedAnswer: { "@type": "Answer", text: entry.a },
            })),
          }}
        />
        <PageTransition>
          <section className="border-b border-border/60 bg-secondary/30">
            <div className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 md:px-8 md:py-14">
              <p className="text-[9px] font-bold uppercase tracking-[.22em] text-primary">Customer notes</p>
              <div className="mt-3 grid gap-5 md:grid-cols-[1fr_.8fr] md:items-end">
                <h1 className="font-serif text-[44px] font-semibold leading-[.88] tracking-[-.05em] sm:text-[54px]">Questions, answered simply.</h1>
                <p className="text-[12px] leading-6 text-muted-foreground md:justify-self-end md:text-[13px]">Helpful answers about ordering, delivery, payments, returns, and support for {storeName}.</p>
              </div>
            </div>
          </section>

          <section className="bg-background py-9 md:py-14">
            <div className="mx-auto max-w-[900px] px-4 sm:px-6 md:px-8">
              {isLoading ? (
                <div className="space-y-0 border-t border-border" aria-label="Loading frequently asked questions" aria-live="polite">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="animate-pulse border-b border-border py-6">
                      <div className="h-4 w-3/4 bg-secondary" />
                      <div className="mt-3 h-3 w-1/2 bg-secondary/70" />
                    </div>
                  ))}
                </div>
              ) : entries.length > 0 ? (
                <AnimatedSection delay={80}>
                  <Accordion type="single" collapsible className="w-full border-t border-border">
                    {entries.map((faq, index) => (
                      <AccordionItem key={index} value={`faq-${index}`} className="border-border">
                        <AccordionTrigger className="min-h-16 py-4 text-left font-serif text-[19px] font-semibold leading-tight text-foreground hover:text-primary hover:no-underline sm:text-[21px]">
                          <span className="mr-4 text-[10px] font-sans font-bold text-primary/55">0{index + 1}</span>
                          <span className="flex-1">{faq.q}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6 pl-8 pr-4 text-[12px] leading-6 text-muted-foreground sm:text-[13px]">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </AnimatedSection>
              ) : (
                <AnimatedSection delay={80}>
                  <div className="border border-dashed border-border bg-secondary/20 px-6 py-14 text-center">
                    <h2 className="font-serif text-[30px] font-semibold leading-none">The FAQ is being prepared.</h2>
                    <p className="mx-auto mt-4 max-w-lg text-[12px] leading-6 text-muted-foreground">{storeName} has not published FAQ entries yet. The contact page remains available for product, order, and support questions.</p>
                  </div>
                </AnimatedSection>
              )}
            </div>
          </section>
        </PageTransition>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <SEOHead
        title={`FAQ | ${storeName}`}
        description={`Frequently asked questions about ${storeName} orders, delivery, payments, and returns.`}
        canonical={absoluteStoreUrl(currentStore, "/faq")}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: entries.map((e) => ({
            "@type": "Question",
            name: e.q,
            acceptedAnswer: { "@type": "Answer", text: e.a },
          })),
        }}
      />
      <PageTransition>
        <section className="py-20">
          <div className="container mx-auto max-w-2xl px-4">
            <AnimatedSection>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Information</p>
              <h1 className="mb-4 font-heading text-4xl font-bold text-foreground">Frequently Asked Questions</h1>
              <p className="mb-12 text-muted-foreground">Helpful answers about ordering, delivery, payments, and support for {storeName}.</p>
            </AnimatedSection>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : entries.length > 0 ? (
              <AnimatedSection delay={100}>
                <Accordion type="single" collapsible className="w-full">
                  {entries.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border-border">
                      <AccordionTrigger className="text-left font-heading text-sm font-semibold text-foreground hover:text-primary">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AnimatedSection>
            ) : (
              <AnimatedSection delay={100}>
                <div className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
                  <h2 className="font-heading text-2xl font-semibold text-foreground">FAQs coming soon</h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {storeName} has not published FAQ entries yet. Customers can still use the contact page for questions.
                  </p>
                </div>
              </AnimatedSection>
            )}
          </div>
        </section>
      </PageTransition>
    </LayoutWrapper>
  );
};

export default FAQ;
