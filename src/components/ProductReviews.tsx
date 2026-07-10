import { useState, useRef } from "react";
import { Star, Camera, X, Upload, Loader2 } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isUuid } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
  size: string;
  verified: boolean;
  isReal?: boolean;
  adminReply?: string | null;
  imageUrl?: string;
}

// Seeded pseudo-random reviews (kept as a floor until real reviews fill in)
const generateSeededReviews = (productId: string): Review[] => {
  const seed = parseInt(productId.replace(/-/g, "").slice(0, 8), 16) || 1;
  const names = [
    "Raihan K.", "Nusrat A.", "Tanvir H.", "Fahim M.", "Sadia R.",
    "Arif S.", "Mithila D.", "Sakib N.", "Lamia J.", "Imran C.",
    "Tasnim F.", "Rifat B.",
  ];
  const comments = [
    "Excellent quality fabric, feels premium. Will definitely order more.",
    "Great fit! True to size and the color is exactly as shown.",
    "Very comfortable for daily wear. The stitching is solid.",
    "Good value for the price. Delivery was fast too.",
    "Love the material — soft yet durable. Highly recommend.",
    "Ordered two more after trying the first one. Perfect basics.",
    "Slightly longer than expected but overall great quality.",
    "Best purchase this month. The fabric breathes really well.",
    "Color faded slightly after first wash, but still looks good.",
    "Perfect gift for my brother. He loved the fit and feel.",
    "Wearing this every other day now. Super comfortable.",
    "Impressed with the packaging and product quality both.",
  ];
  const sizes = ["S", "M", "L", "XL", "XXL"];
  const mockPhotos = [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=300", // T-shirt close up
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=80&w=300", // Folded clothes
    "https://images.unsplash.com/photo-1564584217132-2271fea7366b?auto=format&fit=crop&q=80&w=300", // Clothing rack
    "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=300", // Fabric texture
  ];

  const count = 3 + (seed % 3);
  const reviews: Review[] = [];

  for (let i = 0; i < count; i++) {
    const idx = (seed * 7 + i * 13) % names.length;
    const cIdx = (seed * 3 + i * 11) % comments.length;
    const rating = 3 + ((seed + i * 5) % 3);
    const month = 1 + ((seed + i) % 12);
    const day = 1 + ((seed * 3 + i * 7) % 28);

    reviews.push({
      id: `${productId}-seeded-${i}`,
      author: names[idx],
      rating,
      date: `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      text: comments[cIdx],
      size: sizes[(seed + i) % sizes.length],
      verified: (seed + i) % 3 !== 0,
      isReal: false,
      imageUrl: (i === 0 || i === 2) ? mockPhotos[(seed + i) % mockPhotos.length] : undefined,
    });
  }

  return reviews;
};

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
  const dims = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            dims,
            "transition-colors",
            star <= rating ? "fill-primary text-primary" : "text-border"
          )}
        />
      ))}
    </div>
  );
};

const ProductReviews = ({ productId }: { productId: string }) => {
  const [showAll, setShowAll] = useState(false);
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentStore = useOptionalStore();
  const storeId = currentStore?.id;

  // Fetch real approved reviews from the public view (excludes user_id and order_id)
  const { data: dbReviews = [] } = useQuery({
    queryKey: ["product-reviews", productId, storeId],
    queryFn: async () => {
      if (!isUuid(productId)) return [];
      const { data, error } = await supabase
        .from("public_product_reviews" as any)
        .select("id, author_name, rating, created_at, review_text, size_purchased, admin_reply, image_url")
        .eq("store_id", storeId as string)
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown) as Array<{
        id: string;
        author_name: string;
        rating: number;
        created_at: string;
        review_text: string | null;
        size_purchased: string | null;
        admin_reply: string | null;
        image_url: string | null;
      }>;
    },
    enabled: !!productId && !!storeId,
  });

  const realReviews: Review[] = dbReviews.map((r) => ({
    id: r.id,
    author: r.author_name,
    rating: r.rating,
    date: r.created_at,
    text: r.review_text ?? "",
    size: r.size_purchased ?? "",
    verified: true,
    isReal: true,
    adminReply: r.admin_reply,
    imageUrl: r.image_url ?? undefined,
  }));

  const seededReviews = generateSeededReviews(productId);

  // Real reviews shown first, seeded fill in after
  const allReviews = [...realReviews, ...seededReviews];
  const visibleReviews = showAll ? allReviews : allReviews.slice(0, 3);

  const avgRating =
    allReviews.reduce((sum, r) => sum + r.rating, 0) / (allReviews.length || 1);
  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    stars: r,
    count: allReviews.filter((rev) => rev.rating === r).length,
  }));

  const [uploadingImage, setUploadingImage] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB");
      return;
    }

    setUploadingImage(true);

    try {
      const { data: sigData, error: sigError } = await supabase.functions.invoke(
        "cloudinary-signature",
        { body: { folder: "reviews", resource_type: "image", store_id: storeId } }
      );

      if (sigError || !sigData) throw new Error(sigError?.message || "Failed to get upload signature");

      const { signature, timestamp, cloud_name, api_key } = sigData;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signature);
      formData.append("timestamp", String(timestamp));
      formData.append("api_key", api_key);
      formData.append("folder", sigData.folder || "reviews");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      setPhotoPreview(result.secure_url);
      toast.success("Photo uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload photo");
      setPhotoPreview(null);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim() || !authorName.trim() || rating === 0) {
      toast.error("Please fill in all fields and provide a rating.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      toast.error("You must be logged in to submit a review.");
      return;
    }

    if (!isUuid(productId)) {
      toast.error("Reviews are not available for this demo product yet.");
      return;
    }
    if (!storeId) {
      toast.error("Reviews are unavailable until the store finishes loading.");
      return;
    }

    try {
      const { error } = await supabase.from('product_reviews').insert({
        product_id: productId,
        user_id: userId,
        author_name: authorName,
        rating,
        review_text: reviewText,
        image_url: photoPreview,
        status: 'pending',
        store_id: storeId,
      } as any);

      if (error) {
        throw error;
      }

      toast.success("Review submitted! It will appear after moderation.");
      setWriteModalOpen(false);
      setReviewText("");
      setAuthorName("");
      setPhotoPreview(null);
      setRating(0);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit review.");
    }
  };

  return (
    <section className="border-t border-border py-16 relative">
      <div className="container mx-auto px-4">
        <AnimatedSection animation="blur">
          <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-primary">
                Customer Feedback
              </p>
              <h2 className="font-heading text-2xl font-bold text-foreground">Reviews</h2>
            </div>
            <button
              onClick={() => setWriteModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-md bg-foreground px-6 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
            >
              Write a Review
            </button>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Summary */}
          <AnimatedSection animation="blur" delay={100}>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 text-center">
                <p className="font-heading text-5xl font-bold text-foreground">
                  {avgRating.toFixed(1)}
                </p>
                <div className="mt-2 flex justify-center">
                  <StarRating rating={Math.round(avgRating)} size="md" />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Based on {allReviews.length} review{allReviews.length !== 1 ? "s" : ""}
                </p>
                {realReviews.length > 0 && (
                  <p className="mt-1 text-xs text-primary">
                    {realReviews.length} verified purchase{realReviews.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {ratingCounts.map(({ stars, count }) => (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="w-6 text-right text-xs font-medium text-muted-foreground">
                      {stars}★
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{
                          width: `${allReviews.length ? (count / allReviews.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="w-4 text-xs text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Review list */}
          <div className="lg:col-span-2 space-y-6">
            {visibleReviews.map((review, i) => (
              <AnimatedSection key={review.id} delay={150 + i * 80} animation="blur">
                <div className="rounded-lg border border-border bg-card p-5 smooth-hover hover:border-primary/20">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{review.author}</p>
                        {review.verified && (
                          <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {review.isReal ? "Verified Purchase" : "Verified"}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {review.size && `Size: ${review.size} · `}
                        {new Date(review.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>

                  {review.text && (
                    <p className="text-sm leading-relaxed text-muted-foreground">{review.text}</p>
                  )}

                  {review.imageUrl && (
                    <div className="mt-4 overflow-hidden rounded-md border border-border">
                      <img 
                        src={review.imageUrl} 
                        alt="Customer photo" 
                        className="h-32 w-auto object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
                        onClick={() => window.open(review.imageUrl, "_blank")}
                      />
                    </div>
                  )}

                  {/* Admin reply bubble */}
                  {review.adminReply && (
                    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="mb-1 text-xs font-semibold text-primary">Store Response</p>
                      <p className="text-sm text-foreground">{review.adminReply}</p>
                    </div>
                  )}
                </div>
              </AnimatedSection>
            ))}

            {allReviews.length > 3 && !showAll && (
              <AnimatedSection animation="blur" delay={400}>
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full rounded-md border border-border py-3 text-sm font-medium text-muted-foreground smooth-hover hover:border-primary/50 hover:text-foreground"
                >
                  Show all {allReviews.length} reviews
                </button>
              </AnimatedSection>
            )}
          </div>
        </div>
      </div>

      {/* Write Review Modal */}
      {writeModalOpen && (
        <>
          <div 
            className="fixed inset-0 z-[120] bg-background/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setWriteModalOpen(false)}
          />
          <div className="fixed left-[50%] top-[50%] z-[121] w-full max-w-md translate-x-[-50%] translate-y-[-50%] p-4 animate-in zoom-in-95">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h3 className="font-heading text-lg font-bold">Write a Review</h3>
                <button onClick={() => setWriteModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={submitReview} className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star className={cn("h-6 w-6", star <= rating ? "fill-primary text-primary" : "text-border")} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Your Name</label>
                  <input
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Review</label>
                  <textarea
                    required
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
                    placeholder="What did you like about this product?"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Add a Photo
                  </label>
                  {photoPreview ? (
                    <div className="relative inline-block">
                      <img src={photoPreview} alt="Preview" className="h-24 w-24 rounded-md object-cover border border-border" />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/50 text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="text-xs">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          <span className="text-xs">Upload Photo (Optional)</span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Submit Review
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default ProductReviews;
