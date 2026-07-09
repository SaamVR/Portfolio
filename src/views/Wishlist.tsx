import { Link } from "@/lib/react-router-dom-shim";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { useWishlist } from "@/context/wishlist-context";
import { useProducts } from "@/hooks/useProducts";
import { Heart, Loader2 } from "lucide-react";

const Wishlist = () => {
  const { items } = useWishlist();
  const { data: products = [], isLoading } = useProducts();
  const wishlistProducts = products.filter((p) => items.includes(p.id));

  return (
    <Layout>
      <SEOHead title="Wishlist" description="Your saved ThreadBD products." noindex />
      <PageTransition>
        <section className="py-16">
          <div className="container mx-auto px-4">
            <AnimatedSection animation="blur">
              <div className="mb-8">
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Your Collection</p>
                <h1 className="font-heading text-4xl font-bold text-foreground">Wishlist</h1>
              </div>
            </AnimatedSection>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : wishlistProducts.length === 0 ? (
              <AnimatedSection animation="blur">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Heart className="mb-4 h-12 w-12 text-muted-foreground/30" />
                  <p className="mb-4 font-heading text-xl font-semibold text-foreground">Your wishlist is empty</p>
                  <p className="mb-6 text-muted-foreground">Save items you love by tapping the heart icon.</p>
                  <Link
                    to="/shop"
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
    </Layout>
  );
};

export default Wishlist;
