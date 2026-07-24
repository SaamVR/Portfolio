import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { useOptionalStore } from "@/components/storefront/store-context";
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
