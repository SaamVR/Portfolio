import { useOptionalStore } from "@/components/storefront/store-context";
import { useState } from "react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { Mail, Phone, MapPin, Loader2, MessageCircle, Clock, ArrowRight, Sparkles } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { absoluteStoreUrl } from "@/lib/siteUrl";

interface ContactSettings {
  badge?: string;
  title?: string;
  description?: string;
  form_button_label?: string;
  response_time_label?: string;
  response_time_text?: string;
  address?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  map_enabled?: boolean;
  map_embed_url?: string;
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be under 100 characters"),
  email: z.string().trim().email("Valid email required").max(255, "Email must be under 255 characters"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be under 2000 characters"),
});

const Contact = () => {
  const currentStore = useOptionalStore();
  const storeId = currentStore?.id;
  const storeName = currentStore?.name ?? "this store";

  const { data: contact, isLoading } = useSiteSettings<ContactSettings>("contact_page", storeId);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) errs[err.path[0] as string] = err.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      // Check server-side rate limit (5 messages per hour per email)
      const { data: allowed, error: rateErr } = await supabase.rpc(
        "check_contact_rate_limit",
        { _email: form.email.trim() }
      );
      if (rateErr) throw rateErr;
      if (!allowed) {
        toast.error("Too many messages sent recently. Please wait an hour before trying again.");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("contact_messages")
        .insert({
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
          store_id: storeId ?? null,
        });
      if (error) throw error;
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", message: "" });
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const address = contact?.address || "Business address will appear here.";
  const phone = contact?.phone || "Phone details will appear here.";
  const emailAddr = contact?.email || "support@example.com";
  const whatsapp = contact?.whatsapp || phone;
  const badge = contact?.badge || "Get in Touch";
  const title = contact?.title || `Contact ${storeName}`;
  const description = contact?.description || `Reach ${storeName} by email, phone, or WhatsApp.`;
  const formButtonLabel = contact?.form_button_label || "Send Message";
  const responseTimeLabel = contact?.response_time_label || "Response Time";
  const responseTimeText = contact?.response_time_text || "Usually within 1 business day. For urgent order changes, call or message us right after placing the order.";
  const whatsappDigits = whatsapp.replace(/[^0-9]/g, "");
  const whatsappHref = `https://wa.me/${whatsappDigits.startsWith("0") && whatsappDigits.length === 11 ? `88${whatsappDigits}` : whatsappDigits}?text=${encodeURIComponent(`Hi ${storeName}`)}`;

  return (
    <Layout>
      <SEOHead
        title={title}
        description={description}
        canonical={absoluteStoreUrl(currentStore, "/contact")}
      />
      <PageTransition>
        <section className="relative overflow-hidden py-16 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsla(var(--primary),0.12),transparent_40%)]" />
          <div className="container relative z-10 mx-auto max-w-6xl px-4">
            <AnimatedSection>
              <div className="rounded-[2rem] border border-border/70 bg-background/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8 lg:p-10">
                <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                  <div>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      {badge}
                    </div>
                    <h1 className="max-w-3xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                      {title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                      {description}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90"
                      >
                        Chat on WhatsApp
                        <ArrowRight className="h-4 w-4" />
                      </a>
                      <a
                        href={`tel:${phone}`}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                      >
                        Call the store
                      </a>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    {[
                      { label: "Phone", value: phone, icon: Phone },
                      { label: "Email", value: emailAddr, icon: Mail },
                      { label: responseTimeLabel, value: responseTimeText, icon: Clock },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="rounded-[1.4rem] border border-border bg-secondary/60 p-4">
                          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                          <p className="mt-2 text-sm leading-6 text-foreground">{item.value}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </AnimatedSection>

            <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <AnimatedSection delay={80}>
                <div className="space-y-4">
                  <div className="rounded-[1.6rem] border border-border bg-background p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                    <div className="mb-5 flex items-center gap-3">
                      {currentStore?.logoUrl ? (
                        <img
                          src={currentStore.logoUrl}
                          alt={`${storeName} logo`}
                          className="h-12 w-12 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                          {storeName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-heading text-lg font-semibold text-foreground">{storeName}</p>
                        <p className="text-sm text-muted-foreground">Talk to the team behind this store</p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-border bg-secondary/50 p-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-1 h-4.5 w-4.5 shrink-0 text-primary" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">Store address</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{address}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-secondary/50 p-4">
                        <div className="flex items-start gap-3">
                          <MessageCircle className="mt-1 h-4.5 w-4.5 shrink-0 text-primary" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">WhatsApp support</p>
                            <a
                              href={whatsappHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex text-sm text-primary hover:underline"
                            >
                              {whatsapp}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {contact?.map_enabled && contact?.map_embed_url ? (
                    <div className="overflow-hidden rounded-[1.6rem] border border-border bg-background shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                      <div className="border-b border-border px-5 py-4">
                        <p className="font-heading text-lg font-semibold text-foreground">Find the store</p>
                      </div>
                      <iframe
                        src={contact.map_embed_url}
                        width="100%"
                        height="280"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Store location"
                      />
                    </div>
                  ) : contact?.map_enabled ? (
                    <div className="rounded-[1.6rem] border border-border bg-secondary/50 p-6 text-sm text-muted-foreground shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                      Map preview: {address}
                    </div>
                  ) : null}
                </div>
              </AnimatedSection>

              <AnimatedSection delay={100}>
                <div className="rounded-[1.8rem] border border-border bg-background p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Send a message</p>
                    <h2 className="mt-2 font-heading text-2xl font-semibold text-foreground">Tell us what you need</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Share your question, order issue, or sales inquiry and the team will get back to you.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      {[
                        { key: "name", label: "Name", type: "text", placeholder: "Your name" },
                        { key: "email", label: "Email", type: "email", placeholder: "you@example.com" },
                      ].map(({ key, label, type, placeholder }) => (
                        <div key={key}>
                          <label htmlFor={key} className="mb-2 block text-sm font-medium text-foreground">{label}</label>
                          <input
                            id={key}
                            type={type}
                            value={form[key as keyof typeof form]}
                            onChange={(e) => update(key, e.target.value)}
                            placeholder={placeholder}
                            className="w-full rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          {errors[key] && <p className="mt-1 text-xs text-destructive">{errors[key]}</p>}
                        </div>
                      ))}
                    </div>

                    <div>
                      <label htmlFor="message" className="mb-2 block text-sm font-medium text-foreground">Message</label>
                      <textarea
                        id="message"
                        rows={7}
                        value={form.message}
                        onChange={(e) => update("message", e.target.value)}
                        placeholder="How can we help?"
                        maxLength={2000}
                        className="w-full rounded-[1.4rem] border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <div className="mt-1 flex justify-between">
                        {errors.message
                          ? <p className="text-xs text-destructive">{errors.message}</p>
                          : <span />
                        }
                        <p className="text-xs text-muted-foreground">{form.message.length}/2000</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <Clock className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{responseTimeLabel}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{responseTimeText}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-full bg-primary px-6 py-3.5 font-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground shadow-lg transition-all hover:opacity-90 active:animate-scale-pop disabled:opacity-50"
                    >
                      {submitting ? "Sending..." : formButtonLabel}
                    </button>
                  </form>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default Contact;

