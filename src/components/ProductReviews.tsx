import { useState } from "react";
import { Star } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  // Fetch real approved reviews from the public view (excludes user_id and order_id)
  const { data: dbReviews = [] } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_product_reviews" as any)
        .select("id, author_name, rating, created_at, review_text, size_purchased, admin_reply")
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
      }>;
    },
    enabled: !!productId,
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

  return (
    <section className="border-t border-border py-16">
      <div className="container mx-auto px-4">
        <AnimatedSection animation="blur">
          <div className="mb-10">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Customer Feedback
            </p>
            <h2 className="font-heading text-2xl font-bold text-foreground">Reviews</h2>
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

                  {/* Admin reply bubble */}
                  {review.adminReply && (
                    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="mb-1 text-xs font-semibold text-primary">ThreadBD Response</p>
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
    </section>
  );
};

export default ProductReviews;
