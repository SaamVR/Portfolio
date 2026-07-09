import Link from "next/link";
import { useState } from "react";
import { Eye, Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/useCart";
import { cn } from "@/lib/utils";
import { productUrl } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

const ProductCard = ({ product, onQuickView }: ProductCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { isInWishlist, toggleItem } = useWishlist();
  const { addItem } = useCart();
  const currentStore = useOptionalStore();
  const wishlisted = isInWishlist(product.id);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] hover:border-primary/40 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <Link
        href={productUrl(product.id, product.name, currentStore?.slug)}
        className="block focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`View ${product.name} - ${product.colors[0]} - ৳${product.price}`}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
          {!imageLoaded && (
            <div className="absolute inset-0 shimmer-bg" />
          )}
          <img
            src={product.image}
            alt={`${product.name} in ${product.colors[0]}`}
            className={cn(
              "h-full w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />
          {/* Badge */}
          {product.badge && (
            <span
              className={cn(
                "absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase z-10 shadow-sm",
                product.badge === "New"
                  ? "bg-accent text-accent-foreground"
                  : "bg-destructive text-destructive-foreground"
              )}
            >
              {product.badge}
            </span>
          )}
          {/* Featured badge - only show if no other badge */}
          {product.featured && !product.badge && (
            <span className="absolute left-3 top-3 rounded-full bg-primary/90 backdrop-blur-sm px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-primary-foreground shadow-sm">
              Featured
            </span>
          )}
          {/* Low stock badge */}
          {product.stock !== undefined && product.stock > 0 && product.stock <= 5 && (
            <span className="absolute left-3 bottom-3 rounded-md bg-destructive/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground z-10 animate-pulse">
              Only {product.stock} left!
            </span>
          )}
          <span className="absolute right-3 top-3 rounded-full bg-background/60 backdrop-blur-md px-3 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground border border-white/10">
            {product.type}
          </span>
        </div>
        <div className="p-5">
          <p className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{product.category}</p>
          <h3 className="font-heading text-[15px] font-semibold text-foreground line-clamp-1">{product.name}</h3>
          <div className="mt-2.5 flex items-center gap-2.5">
            <p className="font-heading text-lg font-bold text-primary transition-colors duration-300 group-hover:text-accent">
              ৳{product.price}
            </p>
            {product.originalPrice && (
              <p className="font-heading text-sm text-muted-foreground line-through opacity-70">
                ৳{product.originalPrice}
              </p>
            )}
          </div>
          {/* Color swatches */}
          {product.colors.length > 1 && (
            <div className="mt-3.5 flex items-center gap-1.5">
              {product.colors.slice(0, 5).map((color) => (
                <span
                  key={color}
                  className="h-3.5 w-3.5 rounded-full border border-border shadow-sm transition-transform hover:scale-125"
                  style={{ backgroundColor: color.toLowerCase() === 'white' ? '#f5f5f5' : color.toLowerCase() }}
                  title={color}
                />
              ))}
              {product.colors.length > 5 && (
                <span className="text-[10px] font-medium text-muted-foreground ml-1">+{product.colors.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Wishlist heart button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleItem(product.id);
        }}
        aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        className={cn(
          "absolute right-3 bottom-[calc(theme(spacing.5)+6.5rem)] z-10 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-all duration-300 ease-out hover:scale-110",
          wishlisted
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-background/80 text-muted-foreground backdrop-blur-sm hover:text-primary hover:border-primary/30"
        )}
      >
        <Heart className={cn("h-[18px] w-[18px] transition-all duration-300", wishlisted && "fill-primary scale-110")} />
      </button>

      {/* Action Buttons (Desktop Only) */}
      <div className="absolute bottom-[calc(theme(spacing.5)+6.5rem)] left-1/2 -translate-x-1/2 translate-y-6 hidden lg:flex items-center gap-2 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:translate-y-0 group-hover:opacity-100 z-10">
        {onQuickView && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView(product);
            }}
            aria-label={`Quick view ${product.name}`}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-background/90 backdrop-blur-md text-foreground border border-border shadow-lg hover:bg-background transition-transform hover:scale-105"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addItem({
              productId: product.id,
              name: product.name,
              price: product.price,
              image: product.image,
              size: product.sizes?.[0] || "M",
              storeId: currentStore?.id,
            });
          }}
          aria-label={`Quick add ${product.name}`}
          className="flex items-center gap-2 rounded-full bg-primary/95 backdrop-blur-sm px-5 h-10 text-[13px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg hover:bg-primary transition-transform hover:scale-105"
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Add
        </button>
      </div>
    </div>
  );
};

export default ProductCard;

