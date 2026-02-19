import { useState } from "react";
import { Link } from "react-router-dom";
import { Send, CheckCircle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { productTypes } from "@/data/products";

const emailSchema = z.string().trim().email("Please enter a valid email");

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(() => localStorage.getItem("threadbd-subscribed") === "true");
  const [error, setError] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError("");
    localStorage.setItem("threadbd-subscribed", "true");
    setSubscribed(true);
    setEmail("");
    toast.success("You're subscribed!", { description: "Welcome to the ThreadBD family." });
  };

  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              THREAD<span className="text-primary">BD</span>
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Premium menswear crafted in Bangladesh. Quality fabrics, bold designs.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground">Shop</h4>
            <div className="flex flex-col gap-2">
              {productTypes.map((t) => (
                <Link
                  key={t.value}
                  to={t.value === "All" ? "/shop" : `/shop?type=${t.value}`}
                  className="text-sm text-muted-foreground hover:text-foreground smooth-hover"
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground">Company</h4>
            <div className="flex flex-col gap-2">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground smooth-hover">About Us</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground smooth-hover">Contact</Link>
              <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground smooth-hover">FAQ & Returns</Link>
              <Link to="/track-order" className="text-sm text-muted-foreground hover:text-foreground smooth-hover">Track Order</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground">Newsletter</h4>
            {subscribed ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">You're subscribed!</span>
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted-foreground">Join 5,000+ ThreadBD fans for drops & deals.</p>
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="you@email.com"
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90 smooth-hover"
                    aria-label="Subscribe to newsletter"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
                {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
              </>
            )}
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p className="mb-2">We accept bKash, Nagad, and Cash on Delivery across Bangladesh.</p>
          © 2026 ThreadBD. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
