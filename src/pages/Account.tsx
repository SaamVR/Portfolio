import { useState } from "react";
import { Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrders, type Order } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Loader2, Package, MapPin, LogOut, Plus, Trash2, Star, CheckCircle2,
} from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";

interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  is_default: boolean;
}

const addressSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(50),
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(11, "Valid phone required").max(14),
  address: z.string().trim().min(5, "Address is required").max(500),
  city: z.string().trim().min(1, "City is required").max(100),
});

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  confirmed: "bg-blue-500/10 text-blue-500",
  processing: "bg-purple-500/10 text-purple-500",
  shipped: "bg-indigo-500/10 text-indigo-500",
  delivered: "bg-primary/10 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
};

// --- Star Picker ---
const StarPicker = ({
  value,
  hover,
  onChange,
  onHover,
  onLeave,
}: {
  value: number;
  hover: number;
  onChange: (v: number) => void;
  onHover: (v: number) => void;
  onLeave: () => void;
}) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <button
        key={s}
        type="button"
        onClick={() => onChange(s)}
        onMouseEnter={() => onHover(s)}
        onMouseLeave={onLeave}
        className="transition-transform hover:scale-110 focus:outline-none"
        aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
      >
        <Star
          className={cn(
            "h-8 w-8 transition-colors",
            s <= (hover || value)
              ? "fill-primary text-primary"
              : "text-border"
          )}
        />
      </button>
    ))}
  </div>
);

// --- Review Sheet ---
interface ReviewSheetProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productImage: string;
  orderId: string;
  sizePurchased: string;
  authorName: string;
  userId: string;
  onSubmitted: () => void;
}

