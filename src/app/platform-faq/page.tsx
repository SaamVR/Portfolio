import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/marketing/SleekBentoLandingPage";

const PLATFORM_FAQS = [
  {
    q: "Do I need coding skills to build or edit pages?",
    a: "Zero coding required! Our fluid drag-and-drop block builder lets you customize typography, color palettes, product layouts, and banners in real time without touching a single line of code.",
  },
  {
    q: "Can I try EZComo before committing?",
    a: "Yes, we offer a 14-day free trial on paid plans with no credit card required to start, plus a Free Forever plan for early-stage stores.",
  },
  {
    q: "Are local payments (bKash/Nagad) supported?",
    a: "Absolutely. bKash, Nagad, and local Cash on Delivery (COD) are first-class integrations. You do not need complex third-party plugins—just enter your credentials and you are ready to receive payments.",
  },
  {
    q: "Do I get a custom domain?",
    a: "Yes! All paid plans allow you to map your own custom domain (e.g., yourstore.com). We also automatically provision and manage free SSL certificates for your storefront.",
  },
  {
    q: "Can I integrate with Pathao or Steadfast courier?",
    a: "Yes. Our dashboard includes built-in courier integrations, allowing you to bulk-send delivery requests to Pathao and Steadfast directly from your order management view.",
  },
  {
    q: "Is hosting included?",
    a: "Yes, fully managed cloud hosting on our edge network is included in all plans. Your storefront will load lightning-fast worldwide, and we handle all scaling and uptime monitoring.",
  },
  {
    q: "How do I contact support if I get stuck?",
    a: "We offer 24/7 WhatsApp support and priority email support for Pro and Advanced plans. Our team is based locally and ready to help you launch successfully.",
  }
];

export default function PlatformFAQPage() {
  return (
    <main className="min-h-screen bg-background text-foreground font-sans bg-dot-pattern relative">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Button asChild variant="ghost" className="gap-2 -ml-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to {PLATFORM_BRAND_NAME}
            </Link>
          </Button>
          <Button asChild className="rounded-full shadow-md shadow-primary/10">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </header>

      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <Reveal direction="up" className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mb-6">
              <MessageCircle className="h-4 w-4" />
              Help Center
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Everything you need to know about setting up, scaling, and managing your store with {PLATFORM_BRAND_NAME}.
            </p>
          </Reveal>

          <Reveal direction="up" delay={100}>
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-xl">
              <Accordion type="single" collapsible className="w-full">
                {PLATFORM_FAQS.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border-border">
                    <AccordionTrigger className="text-left font-heading text-base font-semibold text-foreground hover:text-primary transition-colors">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground pb-6">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </Reveal>

          <Reveal direction="up" delay={200} className="mt-16 text-center">
            <p className="text-muted-foreground mb-4">Still have questions?</p>
            <Button asChild variant="outline" className="rounded-full">
              <a href="mailto:support@ezcomo.com">Contact Support</a>
            </Button>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
