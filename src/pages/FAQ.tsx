import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  { q: "How long does delivery take?", a: "Inside Dhaka: 1-2 business days. Outside Dhaka: 3-5 business days. We ship via Pathao and Steadfast." },
  { q: "What payment methods do you accept?", a: "We accept bKash, Nagad, and Cash on Delivery (COD) across Bangladesh." },
  { q: "What is your return policy?", a: "You can return or exchange within 7 days of delivery if the product is unused and in its original packaging. Contact us to initiate a return." },
  { q: "How do I find my size?", a: "Check our size guide on each product page. Our tees run true to size. If you're between sizes, we recommend sizing up for a relaxed fit." },
  { q: "Do you ship internationally?", a: "Currently we only ship within Bangladesh. International shipping is coming soon!" },
  { q: "Can I cancel my order?", a: "Yes, you can cancel before dispatch by contacting us via phone or email. Once dispatched, you'll need to use our return process." },
  { q: "Are your t-shirts pre-shrunk?", a: "Yes! All our tees are pre-shrunk so they maintain their fit after washing." },
  { q: "How do I care for my tee?", a: "Machine wash cold, inside out. Tumble dry low or hang dry. Do not bleach. Iron on low heat if needed." },
];

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-16" id="main-content">
          <section className="py-20">
            <div className="container mx-auto max-w-2xl px-4">
              <AnimatedSection>
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Help</p>
                <h1 className="mb-4 font-heading text-4xl font-bold text-foreground">Frequently Asked Questions</h1>
                <p className="mb-12 text-muted-foreground">Everything you need to know about ordering from ThreadBD.</p>
              </AnimatedSection>

              <AnimatedSection delay={100}>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, i) => (
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
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default FAQ;
