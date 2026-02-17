import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import SearchBar from "@/components/SearchBar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const categories = [
  { label: "All", value: "" },
  { label: "Essentials", value: "Essentials" },
  { label: "Street", value: "Street" },
  { label: "Premium", value: "Premium" },
];

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "FAQ", to: "/faq" },
];

const MobileMenu = () => {
  const { totalItems } = useCart();
  const location = useLocation();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="flex flex-col gap-1.5 md:hidden"
          aria-label="Open navigation menu"
        >
          <span className="block h-0.5 w-5 bg-foreground" />
          <span className="block h-0.5 w-5 bg-foreground" />
          <span className="block h-0.5 w-3.5 bg-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] bg-background border-border">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-bold text-foreground">
            THREAD<span className="text-primary">BD</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          <SearchBar className="w-full" />
        </div>

        <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </p>
          <div className="flex flex-col gap-1">
            {categories.slice(1).map((cat) => (
              <Link
                key={cat.value}
                to={`/shop?category=${cat.value}`}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <Link
            to="/cart"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ShoppingBag className="h-5 w-5" />
            Cart {totalItems > 0 && `(${totalItems})`}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
