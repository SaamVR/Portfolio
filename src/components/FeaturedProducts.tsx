import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";

const FeaturedProducts = () => {
  const featured = products.filter((p) => p.featured);

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Curated</p>
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">Featured Drops</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
