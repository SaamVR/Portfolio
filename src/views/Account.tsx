import { useOptionalStore } from "@/components/storefront/store-context";
import { useEffect, useState } from "react";
import { Navigate, Link } from "@/lib/react-router-dom-shim";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/auth-context";
import { useMyOrders, type Order } from "@/hooks/useOrders";
import { useWishlist } from "@/context/wishlist-context";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Loader2, Package, MapPin, LogOut, Plus, Trash2, Star, CheckCircle2, ShoppingBag,
  Heart, MessageSquare, User, Edit2, Camera, Save, X,
} from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import ProductCard from "@/components/ProductCard";
import { useProductsByIds } from "@/hooks/useProducts";
import { useCart } from "@/context/useCart";
import { getCartVariantDisplayLabel } from "@/lib/digital-cart";
import { productUrl, storefrontPath } from "@/lib/slug";
import { resolveStorefrontOrderExperience } from "@/lib/cms/storefront-order-experience";

interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  is_default: boolean;
}

interface StoreCustomerProfile {
  id: string;
  store_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  marketing_opt_in: boolean;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
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
  const currentStore = useOptionalStore();
  const storeId = currentStore?.id;

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
          store_id: storeId,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-submitted-reviews", userId, storeId] });
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
                <p className="text-xs text-muted-foreground">{resolveStorefrontOrderExperience(currentStore).labels.optionLabel}: {getCartVariantDisplayLabel(sizePurchased)}</p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
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

// --- Profile Header Card ---
const ProfileHeader = ({
  user,
  profile,
  storeId,
  onSignOut,
}: {
  user: any;
  profile: StoreCustomerProfile | null | undefined;
  storeId: string;
  onSignOut: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const queryClient = useQueryClient();

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
  }, [profile?.display_name, storeId]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("store_customer_profiles" as any)
        .update({ display_name: displayName.trim() } as any)
        .eq("user_id", user.id)
        .eq("store_id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-store-profile", user.id, storeId] });
      toast.success("Profile updated");
      setEditing(false);
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const initials = (profile?.display_name || user.email || "U")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Card className="border-border overflow-hidden">
      <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
      <CardContent className="relative px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
          <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pt-2">
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="h-9 max-w-[240px]"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-primary"
                  onClick={() => updateProfile.mutate()}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={() => { setEditing(false); setDisplayName(profile?.display_name || ""); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-bold text-foreground truncate">
                  {profile?.display_name || "Set your name"}
                </h1>
                <button
                  onClick={() => { setDisplayName(profile?.display_name || ""); setEditing(true); }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            )}
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
          <Button variant="outline" onClick={onSignOut} className="gap-2 self-start sm:self-auto">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Main Account Component ---
type TabKey = "orders" | "addresses" | "wishlist" | "reviews";


const OrderTimeline = ({ status }: { status: string }) => {
  const allStatuses = ["pending", "confirmed", "processing", "shipped", "delivered"];
  if (status === "cancelled") {
    return (
      <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm font-semibold rounded-md border border-destructive/20 text-center">
        This order has been cancelled.
      </div>
    );
  }
  
  const currentIndex = allStatuses.indexOf(status);
  if (currentIndex === -1) return null; // Unknown status
  
  return (
    <div className="mt-6 pt-4 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Order Timeline</p>
      <div className="relative flex justify-between">
        {/* Track */}
        <div className="absolute top-3.5 left-2 right-2 h-0.5 bg-border -z-10" />
        <div 
          className="absolute top-3.5 left-2 h-0.5 bg-primary -z-10 transition-all duration-500 ease-in-out" 
          style={{ width: `${(currentIndex / (allStatuses.length - 1)) * 100}%` }}
        />
        
        {allStatuses.map((s, i) => {
          const isCompleted = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={s} className="flex flex-col items-center gap-2">
              <div 
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-[10px] transition-colors duration-300",
                  isCompleted 
                    ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20" 
                    : "bg-card border-2 border-border text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : (i + 1)}
              </div>
              <span className={cn(
                "text-[10px] font-medium hidden sm:block",
                isCurrent ? "text-foreground" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"
              )}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Account = () => {
  const currentStore = useOptionalStore();
  const storeId = currentStore?.id;
  const storeName = currentStore?.name ?? "this store";
  const experience = resolveStorefrontOrderExperience(currentStore);
  const { user, loading, signOut } = useAuth();
  const { data: orders, isLoading: ordersLoading } = useMyOrders(storeId);
  const { items: wishlistIds } = useWishlist();
  const { addItem } = useCart();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("orders");
  const LayoutWrapper = storeId ? StorefrontLayout : Layout;

  const handleReorder = (orderItems: any[]) => {
    orderItems.forEach((item) => {
      addItem({
        productId: item.productId,
        name: item.name,
        price: item.price,
        image: item.image,
        size: item.size,
        storeId,
      });
    });
    toast.success("All items from this order have been added to your cart!");
  };
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
    queryKey: ["my-addresses", user?.id, storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("store_id", storeId as string)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data as unknown as Address[];
    },
    enabled: !!user && !!storeId,
  });

  const { data: submittedReviews = [] } = useQuery({
    queryKey: ["my-submitted-reviews", user?.id, storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("product_reviews" as any)
        .select("product_id, order_id, rating, review_text, status, created_at")
        .eq("user_id", user!.id)
        .eq("store_id", storeId as string);
      if (error) throw error;
      return (data as unknown as Array<{ product_id: string; order_id: string; rating: number; review_text: string | null; status: string; created_at: string }>) ?? [];
    },
    enabled: !!user && !!storeId,
  });

  const reviewedSet = new Set(submittedReviews.map((r) => `${r.product_id}__${r.order_id}`));

  const { data: profile } = useQuery({
    queryKey: ["my-store-profile", user?.id, storeId],
    queryFn: async () => {
      if (!user || !storeId) return null;

      const { data: globalProfile, error: globalProfileError } = await supabase
        .from("profiles")
        .select("display_name, email, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (globalProfileError) throw globalProfileError;

      const baseDisplayName =
        globalProfile?.display_name
        || (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null)
        || (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null)
        || user.email?.split("@")[0]
        || "Customer";
      const baseAvatar =
        globalProfile?.avatar_url
        || (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null)
        || (typeof user.user_metadata?.picture === "string" ? user.user_metadata.picture : null)
        || null;
      const basePhone =
        (typeof user.user_metadata?.phone_number === "string" ? user.user_metadata.phone_number : null)
        || user.phone
        || null;
      const baseEmail = globalProfile?.email || user.email || null;

      const { data: existingProfile, error: existingProfileError } = await (supabase as any)
        .from("store_customer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("store_id", storeId)
        .maybeSingle();

      if (existingProfileError) throw existingProfileError;
      if (existingProfile) {
        return existingProfile as StoreCustomerProfile;
      }

      const { data: createdProfile, error: createProfileError } = await (supabase as any)
        .from("store_customer_profiles")
        .upsert({
          store_id: storeId,
          user_id: user.id,
          display_name: baseDisplayName,
          avatar_url: baseAvatar,
          phone: basePhone,
          email: baseEmail,
          status: "active",
        }, { onConflict: "store_id,user_id" })
        .select("*")
        .single();

      if (createProfileError) throw createProfileError;
      return createdProfile as StoreCustomerProfile;
    },
    enabled: !!user && !!storeId,
  });

  // Fetch wishlist products using the optimized hook
  const { data: wishlistProducts = [], isLoading: wishlistLoading } = useProductsByIds(wishlistIds, storeId);

  // Fetch product names for reviews tab
  const reviewProductIds = [...new Set(submittedReviews.map(r => r.product_id))];
  const { data: reviewProducts = [] } = useQuery({
    queryKey: ["review-products", storeId, reviewProductIds],
    queryFn: async () => {
      if (reviewProductIds.length === 0 || !storeId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, image_url")
        .eq("store_id", storeId as string)
        .in("id", reviewProductIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: reviewProductIds.length > 0 && !!storeId,
  });

  const reviewProductMap = new Map(reviewProducts.map(p => [p.id, p]));

  const addAddress = useMutation({
    mutationFn: async (addr: Omit<Address, "id" | "is_default">) => {
      const payload = { ...addr, user_id: user!.id, is_default: addresses.length === 0 };
      const scopedPayload = { ...payload, store_id: storeId };
      const { error } = await supabase
        .from("customer_addresses")
        .insert(scopedPayload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-addresses", user?.id, storeId] });
      setAddingAddress(false);
      setAddressForm({ label: "Home", name: "", phone: "", address: "", city: "" });
      toast.success("Address saved");
    },
    onError: () => toast.error("Failed to save address"),
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      if (!storeId) throw new Error("No store selected");
      const { error } = await supabase.from("customer_addresses").delete().eq("id", id).eq("store_id", storeId as string);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-addresses", user?.id, storeId] });
      toast.success("Address removed");
    },
  });

  const setDefaultAddress = useMutation({
    mutationFn: async (id: string) => {
      if (!storeId) throw new Error("No store selected");
      await supabase
        .from("customer_addresses")
        .update({ is_default: false } as any)
        .eq("user_id", user!.id)
        .eq("store_id", storeId as string);
      const { error } = await supabase
        .from("customer_addresses")
        .update({ is_default: true } as any)
        .eq("id", id)
        .eq("store_id", storeId as string);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-addresses", user?.id, storeId] });
      toast.success("Default address updated");
    },
  });

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={storefrontPath(
          `/auth?next=${encodeURIComponent(storefrontPath("/account", currentStore?.slug))}`,
          currentStore?.slug,
        )}
        replace
      />
    );
  }
  if (!storeId) {
    return (
      <LayoutWrapper>
        <SEOHead title="My Account" description="Manage your account, orders, and addresses." noindex />
        <PageTransition>
          <div className="container mx-auto max-w-3xl px-4 py-12">
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <User className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                <h1 className="mb-2 font-heading text-2xl font-bold text-foreground">Open a storefront account page</h1>
                <p className="text-sm text-muted-foreground">
                  Orders, addresses, wishlist items, and reviews are stored per storefront. Open your account from a specific store to manage them.
                </p>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </LayoutWrapper>
    );
  }

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

  const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: "orders", label: "Orders", icon: Package, count: orders?.length },
    { key: "wishlist", label: "Wishlist", icon: Heart, count: wishlistIds.length },
    { key: "reviews", label: "My Reviews", icon: MessageSquare, count: submittedReviews.length },
    { key: "addresses", label: "Addresses", icon: MapPin, count: addresses.length },
  ];

  const reviewStatusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500",
    approved: "bg-primary/10 text-primary",
    rejected: "bg-destructive/10 text-destructive",
  };

  return (
    <LayoutWrapper>
      <SEOHead title="My Account" description="Manage your account, orders, and addresses." noindex />
      <PageTransition>
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
          {/* Profile Header */}
          <ProfileHeader user={user} profile={profile} storeId={storeId} onSignOut={signOut} />

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 mb-8">
            {[
              { label: "Orders", value: orders?.length ?? 0, icon: Package },
              { label: "Wishlist", value: wishlistIds.length, icon: Heart },
              { label: "Reviews", value: submittedReviews.length, icon: MessageSquare },
              { label: "Addresses", value: addresses.length, icon: MapPin },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="border-border">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <div className="mb-8 flex gap-1 overflow-x-auto border-b border-border scrollbar-none">
            {tabs.map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  tab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {typeof count === "number" && count > 0 && (
                  <span className={cn(
                    "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    tab === key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
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
                  <p className="font-heading text-lg font-semibold text-foreground">{experience.labels.orderListEmptyTitle}</p>
                  <p className="text-sm text-muted-foreground mb-4">Orders you place with {storeName} will appear here.</p>
                  <Button asChild variant="outline">
                    <Link to={storefrontPath("/shop", currentStore?.slug)}>{experience.labels.browseLabel}</Link>
                  </Button>
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
                                    <span className="text-muted-foreground">({getCartVariantDisplayLabel(item.size)})</span>
                                  </span>
                                  <span className="text-muted-foreground">BDT {item.price * item.quantity}</span>
                                </div>

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
                                        <span className="text-xs font-medium">Review submitted, thank you.</span>
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
                                              sizePurchased: getCartVariantDisplayLabel(item.size),
                                            })
                                          }
                                        >
                                          {experience.labels.reviewPromptLabel}
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div className="border-t border-border pt-3 flex items-center justify-between font-heading font-bold text-foreground">
                            <span>{experience.labels.totalLabel}: BDT {order.total}</span>
                            {isDelivered && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground font-semibold"
                                onClick={() => handleReorder(order.items)}
                              >
                                <ShoppingBag className="h-3.5 w-3.5" /> {experience.labels.reorderLabel}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Wishlist Tab */}
          {tab === "wishlist" && (
            <div>
              {wishlistLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : wishlistProducts.length === 0 ? (
                <div className="py-12 text-center">
                  <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                  <p className="font-heading text-lg font-semibold text-foreground">Your wishlist is empty</p>
                  <p className="text-sm text-muted-foreground mb-4">Save products from {storeName} to revisit them later.</p>
                  <Button asChild variant="outline">
                    <Link to={storefrontPath("/shop", currentStore?.slug)}>Browse Products</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {wishlistProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {tab === "reviews" && (
            <div className="space-y-4">
              {submittedReviews.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                  <p className="font-heading text-lg font-semibold text-foreground">No reviews yet</p>
                  <p className="text-sm text-muted-foreground">Reviews you leave for {storeName} products will appear here.</p>
                </div>
              ) : (
                submittedReviews
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((review, i) => {
                    const product = reviewProductMap.get(review.product_id);
                    return (
                      <Card key={i} className="border-border">
                        <CardContent className="flex gap-4 p-4">
                          {product && (
                            <Link to={productUrl(product.id, product.name, currentStore?.slug)} className="flex-shrink-0">
                              <div className="h-16 w-16 overflow-hidden rounded-lg border border-border">
                                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                              </div>
                            </Link>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {product?.name || "Product"}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        s <= review.rating ? "fill-primary text-primary" : "text-border"
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                              <Badge className={cn("text-[10px] capitalize", reviewStatusColors[review.status] || "bg-secondary text-foreground")}>
                                {review.status}
                              </Badge>
                            </div>
                            {review.review_text && (
                              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{review.review_text}</p>
                            )}
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString("en-US", {
                                year: "numeric", month: "short", day: "numeric",
                              })}
                            </p>
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
    </LayoutWrapper>
  );
};

export default Account;
