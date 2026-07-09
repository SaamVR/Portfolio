import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { absoluteUrl } from "@/lib/siteUrl";
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
  { q: "How long does delivery take?", a: "Inside Dhaka: 1-2 business days after order confirmation. Outside Dhaka: usually 3-5 business days depending on courier coverage." },
  { q: "What payment methods do you accept?", a: "We accept bKash, Nagad, and Cash on Delivery across Bangladesh. For prepaid orders, send payment to the number shown at checkout and add your transaction ID." },
  { q: "How much is delivery?", a: "Delivery fees are shown at checkout before you place the order. Dhaka and outside-Dhaka fees can be different, and eligible orders may receive free delivery." },
  { q: "Can I exchange size?", a: "Yes. You can request a size exchange within 7 days if the item is unused, unwashed, undamaged, and returned with its original packaging." },
  { q: "What is your return policy?", a: "Returns or exchanges are accepted within 7 days for unused products in original condition. Innerwear cannot be returned after opening for hygiene reasons." },
  { q: "How do I choose the right size?", a: "Use the size guide on product and shop pages. If you are between sizes, message us with your height, weight, and preferred fit before ordering." },
  { q: "How can I track my order?", a: "Use the Track Order page with your ThreadBD order number. We also recommend keeping the confirmation message until delivery is complete." },
  { q: "Do product colors match the photos exactly?", a: "We photograph products as accurately as possible, but color can vary slightly by screen brightness, lighting, and fabric batch." },
];

const FAQ = () => {
  const { data: faqs, isLoading } = useSiteSettings<FAQEntry[]>("faq_entries");

  const entries = faqs && faqs.length > 0 ? faqs : defaultFaqs;

  return (
    <Layout>
      <SEOHead
        title="FAQ"
        description="Frequently asked questions about ThreadBD orders, delivery, payments, and returns."
        canonical={absoluteUrl("/faq")}
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
