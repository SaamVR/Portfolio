"use client";

import { Link } from "@/lib/react-router-dom-shim";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProducts } from "@/hooks/useProducts";
import { storefrontPath } from "@/lib/slug";

export function FashionV3Footer() {
  const store = useOptionalStore();
  const { data: categories = [] } = useProductCategories(store?.id);
  const { data: products = [] } = useProducts(store?.id);
  const categoryNames = categories.length > 0
    ? categories.map((category) => category.name)
    : Array.from(new Set(products.map((product) => product.category).filter(Boolean)));
  const contact = store?.siteSettings?.contact_page as { email?: string; phone?: string; address?: string } | undefined;
  const shop = storefrontPath("/shop", store?.slug);

  return (
    <footer className="border-t border-black/10 bg-[#efefeb] text-[#161616]">
      <div className="mx-auto max-w-[1500px] px-5 py-12 md:px-8 md:py-16 lg:px-12">
        <div className="grid gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <div className="text-2xl font-semibold tracking-[-0.04em]">{store?.name || "Store"}</div>
            {store?.description ? <p className="mt-4 max-w-sm text-sm leading-6 text-black/60">{store.description}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-5 md:grid-cols-3">
            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Shop</p>
              <div className="space-y-2.5 text-sm">{categoryNames.slice(0, 5).map((category) => <Link key={category} to={`${shop}?category=${encodeURIComponent(category)}`} className="block hover:underline hover:underline-offset-4">{category}</Link>)}<Link to={shop} className="block hover:underline hover:underline-offset-4">View all</Link></div>
            </div>
            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Information</p>
              <div className="space-y-2.5 text-sm"><Link to={storefrontPath("/about", store?.slug)} className="block">About</Link><Link to={storefrontPath("/contact", store?.slug)} className="block">Contact</Link><Link to={storefrontPath("/faq", store?.slug)} className="block">FAQ</Link><Link to={storefrontPath("/returns", store?.slug)} className="block">Returns</Link></div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Customer care</p>
              <div className="space-y-2.5 text-sm"><Link to={storefrontPath("/track-order", store?.slug)} className="block">Track order</Link><Link to={storefrontPath("/account", store?.slug)} className="block">Account</Link>{contact?.email ? <a href={`mailto:${contact.email}`} className="block">{contact.email}</a> : null}{contact?.phone ? <a href={`tel:${contact.phone}`} className="block">{contact.phone}</a> : null}</div>
            </div>
          </div>
          <div className="md:col-span-3 md:text-right">
            {contact?.address ? <p className="text-sm leading-6 text-black/60">{contact.address}</p> : null}
            <p className="mt-6 text-xs text-black/40">© {new Date().getFullYear()} {store?.name || "Store"}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
