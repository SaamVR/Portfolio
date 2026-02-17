import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              THREAD<span className="text-primary">BD</span>
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Premium streetwear crafted in Bangladesh. Quality fabrics, bold designs.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <Link to="/shop" className="text-sm text-muted-foreground hover:text-foreground">Shop All</Link>
              <Link to="/cart" className="text-sm text-muted-foreground hover:text-foreground">Cart</Link>
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
