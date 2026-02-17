import { Link } from "react-router-dom";
import { productTypes } from "@/data/products";

const Footer = () => {
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
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground">Payment</h4>
            <p className="text-sm text-muted-foreground">We accept bKash, Nagad, and Cash on Delivery across Bangladesh.</p>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © 2026 ThreadBD. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
