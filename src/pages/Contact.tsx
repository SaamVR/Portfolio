import { useState } from "react";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { Mail, Phone, MapPin, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface ContactSettings {
  address?: string;
  phone?: string;
  email?: string;
  map_placeholder?: string;
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email required"),
  message: z.string().trim().min(10, "Message must be at least 10 characters"),
});

const Contact = () => {
  const { data: contact, isLoading } = useSiteSettings<ContactSettings>("contact_page");
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
      const { error } = await supabase
        .from("contact_messages")
        .insert({ name: form.name, email: form.email, message: form.message } as any);
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

  const address = contact?.address || "Dhaka, Bangladesh";
  const phone = contact?.phone || "+880 1XXX-XXXXXX";
  const emailAddr = contact?.email || "hello@threadbd.com";

  return (
    <Layout>
      <PageTransition>
        <section className="py-20">
          <div className="container mx-auto max-w-4xl px-4">
            <AnimatedSection>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Get in Touch</p>
              <h1 className="mb-12 font-heading text-4xl font-bold text-foreground">Contact Us</h1>
            </AnimatedSection>

            <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
              <AnimatedSection delay={100}>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {[
                    { key: "name", label: "Name", type: "text", placeholder: "Your name" },
                    { key: "email", label: "Email", type: "email", placeholder: "you@example.com" },
                  ].map(({ key, label, type, placeholder }) => (
                    <div key={key}>
                      <label htmlFor={key} className="mb-1 block text-sm font-medium text-foreground">{label}</label>
                      <input
                        id={key}
                        type={type}
                        value={form[key as keyof typeof form]}
                        onChange={(e) => update(key, e.target.value)}
                        placeholder={placeholder}
                        className="w-full rounded-md border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      {errors[key] && <p className="mt-1 text-xs text-destructive">{errors[key]}</p>}
                    </div>
                  ))}
                  <div>
                    <label htmlFor="message" className="mb-1 block text-sm font-medium text-foreground">Message</label>
                    <textarea
                      id="message"
                      rows={5}
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      placeholder="How can we help?"
                      className="w-full rounded-md border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-md bg-primary py-3 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 glow-shadow transition-all active:animate-scale-pop disabled:opacity-50"
                  >
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </AnimatedSection>

              <AnimatedSection delay={200}>
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-start gap-4">
                      <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <p className="font-heading text-sm font-semibold text-foreground">Store Address</p>
                        <p className="text-sm text-muted-foreground">{address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <Phone className="mt-1 h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <p className="font-heading text-sm font-semibold text-foreground">Phone</p>
                        <p className="text-sm text-muted-foreground">{phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <Mail className="mt-1 h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <p className="font-heading text-sm font-semibold text-foreground">Email</p>
                        <p className="text-sm text-muted-foreground">{emailAddr}</p>
                      </div>
                    </div>
                    <div className="mt-8 h-48 rounded-lg border border-border bg-secondary flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">📍 Map placeholder — {address}</p>
                    </div>
                  </div>
                )}
              </AnimatedSection>
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default Contact;
