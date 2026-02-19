import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Ruler, Loader2, Heart, ShoppingBag } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import ProductImageGallery from "@/components/ProductImageGallery";
import SizeGuide from "@/components/SizeGuide";
import RelatedProducts from "@/components/RelatedProducts";
import ProductReviews from "@/components/ProductReviews";
import SocialShare from "@/components/SocialShare";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { extractIdFromSlug, productUrl } from "@/lib/slug";
import { cn } from "@/lib/utils";

const RECENTLY_VIEWED_KEY = "threadbd-recently-viewed";
const MAX_RECENT = 8;

const ProductDetail = () => {
  const { slugId } = useParams();
  const id = slugId ? extractIdFromSlug(slugId) : undefined;
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const { data: product, isLoading } = useProduct(id);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [stickyBarVisible, setStickyBarVisible] = useState(false);

  const productSectionRef = useRef<HTMLDivElement>(null);

  const wishlisted = product ? isInWishlist(product.id) : false;

  // Fade-in transition on product change
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 400);
    return () => clearTimeout(timer);
  }, [id]);

  // Reset selections on product change
  useEffect(() => {
    setSelectedSize("");
    setSelectedColor("");
  }, [id]);

  // Set default color when product loads
  useEffect(() => {
    if (product?.colors?.length) {
      setSelectedColor(product.colors[0]);
    }
  }, [product]);

  // Record recently viewed
  useEffect(() => {
    if (!id) return;
    try {
      const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]") as string[];
      const updated = [id, ...stored.filter((pid) => pid !== id)].slice(0, MAX_RECENT);
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [id]);

  // Sticky bar: show when user scrolls past the product section
  useEffect(() => {
    const handleScroll = () => {
      if (!productSectionRef.current) return;
      const rect = productSectionRef.current.getBoundingClientRect();
      setStickyBarVisible(rect.bottom < 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  // Color dot mapping — common colors to tailwind-safe bg classes
  const colorDotMap: Record<string, string> = {
    black: "bg-black",
    white: "bg-white border-2",
    grey: "bg-gray-400",
    gray: "bg-gray-400",
    navy: "bg-blue-900",
    blue: "bg-blue-600",
    red: "bg-red-600",
    green: "bg-green-600",
    olive: "bg-yellow-700",
    burgundy: "bg-red-900",
    maroon: "bg-rose-900",
    yellow: "bg-yellow-400",
    orange: "bg-orange-500",
    pink: "bg-pink-400",
    purple: "bg-purple-600",
    brown: "bg-amber-800",
    beige: "bg-amber-100",
    cream: "bg-amber-50 border-2",
    charcoal: "bg-gray-700",
    "dark grey": "bg-gray-700",
    "light grey": "bg-gray-300",
  };

  const getColorDot = (color: string) => {
    const key = color.toLowerCase();
    return colorDotMap[key] ?? "bg-muted";
  };

  return (
    <Layout>
      <SEOHead
        title={product.name}
        description={product.description}
        canonical={`https://threadbd.lovable.app${productUrl(product.id, product.name)}`}
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

        {/* Product grid */}
        <div ref={productSectionRef} className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <ProductImageGallery images={product.images} alt={product.name} />

          <div className="flex flex-col justify-center">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{product.category}</p>

            {/* Name + wishlist row */}
            <div className="mb-4 flex items-start gap-3">
              <h1 className="flex-1 font-heading text-3xl font-bold text-foreground md:text-4xl">{product.name}</h1>
              <button
                onClick={() => toggleItem(product.id)}
                aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                className={cn(
                  "mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border smooth-hover",
                  wishlisted
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-primary"
                )}
              >
                <Heart className={cn("h-5 w-5 transition-all duration-300", wishlisted && "fill-primary scale-110")} />
              </button>
            </div>

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

            {/* Color swatches */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-8">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
                  Color: <span className="font-normal normal-case text-muted-foreground">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      aria-label={`Select color ${color}`}
                      aria-pressed={selectedColor === color}
                      title={color}
                      className={cn(
                        "relative h-8 w-8 rounded-full transition-all duration-200",
                        getColorDot(color),
                        selectedColor === color
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                          : "hover:scale-110 hover:ring-2 hover:ring-muted-foreground hover:ring-offset-1 hover:ring-offset-background"
                      )}
                    >
                      {selectedColor === color && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className={cn(
                            "h-2 w-2 rounded-full",
                            color.toLowerCase() === "white" || color.toLowerCase() === "cream" || color.toLowerCase() === "beige"
                              ? "bg-gray-800"
                              : "bg-white"
                          )} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size selector */}
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

            <div className="mt-8 space-y-4 border-t border-border pt-6">
              <SocialShare
                url={`https://threadbd.lovable.app${productUrl(product.id, product.name)}`}
                title={product.name}
              />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">✓ Free delivery in Dhaka</p>
                <p className="text-xs text-muted-foreground">✓ Pay with bKash or Cash on Delivery</p>
                <p className="text-xs text-muted-foreground">✓ 7-day easy returns</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />
      <RelatedProducts currentProduct={product} />
      <SizeGuide open={sizeGuideOpen} onOpenChange={setSizeGuideOpen} />

      {/* ── Sticky mobile Add-to-Cart bar ── */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden",
          "border-t border-border bg-background/95 backdrop-blur-md shadow-2xl",
          "transition-transform duration-300 ease-out",
          stickyBarVisible ? "translate-y-0" : "translate-y-full"
        )}
        aria-hidden={!stickyBarVisible}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Product info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-primary">৳{product.price}</p>
              {selectedSize && (
                <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                  Size: {selectedSize}
                </span>
              )}
              {!selectedSize && (
                <span className="text-xs text-muted-foreground">Select a size above</span>
              )}
            </div>
          </div>

          {/* Wishlist */}
          <button
            onClick={() => toggleItem(product.id)}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border smooth-hover",
              wishlisted
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            )}
          >
            <Heart className={cn("h-4 w-4 transition-all duration-300", wishlisted && "fill-primary")} />
          </button>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            disabled={product.isAvailable === false}
            className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground smooth-hover hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            <ShoppingBag className="h-4 w-4" />
            Add to Cart
          </button>
        </div>
        {/* Safe area padding for iPhone home indicator */}
        <div className="h-safe-bottom" style={{ height: "env(safe-area-inset-bottom)" }} />
      </div>
    </Layout>
  );
};

export default ProductDetail;
