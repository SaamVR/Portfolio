import { Link } from "react-router-dom";
import type { Product } from "@/data/products";

const ProductCard = ({ product }: { product: Product }) => {
  return (
    <Link
      to={`/product/${product.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/30 card-shadow"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {product.featured && (
          <span className="absolute left-3 top-3 rounded-sm bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
            Featured
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{product.category}</p>
        <h3 className="font-heading text-base font-semibold text-foreground">{product.name}</h3>
        <p className="mt-2 font-heading text-lg font-bold text-primary">৳{product.price}</p>
      </div>
    </Link>
  );
};

export default ProductCard;
