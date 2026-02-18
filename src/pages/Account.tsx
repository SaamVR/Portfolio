import { useState } from "react";
import { Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrders, type Order } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2, Package, MapPin, LogOut, Plus, Trash2, Star,
} from "lucide-react";
import { z } from "zod";

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

const Account = () => {
  const { user, loading, signOut } = useAuth();
  const { data: orders, isLoading: ordersLoading } = useMyOrders();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"orders" | "addresses">("orders");
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({ label: "Home", name: "", phone: "", address: "", city: "" });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

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
      // Unset all defaults first
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
                orders.map((order: Order) => (
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
                      <div className="space-y-2">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-foreground">
                              {item.name} × {item.quantity} <span className="text-muted-foreground">({item.size})</span>
                            </span>
                            <span className="text-muted-foreground">৳{item.price * item.quantity}</span>
                          </div>
                        ))}
                        <div className="border-t border-border pt-2 flex justify-between font-heading font-bold text-foreground">
                          <span>Total</span>
                          <span>৳{order.total}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
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
    </Layout>
  );
};

export default Account;
