import { useAuth } from "@/hooks/auth-context";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star, Check, X, MessageSquare, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type ReviewStatus = "all" | "pending" | "approved" | "rejected";

interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string;
  author_name: string;
  rating: number;
  review_text: string | null;
  size_purchased: string | null;
  status: "pending" | "approved" | "rejected";
  admin_reply: string | null;
  created_at: string;
  products?: { name: string; image_url: string } | null;
  orders?: { order_number: string } | null;
}

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={cn(
          "h-3.5 w-3.5",
          s <= rating ? "fill-primary text-primary" : "text-border"
        )}
      />
    ))}
  </div>
);

const statusBadge = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const Reviews = () => {
  const { activeStoreId } = useAuth();
  const queryClient = useQueryClient();
  const [filterTab, setFilterTab] = useState<ReviewStatus>("all");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: reviews = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-reviews", activeStoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews" as any)
        .select(`
          *,
          products (name, image_url),
          orders (order_number)
        `)
        .eq("store_id", activeStoreId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ProductReview[];
    },
    enabled: Boolean(activeStoreId),
  });

  const updateReview = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductReview> }) => {
      const { error } = await supabase
        .from("product_reviews" as any)
        .update(updates as any)
        .eq("id", id)
        .eq("store_id", activeStoreId as string);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews", activeStoreId] });
      queryClient.invalidateQueries({ queryKey: ["pending-reviews-count", activeStoreId] });
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_reviews" as any)
        .delete()
        .eq("id", id)
        .eq("store_id", activeStoreId as string);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews", activeStoreId] });
      queryClient.invalidateQueries({ queryKey: ["pending-reviews-count", activeStoreId] });
      toast.success("Review deleted");
    },
  });

  useEffect(() => {
    setFilterTab("all");
    setReplyingId(null);
    setReplyText("");
  }, [activeStoreId]);

  const handleApprove = (id: string) => {
    updateReview.mutate(
      { id, updates: { status: "approved" } },
      { onSuccess: () => toast.success("Review approved and now visible on the product page") }
    );
  };

  const handleReject = (id: string) => {
    updateReview.mutate(
      { id, updates: { status: "rejected" } },
      { onSuccess: () => toast.success("Review rejected") }
    );
  };

  const handleSaveReply = (id: string) => {
    if (!replyText.trim()) return;
    updateReview.mutate(
      { id, updates: { admin_reply: replyText.trim() } },
      {
        onSuccess: () => {
          toast.success("Reply saved");
          setReplyingId(null);
          setReplyText("");
        },
      }
    );
  };

  const handleDeleteReply = (id: string) => {
    updateReview.mutate(
      { id, updates: { admin_reply: null } },
      { onSuccess: () => toast.success("Reply removed") }
    );
  };

  const filtered = filterTab === "all" ? reviews : reviews.filter((r) => r.status === filterTab);
  const pendingCount = reviews.filter((r) => r.status === "pending").length;

  const tabs: { key: ReviewStatus; label: string }[] = [
    { key: "all", label: `All (${reviews.length})` },
    { key: "pending", label: `Pending (${pendingCount})` },
    { key: "approved", label: `Approved (${reviews.filter((r) => r.status === "approved").length})` },
    { key: "rejected", label: `Rejected (${reviews.filter((r) => r.status === "rejected").length})` },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Moderate customer reviews before they appear on product pages
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterTab(key)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              filterTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {key === "pending" && pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && reviews.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/20" />
          <p className="font-heading text-lg font-semibold text-foreground">No reviews yet</p>
          <p className="text-sm text-muted-foreground">
            {filterTab === "pending" ? "No reviews awaiting moderation." : "Reviews will appear here once customers submit them."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <div key={review.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Review Card Header */}
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Product thumbnail */}
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
                    {review.products?.image_url ? (
                      <img
                        src={review.products.image_url}
                        alt={review.products?.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-secondary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-heading text-sm font-semibold text-foreground line-clamp-1">
                          {review.products?.name ?? "Unknown Product"}
                        </p>
                        <div className="mt-1 flex items-center gap-3 flex-wrap">
                          <StarDisplay rating={review.rating} />
                          <span className="text-xs text-muted-foreground">by {review.author_name}</span>
                          {review.size_purchased && (
                            <span className="text-xs text-muted-foreground">Size: {review.size_purchased}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Order: {review.orders?.order_number ?? "-"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString("en-US", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "capitalize border text-xs",
                          statusBadge[review.status]
                        )}
                      >
                        {review.status}
                      </Badge>
                    </div>

                    {review.review_text && (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        "{review.review_text}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Admin reply display */}
                {review.admin_reply && replyingId !== review.id && (
                  <div className="mt-4 ml-18 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-primary">Store Reply</span>
                      <button
                        onClick={() => handleDeleteReply(review.id)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Remove reply
                      </button>
                    </div>
                    <p className="text-sm text-foreground">{review.admin_reply}</p>
                  </div>
                )}

                {/* Inline reply form */}
                {replyingId === review.id && (
                  <div className="mt-4 space-y-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply that customers will see below this review..."
                      className="min-h-[80px] text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveReply(review.id)}
                        disabled={!replyText.trim() || updateReview.isPending}
                      >
                        {updateReview.isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                        Save Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setReplyingId(null); setReplyText(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-5 py-3">
                {review.status !== "approved" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={() => handleApprove(review.id)}
                    disabled={updateReview.isPending}
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                )}
                {review.status !== "rejected" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleReject(review.id)}
                    disabled={updateReview.isPending}
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (replyingId === review.id) {
                      setReplyingId(null);
                      setReplyText("");
                    } else {
                      setReplyingId(review.id);
                      setReplyText(review.admin_reply ?? "");
                    }
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {review.admin_reply ? "Edit Reply" : "Reply"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto gap-1.5 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => deleteReview.mutate(review.id)}
                  disabled={deleteReview.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reviews;
