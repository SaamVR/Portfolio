import { Link } from "react-router-dom";
import { useState } from "react";
import type { Product } from "@/data/products";
import { cn } from "@/lib/utils";

const ProductCard = ({ product }: { product: Product }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-card smooth-hover hover:border-primary/30 hover:-translate-y-1 hover:premium-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
  );
};

export default ProductCard;
