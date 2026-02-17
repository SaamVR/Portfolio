import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { z } from "zod";

const checkoutSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(11, "Valid phone number required").max(14),
  address: z.string().trim().min(5, "Address is required").max(500),
  city: z.string().trim().min(1, "City is required").max(100),
  paymentMethod: z.enum(["bkash", "nagad", "cod"]),
});

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    paymentMethod: "bkash" as "bkash" | "nagad" | "cod",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (form.paymentMethod === "bkash") {
      toast.success("Redirecting to bKash payment...", { description: "bKash integration requires backend setup. Order placed as demo!" });
    } else if (form.paymentMethod === "nagad") {
      toast.success("Redirecting to Nagad payment...", { description: "Nagad integration requires backend setup. Order placed as demo!" });
    } else {
      toast.success("Order placed!", { description: "Cash on Delivery confirmed. We'll call you to confirm." });
    }
    clearCart();
    setTimeout(() => navigate("/order-success"), 2000);
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="container mx-auto max-w-2xl px-4 py-12">
          <button
            onClick={() => navigate(-1)}
            className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Cart
          </button>

          <h1 className="mb-8 font-heading text-3xl font-bold text-foreground">Checkout</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">Delivery Details</h2>
              <div className="space-y-4">
                {[
                  { key: "name", label: "Full Name", placeholder: "আপনার নাম" },
                  { key: "phone", label: "Phone Number", placeholder: "01XXXXXXXXX" },
                  { key: "address", label: "Delivery Address", placeholder: "House, Road, Area" },
                  { key: "city", label: "City", placeholder: "Dhaka" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
                    <input
                      type="text"
                      value={form[key as keyof typeof form]}
                      onChange={(e) => update(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {errors[key] && <p className="mt-1 text-xs text-destructive">{errors[key]}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">Payment Method</h2>
              <div className="space-y-3">
                {[
                  { value: "bkash", label: "bKash", desc: "Pay with bKash mobile wallet" },
                  { value: "nagad", label: "Nagad", desc: "Pay with Nagad" },
                  { value: "cod", label: "Cash on Delivery", desc: "Pay when you receive" },
                ].map(({ value, label, desc }) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-4 rounded-md border p-4 transition-all ${
                      form.paymentMethod === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={value}
                      checked={form.paymentMethod === value}
                      onChange={(e) => update("paymentMethod", e.target.value)}
                      className="accent-primary"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex justify-between font-heading text-lg font-bold text-foreground">
                <span>Total</span>
                <span>৳{totalPrice}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{items.length} item(s) • Free delivery</p>
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-primary py-4 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 glow-shadow"
            >
              {form.paymentMethod === "cod" ? "Place Order" : `Pay ৳${totalPrice} with ${form.paymentMethod === "bkash" ? "bKash" : "Nagad"}`}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
