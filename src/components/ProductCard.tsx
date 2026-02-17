import { Link } from "react-router-dom";
import { useState } from "react";
import { Eye } from "lucide-react";
import type { Product } from "@/data/products";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

const ProductCard = ({ product, onQuickView }: ProductCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card smooth-hover hover:border-primary/30 hover:-translate-y-1 hover:premium-shadow">
      <Link
        to={`/product/${product.id}`}
        className="block focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`View ${product.name} - ${product.colors[0]} - ৳${product.price}`}
      >
        <div className="relative aspect-square overflow-hidden bg-secondary">
          {!imageLoaded && (
            <div className="absolute inset-0 shimmer-bg" />
          )}
          <img
            src={product.image}
            alt={`${product.name} in ${product.colors[0]}`}
            className={cn(
              "h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110",
            imageLoaded ? "opacity-100" : "opacity-0"
            )}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />
          {product.featured && (
            <span className="absolute left-3 top-3 rounded-sm bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
              Featured
            </span>
          )}
          <span className="absolute right-3 top-3 rounded-sm bg-background/70 backdrop-blur-sm px-2 py-1 text-xs font-medium text-muted-foreground">
            {product.type}
          </span>
        </div>
        <div className="p-4">
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{product.category}</p>
          <h3 className="font-heading text-base font-semibold text-foreground">{product.name}</h3>
          <p className="mt-2 font-heading text-lg font-bold text-primary transition-colors duration-300 group-hover:text-accent">
            ৳{product.price}
          </p>
        </div>
      </Link>

      {/* Quick View Button */}
      {onQuickView && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuickView(product);
          }}
          aria-label={`Quick view ${product.name}`}
          className="absolute bottom-[calc(theme(spacing.4)+5.5rem)] left-1/2 -translate-x-1/2 translate-y-4 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 z-10 flex items-center gap-2 rounded-md bg-background/90 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-foreground border border-border shadow-lg hover:bg-background smooth-hover"
        >
          <Eye className="h-3.5 w-3.5" /> Quick View
        </button>
      )}
    </div>
  );
};

export default ProductCard;
