import { useState } from "react";
import { Link } from "@/lib/react-router-dom-shim";
import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Product } from "@/data/products";
import { useCart } from "@/context/useCart";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { productUrl } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import { getDisplayableProductType, getRenderableSizeOptions, shouldShowSizeOptions } from "@/lib/cms/storefront-product-presentation";

interface ProductQuickViewProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProductQuickView = ({ product, open, onOpenChange }: ProductQuickViewProps) => {
  const [selectedSize, setSelectedSize] = useState("");
  const { addItem } = useCart();
  const currentStore = useOptionalStore();
  const presentation = useStoreProductPresentation(product);

  if (!product) return null;

  const { cardVariant, specs } = presentation;
  const sizeOptions = getRenderableSizeOptions(product, specs, cardVariant);
  const requiresSizeSelection = shouldShowSizeOptions(product, specs, cardVariant);
  const displayType = getDisplayableProductType(product.type);

  const handleAddToCart = () => {
    if (requiresSizeSelection && !selectedSize) {
      toast.error("Please select a size");
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      size: selectedSize || sizeOptions[0] || "Default",
      storeId: currentStore?.id,
    });
    toast.success("Added to cart!");
    onOpenChange(false);
    setSelectedSize("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSelectedSize(""); }}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:rounded-xl border-border">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-secondary">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-contain p-4"
            />
            {product.featured && (
              <span className="absolute left-3 top-3 rounded-sm bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                Featured
              </span>
            )}
            {displayType ? (
              <span className="absolute right-3 top-3 rounded-sm bg-background/70 backdrop-blur-sm px-2 py-1 text-xs font-medium text-muted-foreground">
                {displayType}
              </span>
            ) : null}
          </div>

          {/* Details */}
          <div className="flex flex-col justify-between p-6">
            <div>
              {getDisplayableProductType(product.category) || displayType ? (
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {getDisplayableProductType(product.category) || displayType}
                </p>
              ) : null}
              <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">{product.name}</h2>
              <p className="mb-4 font-heading text-2xl font-bold text-primary">৳{product.price}</p>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

              {requiresSizeSelection ? (
                <div className="mb-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        aria-label={`Select size ${size}`}
                        aria-pressed={selectedSize === size}
                        className={cn(
                          "flex h-9 min-w-12 items-center justify-center rounded-md border px-3 text-xs font-medium smooth-hover",
                          selectedSize === size
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAddToCart}
                className="w-full rounded-md bg-primary py-3 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground smooth-hover hover:opacity-90 active:animate-scale-pop"
              >
                Add to Cart — ৳{product.price}
              </button>
              <Link
                to={productUrl(product.id, product.name, currentStore?.slug)}
                onClick={() => onOpenChange(false)}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-3 text-sm font-medium text-muted-foreground smooth-hover hover:border-foreground hover:text-foreground"
              >
                View Full Details <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductQuickView;
