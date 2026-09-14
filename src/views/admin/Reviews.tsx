import { useAuth } from "@/hooks/auth-context";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
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
  <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
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
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-300",
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
  const approvedCount = reviews.filter((r) => r.status === "approved").length;
  const rejectedCount = reviews.filter((r) => r.status === "rejected").length;

  const tabs: { key: ReviewStatus; label: string; count: number }[] = [
    { key: "all", label: "All", count: reviews.length },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "approved", label: "Approved", count: approvedCount },
    { key: "rejected", label: "Rejected", count: rejectedCount },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl font-bold text-foreground">Review moderation</h2>
            {pendingCount > 0 ? <Badge>{pendingCount} awaiting decision</Badge> : <Badge variant="secondary">Caught up</Badge>}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Decide what appears publicly, then reply when a customer needs a visible store response.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refetch()} className="min-h-11 w-full gap-2 sm:w-auto">
          <RefreshCw className="h-4 w-4" /> Refresh reviews
        </Button>
      </div>

      <div className="space-y-2 sm:hidden">
        <Label htmlFor="review-status-filter">Review status</Label>
        <Select value={filterTab} onValueChange={(value) => setFilterTab(value as ReviewStatus)}>
          <SelectTrigger id="review-status-filter" className="min-h-12 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tabs.map(({ key, label, count }) => (
              <SelectItem key={key} value={key}>{label} ({count})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden overflow-x-auto border-b border-border sm:block">
        <div className="flex min-w-max gap-1">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterTab(key)}
              className={cn(
                "min-h-11 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                filterTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {isLoading && reviews.length === 0 ? (
        <div className="flex min-h-56 items-center justify-center rounded-xl border border-border bg-card/40">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading reviews…
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={MessageSquare}
          title={filterTab === "pending" ? "No reviews awaiting moderation" : filterTab === "all" ? "No reviews yet" : `No ${filterTab} reviews`}
          description={filterTab === "pending" ? "You are caught up. Newly submitted reviews will appear here for moderation." : filterTab === "all" ? "Reviews will appear here once customers start submitting feedback after real orders." : `There are no reviews with ${filterTab} status right now.`}
          helper={filterTab === "pending" ? "A clear queue makes it easier to keep storefront trust current without repeatedly scanning old reviews." : "Use the status filter to switch between moderation states."}
          actions={filterTab !== "all" ? [
            { label: "Show all reviews", onClick: () => setFilterTab("all") } as any,
          ] : activeStoreId ? [
            { label: "Open orders", href: `/admin/orders?storeId=${encodeURIComponent(activeStoreId)}` },
            { label: "Open launch readiness", href: `/admin/launch?storeId=${encodeURIComponent(activeStoreId)}`, variant: "outline" },
          ] : []}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <div key={review.id} className={cn(
              "overflow-hidden rounded-xl border bg-card",
              review.status === "pending" ? "border-primary/30" : "border-border",
            )}>
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-secondary sm:h-14 sm:w-14">
                    {review.products?.image_url ? (
                      <img
                        src={review.products.image_url}
                        alt={review.products?.name ?? "Reviewed product"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-secondary" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-heading text-sm font-semibold text-foreground">
                          {review.products?.name ?? "Unknown Product"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <StarDisplay rating={review.rating} />
                          <span className="text-xs text-muted-foreground">by {review.author_name}</span>
                          {review.size_purchased ? <span className="text-xs text-muted-foreground">Size {review.size_purchased}</span> : null}
                        </div>
                      </div>
                      <Badge className={cn("capitalize border text-xs", statusBadge[review.status])}>{review.status}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Order {review.orders?.order_number ?? "—"}</span>
                      <span>{new Date(review.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                    </div>
                    {review.review_text ? (
                      <p className="mt-3 text-sm leading-6 text-foreground/85">“{review.review_text}”</p>
                    ) : (
                      <p className="mt-3 text-sm italic text-muted-foreground">Rating submitted without written feedback.</p>
                    )}
                  </div>
                </div>

                {review.admin_reply && replyingId !== review.id ? (
                  <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:ml-[4.5rem]">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-xs font-semibold text-primary">Store reply</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 justify-start px-2 text-xs text-muted-foreground hover:text-destructive sm:justify-center"
                        onClick={() => handleDeleteReply(review.id)}
                        disabled={updateReview.isPending}
                      >
                        Remove reply
                      </Button>
                    </div>
                    <p className="text-sm leading-6 text-foreground">{review.admin_reply}</p>
                  </div>
                ) : null}

                {replyingId === review.id ? (
                  <div className="mt-4 space-y-3 sm:ml-[4.5rem]">
                    <Label htmlFor={`review-reply-${review.id}`}>Public store reply</Label>
                    <Textarea
                      id={`review-reply-${review.id}`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a helpful reply customers will see below this review…"
                      className="min-h-24 text-sm"
                      autoFocus
                    />
                    <div className="grid gap-2 sm:flex">
                      <Button
                        className="min-h-11"
                        onClick={() => handleSaveReply(review.id)}
                        disabled={!replyText.trim() || updateReview.isPending}
                      >
                        {updateReview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save reply
                      </Button>
                      <Button
                        className="min-h-11"
                        variant="outline"
                        onClick={() => { setReplyingId(null); setReplyText(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border bg-muted/30 p-3 sm:flex sm:flex-wrap sm:items-center sm:px-5">
                {review.status !== "approved" ? (
                  <Button
                    className="min-h-11 gap-2"
                    onClick={() => handleApprove(review.id)}
                    disabled={updateReview.isPending}
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                ) : null}
                {review.status !== "rejected" ? (
                  <Button
                    variant="outline"
                    className="min-h-11 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleReject(review.id)}
                    disabled={updateReview.isPending}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  className="min-h-11 gap-2"
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
                  <MessageSquare className="h-4 w-4" />
                  {review.admin_reply ? "Edit reply" : "Reply"}
                </Button>
                <Button
                  variant="ghost"
                  className="min-h-11 text-destructive/70 hover:bg-destructive/10 hover:text-destructive sm:ml-auto"
                  onClick={() => {
                    if (confirm("Delete this customer review? This cannot be undone.")) deleteReview.mutate(review.id);
                  }}
                  disabled={deleteReview.isPending}
                >
                  Delete review
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