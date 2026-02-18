import { Link } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import type { Product } from "@/data/products";
import { useProducts } from "@/hooks/useProducts";

interface RelatedProductsProps {
  currentProduct: Product;
}

const RelatedProducts = ({ currentProduct }: RelatedProductsProps) => {
  const { data: products = [] } = useProducts();

  const related = products
    .filter(
      (p) =>
        p.id !== currentProduct.id &&
        (p.type === currentProduct.type || p.category === currentProduct.category)
    )
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section className="border-t border-border py-16">
      <div className="container mx-auto px-4">
        <AnimatedSection animation="blur">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-primary">You may also like</p>
              <h2 className="font-heading text-2xl font-bold text-foreground">Related Products</h2>
            </div>
            <Link
              to={`/shop?type=${currentProduct.type}`}
              className="text-sm font-medium text-muted-foreground smooth-hover hover:text-foreground"
            >
              View all →
            </Link>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((product, i) => (
            <AnimatedSection key={product.id} delay={i * 100} animation="blur">
              <ProductCard product={product} />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedProducts;
