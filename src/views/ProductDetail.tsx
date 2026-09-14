import { useEffect } from "react";
import { useParams, useNavigate } from "@/lib/react-router-dom-shim";
import { ArrowLeft, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import ProductQA from "@/components/ProductQA";
import { StockNotificationSignup } from "@/components/storefront/product/StockNotificationSignup";
import { useProduct } from "@/hooks/useProducts";
import { extractIdFromSlug, productUrl, storefrontPath } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";
import { ContextAwareProductDetails } from "@/components/storefront/product/ProductDetailRenderer";
import { FashionV3Shell } from "@/components/storefront/fashion-v3/FashionV3Shell";
import { FashionV3ProductDetail } from "@/components/storefront/fashion-v3/FashionV3ProductDetail";
import { FashionV3ProductQA } from "@/components/storefront/fashion-v3/FashionV3ProductQA";
import { ThreadsProductDetail } from "@/components/storefront/threads/ThreadsProductDetail";
import { ThreadsProductViewTracker } from "@/components/storefront/threads/ThreadsProductViewTracker";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";

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
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const isFashion = templateId === "fashion";
  const isThreads = templateId === "threads";

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
        {isThreads ? (
          <section className="mx-auto min-h-[68vh] max-w-[1320px] px-4 py-10 sm:px-6 md:px-8 md:py-14" aria-label="Loading product" aria-live="polite">
            <div className="mb-8 flex items-center gap-3 border-b border-border pb-4 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Preparing the piece
            </div>
            <div className="grid animate-pulse gap-9 lg:grid-cols-[minmax(0,1.12fr)_minmax(390px,.72fr)] lg:gap-14">
              <div className="aspect-[4/5] max-h-[760px] rounded-[3px] bg-secondary" />
              <div className="space-y-5 pt-2">
                <div className="h-3 w-28 bg-secondary" />
                <div className="h-12 w-4/5 bg-secondary" />
                <div className="h-5 w-32 bg-secondary" />
                <div className="h-px bg-border" />
                <div className="h-24 bg-secondary/70" />
                <div className="h-12 bg-secondary" />
                <div className="h-12 bg-secondary" />
              </div>
            </div>
          </section>
        ) : (
          <div className="flex min-h-[70vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </LayoutWrapper>
    );
  }

  if (!product) {
    return (
      <LayoutWrapper>
        {isThreads ? (
          <section className="grid min-h-[68vh] place-items-center border-b border-border/60 bg-secondary/25 px-4 py-16">
            <div className="max-w-xl text-center">
              <p className="text-[9px] font-bold uppercase tracking-[.22em] text-primary">Collection note</p>
              <h1 className="mt-3 font-serif text-[42px] font-semibold leading-[.9] tracking-[-.045em] sm:text-[52px]">This piece is no longer here.</h1>
              <p className="mx-auto mt-5 max-w-md text-[12px] leading-6 text-muted-foreground">It may have moved, sold through, or been removed from the current collection. Browse the shop to find what is available now.</p>
              <button
                onClick={() => navigate(storefrontPath("/shop", storeSlug))}
                className="mt-7 inline-flex min-h-11 items-center bg-primary px-6 text-[10px] font-bold uppercase tracking-[.1em] text-primary-foreground transition hover:opacity-90"
              >
                Browse the collection
              </button>
            </div>
          </section>
        ) : (
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
        )}
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

  if (isFashion) {
    return (
      <FashionV3Shell>
        <SEOHead
          title={product.name}
          description={product.description}
          canonical={absoluteStoreUrl(currentStore ?? (storeSlug ? { slug: storeSlug } : undefined), productUrl(product.id, product.name))}
          ogType="product"
          ogImage={product.images?.[0] || product.image}
          jsonLd={productJsonLd}
        />
        <div className="mx-auto max-w-[1500px] px-4 pt-6 md:px-8 lg:px-12">
          <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-black/55"><ArrowLeft className="h-4 w-4" /> Back</button>
        </div>
        <FashionV3ProductDetail product={product} />
        {storeId ? <FashionV3ProductQA productId={product.id} /> : null}
      </FashionV3Shell>
    );
  }

  const hasKnownOutOfStockCount = typeof product.stock === "number" && product.stock <= 0;
  const canRequestStockAlert = Boolean(
    storeId
    && (product.isAvailable === false || hasKnownOutOfStockCount),
  );

  if (isThreads) {
    const threadsProductJsonLd = {
      ...productJsonLd,
      offers: {
        ...productJsonLd.offers,
        availability: product.isAvailable === false || hasKnownOutOfStockCount
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      },
    };

    return (
      <StorefrontLayout>
        <SEOHead
          title={product.name}
          description={product.description}
          canonical={absoluteStoreUrl(currentStore ?? (storeSlug ? { slug: storeSlug } : undefined), productUrl(product.id, product.name))}
          ogType="product"
          ogImage={product.images?.[0] || product.image}
          jsonLd={threadsProductJsonLd}
        />
        <ThreadsProductViewTracker product={product} />
        <div className="mx-auto max-w-[1280px] px-4 pt-4 sm:px-5 md:px-8 md:pt-5">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex min-h-11 items-center gap-2 py-3 text-[9px] font-bold uppercase tracking-[.14em] text-muted-foreground transition-colors hover:text-primary"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to collection
          </button>
        </div>
        <ThreadsProductDetail key={product.id} product={product} />
        {(canRequestStockAlert || storeId) ? (
          <div className="mx-auto max-w-[1280px] px-4 pb-10 sm:px-5 md:px-8 md:pb-14">
            {canRequestStockAlert && storeId ? (
              <StockNotificationSignup storeId={storeId} productId={product.id} productName={product.name} />
            ) : null}
            {storeId ? <ProductQA productId={product.id} /> : null}
          </div>
        ) : null}
      </StorefrontLayout>
    );
  }

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
        {canRequestStockAlert && storeId ? (
          <StockNotificationSignup storeId={storeId} productId={product.id} productName={product.name} />
        ) : null}
        {storeId ? <ProductQA productId={product.id} /> : null}
      </div>
    </LayoutWrapper>
  );
};

export default ProductDetail;
