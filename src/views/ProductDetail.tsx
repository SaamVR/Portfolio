import { useEffect } from "react";
import { useParams, useNavigate } from "@/lib/react-router-dom-shim";
import { ArrowLeft, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import ProductQA from "@/components/ProductQA";
import { useProduct } from "@/hooks/useProducts";
import { extractIdFromSlug, productUrl, storefrontPath } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";
import { ContextAwareProductDetails } from "@/components/storefront/product/ProductDetailRenderer";

const MAX_RECENT = 8;

const ProductDetail = ({ explicitStoreId, explicitStoreSlug }: { explicitStoreId?: string; explicitStoreSlug?: string }) => {
  const { slugId } = useParams();
  const id = slugId ? extractIdFromSlug(slugId as string) : undefined;
  const navigate = useNavigate();
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const storeSlug = explicitStoreSlug ?? currentStore?.slug;
  const recentlyViewedKey = getScopedStorefrontStorageKey("recently-viewed", storeId);
  const { data: product, isLoading } = useProduct(id, storeId);
  const LayoutWrapper = storeId ? StorefrontLayout : Layout;

  // Record recently viewed
  useEffect(() => {
    if (!id) return;
    try {
      const stored = JSON.parse(localStorage.getItem(recentlyViewedKey) || "[]") as string[];
      const updated = [id, ...stored.filter((pid) => pid !== id)].slice(0, MAX_RECENT);
      localStorage.setItem(recentlyViewedKey, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [id, recentlyViewedKey]);

  if (isLoading) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!product) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <p className="mb-4 font-heading text-xl font-semibold text-foreground">Product not found</p>
            <button
              onClick={() => navigate(storefrontPath("/shop", storeSlug))}
              className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Browse Shop
            </button>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images?.[0] || product.image,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "BDT",
      availability: product.isAvailable === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  return (
    <LayoutWrapper>
      <SEOHead
        title={product.name}
        description={product.description}
        canonical={absoluteStoreUrl(currentStore ?? (storeSlug ? { slug: storeSlug } : undefined), productUrl(product.id, product.name))}
        ogType="product"
        ogImage={product.images?.[0] || product.image}
        jsonLd={productJsonLd}
      />
      <div className="container mx-auto px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Go back to previous page"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <ContextAwareProductDetails product={product} />
        {storeId ? <ProductQA productId={product.id} /> : null}
      </div>
    </LayoutWrapper>
  );
};

export default ProductDetail;

