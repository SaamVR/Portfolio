import { Link } from "@/lib/react-router-dom-shim";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { useWishlist } from "@/context/wishlist-context";
import { useProducts } from "@/hooks/useProducts";
import { ArrowRight, Heart, Loader2 } from "lucide-react";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { ThreadsProductCard } from "@/components/storefront/threads/ThreadsProductCard";

const Wishlist = () => {
  const { items } = useWishlist();
  const currentStore = useOptionalStore();
  const storeName = currentStore?.name ?? "this store";
  const { data: products = [], isLoading } = useProducts(currentStore?.id);
  const wishlistProducts = products.filter((p) => items.includes(p.id));
  const LayoutWrapper = currentStore?.id ? StorefrontLayout : Layout;
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : currentStore?.slug ?? null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const isThreads = templateId === "threads";

  if (isThreads) {
    return (
      <LayoutWrapper>
        <SEOHead title="Wishlist" description={`Saved products from ${storeName}.`} noindex />
        <PageTransition>
          <section className="border-b border-border/60 bg-secondary/30">
            <div className="mx-auto max-w-[1280px] px-4 py-9 sm:px-6 md:px-8 md:py-12">
              <p className="text-[9px] font-bold uppercase tracking-[.22em] text-primary">Your collection</p>
              <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <h1 className="font-serif text-[44px] font-semibold leading-[.88] tracking-[-.05em] sm:text-[54px]">Saved pieces</h1>
                <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
                  {isLoading ? "Loading saved pieces" : `${wishlistProducts.length} saved ${wishlistProducts.length === 1 ? "piece" : "pieces"}`}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-background py-8 md:py-12">
            <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-8">
              {!currentStore ? (
                <div className="border border-border bg-secondary/25 px-5 py-12 text-center text-[12px] leading-6 text-muted-foreground">
                  Wishlist items are stored per storefront. Open this page from a specific store to see your saved products.
                </div>
              ) : isLoading ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-5" aria-label="Loading wishlist" aria-live="polite">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="aspect-[4/5] bg-secondary" />
                      <div className="mt-3 h-3 w-3/4 bg-secondary" />
                      <div className="mt-2 h-2.5 w-1/2 bg-secondary/70" />
                    </div>
                  ))}
                </div>
              ) : wishlistProducts.length === 0 ? (
                <AnimatedSection animation="blur">
                  <div className="grid min-h-[360px] place-items-center border border-dashed border-border bg-secondary/20 px-5 py-12 text-center">
                    <div className="max-w-md">
                      <Heart className="mx-auto h-8 w-8 stroke-[1.3] text-primary/55" />
                      <h2 className="mt-5 font-serif text-[32px] font-semibold leading-[.95] tracking-[-.035em]">Keep the pieces you want to revisit.</h2>
                      <p className="mt-4 text-[12px] leading-6 text-muted-foreground">Tap the heart on any product from {storeName}; your saved collection will gather here.</p>
                      <Link
                        to={storefrontPath("/shop", currentStore?.slug)}
                        className="mt-6 inline-flex min-h-11 items-center gap-2 bg-primary px-5 text-[10px] font-bold uppercase tracking-[.1em] text-primary-foreground"
                      >
                        Browse collection <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </AnimatedSection>
              ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-5 md:gap-y-10">
                  {wishlistProducts.map((product) => (
                    <ThreadsProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </PageTransition>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <SEOHead title="Wishlist" description={`Saved products from ${storeName}.`} noindex />
      <PageTransition>
        <section className="py-16">
          <div className="container mx-auto px-4">
            <AnimatedSection animation="blur">
              <div className="mb-8">
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Your Collection</p>
                <h1 className="font-heading text-4xl font-bold text-foreground">Wishlist</h1>
              </div>
            </AnimatedSection>

            {!currentStore ? (
              <AnimatedSection animation="blur">
                <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  Wishlist items are stored per storefront. Open this page from a specific store to see your saved products.
                </div>
              </AnimatedSection>
            ) : isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : wishlistProducts.length === 0 ? (
              <AnimatedSection animation="blur">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Heart className="mb-4 h-12 w-12 text-muted-foreground/30" />
                  <p className="mb-4 font-heading text-xl font-semibold text-foreground">Your wishlist is empty</p>
                  <p className="mb-6 text-muted-foreground">Save products from {storeName} by tapping the heart icon while you browse.</p>
                  <Link
                    to={storefrontPath("/shop", currentStore?.slug)}
                    className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 smooth-hover"
                  >
                    Browse Collection
                  </Link>
                </div>
              </AnimatedSection>
            ) : (
              <>
                <p className="mb-6 text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">{wishlistProducts.length}</span> saved item{wishlistProducts.length !== 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {wishlistProducts.map((product, i) => (
                    <AnimatedSection key={product.id} delay={i * 80} animation="blur">
                      <ProductCard product={product} />
                    </AnimatedSection>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </PageTransition>
    </LayoutWrapper>
  );
};

export default Wishlist;
