"use client";

import type { Product } from "@/data/products";
import ContextAwareProductCard from "@/components/storefront/product/ContextAwareProductCard";

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

const ProductCard = ({ product, onQuickView }: ProductCardProps) => (
  <ContextAwareProductCard product={product} onQuickView={onQuickView} />
);

export default ProductCard;
