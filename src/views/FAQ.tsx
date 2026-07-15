import Layout from "@/components/Layout";
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

const defaultFaqs: FAQEntry[] = [
  { q: "How long does delivery take?", a: "Delivery timelines depend on the shipping zone and the fulfillment method chosen for the order. The latest estimate is usually shown during checkout or in the order confirmation." },
  { q: "What payment methods do you accept?", a: "Available payment methods are shown during checkout and may include online payment, manual transfer, or cash on delivery depending on the store configuration." },
  { q: "How much is delivery?", a: "Shipping or delivery fees are calculated based on the current store rules and appear before the order is placed." },
  { q: "Can I update an order after placing it?", a: "If the order has not been processed yet, contact the store as soon as possible. Change requests usually depend on fulfillment status and item availability." },
  { q: "What is your return policy?", a: "Return and exchange eligibility depends on the store policy for the product type, order condition, and return window. Check the store policy page or contact support for the latest details." },
  { q: "How can I track my order?", a: "Use the Track Order page or the order confirmation details provided after purchase. Some orders may also receive shipping or status updates directly from the store." },
  { q: "How do I get help before buying?", a: "If you need help choosing, sizing, availability details, or clarification before ordering, use the contact or support options listed on the storefront." },
  { q: "What happens if an item becomes unavailable?", a: "If something becomes unavailable after purchase, the store may contact the customer with replacement, delay, or refund options depending on the order status." },
];

const FAQ = () => {
  const currentStore = useOptionalStore();
  const storeName = currentStore?.name ?? "this store";
  const { data: faqs, isLoading } = useSiteSettings<FAQEntry[]>("faq_entries", currentStore?.id);

  const entries = faqs && faqs.length > 0 ? faqs : defaultFaqs;

  return (
    <Layout>
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
            ) : (
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
            )}
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default FAQ;
