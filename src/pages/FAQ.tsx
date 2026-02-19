import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
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
  { q: "How long does delivery take?", a: "Inside Dhaka: 1-2 business days. Outside Dhaka: 3-5 business days." },
  { q: "What payment methods do you accept?", a: "We accept bKash, Nagad, and Cash on Delivery (COD) across Bangladesh." },
  { q: "What is your return policy?", a: "You can return or exchange within 7 days of delivery if the product is unused and in its original packaging." },
];

const FAQ = () => {
  const { data: faqs, isLoading } = useSiteSettings<FAQEntry[]>("faq_entries");

  const entries = faqs && faqs.length > 0 ? faqs : defaultFaqs;

  return (
    <Layout>
      <SEOHead
        title="FAQ"
        description="Frequently asked questions about ThreadBD orders, delivery, payments, and returns."
        canonical="https://threadbd.lovable.app/faq"
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
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Help</p>
              <h1 className="mb-4 font-heading text-4xl font-bold text-foreground">Frequently Asked Questions</h1>
              <p className="mb-12 text-muted-foreground">Everything you need to know about ordering from ThreadBD.</p>
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