const ReviewSheet = ({
  open,
  onClose,
  productId,
  productName,
  productImage,
  orderId,
  sizePurchased,
  authorName,
  userId,
  onSubmitted,
}: ReviewSheetProps) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("product_reviews" as any)
        .insert({
          product_id: productId,
          user_id: userId,
          order_id: orderId,
          author_name: authorName,
          rating,
          review_text: text.trim() || null,
          size_purchased: sizePurchased || null,
          status: "pending",
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-submitted-reviews", userId] });
      toast.success("Review submitted! It'll appear after a quick check by our team.");
      setRating(0);
      setText("");
      onSubmitted();
      onClose();
    },
    onError: (err: any) => {
      if (err?.code === "23505") {
        toast.error("You've already reviewed this product from this order.");
      } else {
        toast.error("Failed to submit review. Please try again.");
      }
    },
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto pb-8">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border">
              <img src={productImage} alt={productName} className="h-full w-full object-cover" />
            </div>
            <div>
              <SheetTitle className="text-left font-heading text-base font-bold leading-tight">
                {productName}
              </SheetTitle>
              {sizePurchased && (
                <p className="text-xs text-muted-foreground">Size: {sizePurchased}</p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Star picker */}
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Your Rating *</p>
            <StarPicker
              value={rating}
              hover={hover}
              onChange={setRating}
              onHover={setHover}
              onLeave={() => setHover(0)}
            />
            {(hover || rating) > 0 && (
              <p className="mt-2 text-sm font-medium text-primary">
                {ratingLabels[hover || rating]}
              </p>
            )}
          </div>

          {/* Text area */}
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Your Review (optional)</p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder="What did you love about it? How was the fit? Would you recommend it?"
              className="min-h-[100px] resize-none text-sm"
              maxLength={500}
            />
            <p className="mt-1.5 text-right text-xs text-muted-foreground">{text.length}/500</p>
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            onClick={() => submit.mutate()}
            disabled={rating === 0 || submit.isPending}
          >
            {submit.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
            ) : (
              "Post Review"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Your review will be visible after a quick check by our team.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// --- Main Account Component ---
const Account = () => {
  const { user, loading, signOut } = useAuth();
  const { data: orders, isLoading: ordersLoading } = useMyOrders();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"orders" | "addresses">("orders");
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({ label: "Home", name: "", phone: "", address: "", city: "" });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [reviewSheet, setReviewSheet] = useState<{
    productId: string;
    productName: string;
    productImage: string;
    orderId: string;
    sizePurchased: string;
  } | null>(null);

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ["my-addresses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data as unknown as Address[];
    },
    enabled: !!user,
  });

  // Batch-fetch all reviews submitted by this user (for "already reviewed" state)
  const { data: submittedReviews = [] } = useQuery({
    queryKey: ["my-submitted-reviews", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews" as any)
        .select("product_id, order_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data as unknown as Array<{ product_id: string; order_id: string }>) ?? [];
    },
    enabled: !!user,
  });

  // O(1) lookup set
  const reviewedSet = new Set(submittedReviews.map((r) => `${r.product_id}__${r.order_id}`));

  // Fetch profile for author_name
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const addAddress = useMutation({
    mutationFn: async (addr: Omit<Address, "id" | "is_default">) => {
      const payload = { ...addr, user_id: user!.id, is_default: addresses.length === 0 };
      const { error } = await supabase
        .from("customer_addresses")
        .insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-addresses"] });
      setAddingAddress(false);
      setAddressForm({ label: "Home", name: "", phone: "", address: "", city: "" });
      toast.success("Address saved");
    },
    onError: () => toast.error("Failed to save address"),
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-addresses"] });
      toast.success("Address removed");
    },
  });

  const setDefaultAddress = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("customer_addresses")
        .update({ is_default: false } as Record<string, unknown>)
        .eq("user_id", user!.id);
      const { error } = await supabase
        .from("customer_addresses")
        .update({ is_default: true } as Record<string, unknown>)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-addresses"] });
      toast.success("Default address updated");
    },
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const authorName =
    profile?.display_name || profile?.email?.split("@")[0] || user.email?.split("@")[0] || "Customer";

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const result = addressSchema.safeParse(addressForm);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) errs[err.path[0] as string] = err.message;
      });
      setAddressErrors(errs);
      return;
    }
    setAddressErrors({});
    addAddress.mutate(addressForm);
  };

  return (
    <Layout>
      <SEOHead title="My Account" description="Manage your ThreadBD account, orders, and addresses." noindex />
      <PageTransition>
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">My Account</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>

          {/* Tabs */}
          <div className="mb-8 flex gap-4 border-b border-border">
            {[
              { key: "orders" as const, label: "Orders", icon: Package },
              { key: "addresses" as const, label: "Addresses", icon: MapPin },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {/* Orders Tab */}
          {tab === "orders" && (
            <div className="space-y-4">
              {ordersLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !orders?.length ? (
                <div className="py-12 text-center">
                  <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                  <p className="font-heading text-lg font-semibold text-foreground">No orders yet</p>
                  <p className="text-sm text-muted-foreground">Your order history will appear here.</p>
                </div>
              ) : (
                orders.map((order: Order) => {
                  const isDelivered = order.status === "delivered";
                  return (
                    <Card key={order.id} className="border-border">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="font-heading text-sm">{order.order_number}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString("en-US", {
                                year: "numeric", month: "long", day: "numeric",
                              })}
                            </p>
                          </div>
                          <Badge className={statusColors[order.status] || "bg-secondary text-foreground"}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {order.items.map((item, i) => {
                            const alreadyReviewed = reviewedSet.has(`${item.productId}__${order.id}`);
                            return (
                              <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-foreground">
                                    {item.name} × {item.quantity}{" "}
                                    <span className="text-muted-foreground">({item.size})</span>
                                  </span>
                                  <span className="text-muted-foreground">৳{item.price * item.quantity}</span>
                                </div>

                                {/* Review CTA — only for delivered orders */}
                                {isDelivered && (
                                  <div className={cn(
                                    "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all",
                                    alreadyReviewed
                                      ? "bg-primary/5 border border-primary/15"
                                      : "bg-secondary/60 border border-border hover:border-primary/30"
                                  )}>
                                    {alreadyReviewed ? (
                                      <div className="flex items-center gap-2 text-primary">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="text-xs font-medium">Review submitted — thank you!</span>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                              <Star key={s} className="h-3 w-3 text-muted-foreground/40" />
                                            ))}
                                          </div>
                                          <div>
                                            <p className="text-xs font-medium text-foreground leading-tight">
                                              How was {item.name}?
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                              Share your experience
                                            </p>
                                          </div>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-3 text-xs border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                                          onClick={() =>
                                            setReviewSheet({
                                              productId: item.productId,
                                              productName: item.name,
                                              productImage: item.image,
                                              orderId: order.id,
                                              sizePurchased: item.size,
                                            })
                                          }
                                        >
                                          Write a Review
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div className="border-t border-border pt-2 flex justify-between font-heading font-bold text-foreground">
                            <span>Total</span>
                            <span>৳{order.total}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Addresses Tab */}
          {tab === "addresses" && (
            <div className="space-y-4">
              {addressesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {addresses.map((addr) => (
                    <Card key={addr.id} className="border-border">
                      <CardContent className="flex items-start justify-between p-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-heading text-sm font-semibold text-foreground">{addr.label}</p>
                            {addr.is_default && (
                              <Badge variant="secondary" className="text-[10px]">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground">{addr.name}</p>
                          <p className="text-xs text-muted-foreground">{addr.phone}</p>
                          <p className="text-xs text-muted-foreground">{addr.address}, {addr.city}</p>
                        </div>
                        <div className="flex gap-1">
                          {!addr.is_default && (
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => setDefaultAddress.mutate(addr.id)}
                            >
                              <Star className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteAddress.mutate(addr.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {addingAddress ? (
                    <Card className="border-border">
                      <CardContent className="p-4">
                        <form onSubmit={handleAddAddress} className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Input
                                value={addressForm.label}
                                onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                                placeholder="Label (Home, Office)"
                              />
                              {addressErrors.label && <p className="mt-1 text-xs text-destructive">{addressErrors.label}</p>}
                            </div>
                            <div>
                              <Input
                                value={addressForm.name}
                                onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                                placeholder="Full Name"
                              />
                              {addressErrors.name && <p className="mt-1 text-xs text-destructive">{addressErrors.name}</p>}
                            </div>
                          </div>
                          <div>
                            <Input
                              value={addressForm.phone}
                              onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                              placeholder="Phone (01XXXXXXXXX)"
                            />
                            {addressErrors.phone && <p className="mt-1 text-xs text-destructive">{addressErrors.phone}</p>}
                          </div>
                          <div>
                            <Input
                              value={addressForm.address}
                              onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                              placeholder="Full Address"
                            />
                            {addressErrors.address && <p className="mt-1 text-xs text-destructive">{addressErrors.address}</p>}
                          </div>
                          <div>
                            <Input
                              value={addressForm.city}
                              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                              placeholder="City"
                            />
                            {addressErrors.city && <p className="mt-1 text-xs text-destructive">{addressErrors.city}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={addAddress.isPending}>
                              {addAddress.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                              Save Address
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setAddingAddress(false)}>
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button variant="outline" onClick={() => setAddingAddress(true)} className="gap-2">
                      <Plus className="h-4 w-4" /> Add Address
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </PageTransition>

      {/* Review Submission Sheet */}
      {reviewSheet && (
        <ReviewSheet
          open={!!reviewSheet}
          onClose={() => setReviewSheet(null)}
          productId={reviewSheet.productId}
          productName={reviewSheet.productName}
          productImage={reviewSheet.productImage}
          orderId={reviewSheet.orderId}
          sizePurchased={reviewSheet.sizePurchased}
          authorName={authorName}
          userId={user.id}
          onSubmitted={() => setReviewSheet(null)}
        />
      )}
    </Layout>
  );
};

export default Account;
