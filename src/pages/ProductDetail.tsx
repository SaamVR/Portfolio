import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Ruler, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import ProductImageGallery from "@/components/ProductImageGallery";
import SizeGuide from "@/components/SizeGuide";
import RelatedProducts from "@/components/RelatedProducts";
import ProductReviews from "@/components/ProductReviews";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const RECENTLY_VIEWED_KEY = "threadbd-recently-viewed";
const MAX_RECENT = 8;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { data: product, isLoading } = useProduct(id);
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevIdRef = useRef(id);

  // Luxurious scroll-to-top with fade transition on product change
  useEffect(() => {
    if (prevIdRef.current !== id) {
      setIsTransitioning(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      const timer = setTimeout(() => setIsTransitioning(false), 500);
      prevIdRef.current = id;
      return () => clearTimeout(timer);
    }
  }, [id]);

  // Record recently viewed
  useEffect(() => {
    if (!id) return;
    try {
      const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]") as string[];
      const updated = [id, ...stored.filter((pid) => pid !== id)].slice(0, MAX_RECENT);
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [id]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <p className="mb-4 font-heading text-xl font-semibold text-foreground">Product not found</p>
            <button
              onClick={() => navigate("/shop")}
              className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Browse Shop
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      size: selectedSize,
    });
    toast.success("Added to cart!");
  };

  const lowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 5;

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
    <Layout>
      <SEOHead
        title={product.name}
        description={product.description}
        canonical={`https://threadbd.lovable.app/product/${product.id}`}
        ogType="product"
        ogImage={product.images?.[0] || product.image}
        jsonLd={productJsonLd}
      />
      <div
        className="container mx-auto px-4 py-12 transition-all duration-700 ease-out"
        style={{
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? "translateY(16px)" : "translateY(0)",
          filter: isTransitioning ? "blur(6px)" : "blur(0px)",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Go back to previous page"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <ProductImageGallery images={product.images} alt={product.name} />
          <div className="flex flex-col justify-center">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{product.category}</p>
            <h1 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">{product.name}</h1>
            <div className="mb-6 flex items-center gap-3">
              <p className="font-heading text-3xl font-bold text-primary">৳{product.price}</p>
              {product.originalPrice && (
                <p className="font-heading text-lg text-muted-foreground line-through">৳{product.originalPrice}</p>
              )}
              {product.badge && (
                <Badge variant={product.badge === "Sale" ? "destructive" : "default"}>
                  {product.badge}
                </Badge>
              )}
            </div>
            <p className="mb-8 leading-relaxed text-muted-foreground">{product.description}</p>

            {lowStock && (
              <p className="mb-4 text-sm font-medium text-destructive">🔥 Only {product.stock} left in stock!</p>
            )}

            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wider text-foreground">Size</p>
                <button
                  onClick={() => setSizeGuideOpen(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground smooth-hover hover:text-foreground"
                  aria-label="Open size guide"
                >
                  <Ruler className="h-3.5 w-3.5" /> Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    aria-label={`Select size ${size}`}
                    aria-pressed={selectedSize === size}
                    className={`flex h-10 w-14 items-center justify-center rounded-md border text-sm font-medium transition-all ${
                      selectedSize === size
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.isAvailable === false}
              className="w-full rounded-md bg-primary py-4 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 glow-shadow active:animate-scale-pop disabled:opacity-50"
            >
              {product.isAvailable === false ? "Out of Stock" : `Add to Cart — ৳${product.price}`}
            </button>

            <div className="mt-8 space-y-2 border-t border-border pt-6">
              <p className="text-xs text-muted-foreground">✓ Free delivery in Dhaka</p>
              <p className="text-xs text-muted-foreground">✓ Pay with bKash or Cash on Delivery</p>
              <p className="text-xs text-muted-foreground">✓ 7-day easy returns</p>
            </div>
          </div>
        </div>
      </div>
      <ProductReviews productId={product.id} />
      <RelatedProducts currentProduct={product} />
      <SizeGuide open={sizeGuideOpen} onOpenChange={setSizeGuideOpen} />
    </Layout>
  );
};

export default ProductDetail;
