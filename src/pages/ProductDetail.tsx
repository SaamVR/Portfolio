import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Ruler } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SizeGuide from "@/components/SizeGuide";
import { products } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const product = products.find((p) => p.id === id);
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Product not found.</p>
      </div>
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="container mx-auto px-4 py-12">
          <button
            onClick={() => navigate(-1)}
            className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="aspect-square overflow-hidden rounded-lg bg-secondary">
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{product.category}</p>
              <h1 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">{product.name}</h1>
              <p className="mb-6 font-heading text-3xl font-bold text-primary">৳{product.price}</p>
              <p className="mb-8 leading-relaxed text-muted-foreground">{product.description}</p>

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
                className="w-full rounded-md bg-primary py-4 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 glow-shadow active:animate-scale-pop"
              >
                Add to Cart — ৳{product.price}
              </button>

              <div className="mt-8 space-y-2 border-t border-border pt-6">
                <p className="text-xs text-muted-foreground">✓ Free delivery in Dhaka</p>
                <p className="text-xs text-muted-foreground">✓ Pay with bKash or Cash on Delivery</p>
                <p className="text-xs text-muted-foreground">✓ 7-day easy returns</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <SizeGuide open={sizeGuideOpen} onOpenChange={setSizeGuideOpen} />
    </div>
  );
};

export default ProductDetail;
