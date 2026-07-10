import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Package, Printer } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth-context";
import { useAllOrders, useUpdateOrderStatus, type Order } from "@/hooks/useOrders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  confirmed: "bg-blue-500/10 text-blue-500",
  processing: "bg-purple-500/10 text-purple-500",
  shipped: "bg-indigo-500/10 text-indigo-500",
  delivered: "bg-primary/10 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
};

const formatCurrency = (amount: number) => `BDT ${amount.toLocaleString("en-BD")}`;

const AdminOrders = () => {
  const { activeStoreId } = useAuth();
  const { data: orders, isLoading } = useAllOrders(activeStoreId);
  const { data: activeStore } = useQuery({
    queryKey: ["admin-orders-store", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return null;
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await (supabase as any)
        .from("stores")
        .select("name")
        .eq("id", activeStoreId)
        .maybeSingle();
      return data;
    },
    enabled: !!activeStoreId,
  });
  const updateStatus = useUpdateOrderStatus();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const filtered = (orders || []).filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone.includes(search);
    const matchesStatus = filterStatus === "all" || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (orderId: string, status: string) => {
    updateStatus.mutate(
      { orderId, status, storeId: activeStoreId ?? undefined },
      { onSuccess: () => toast.success(`Order updated to ${status}`) },
    );
  };

  const handlePrintInvoice = (order: Order) => {
    const storeName = activeStore?.name?.trim() || "Store";
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const lineItems = order.items
      .map(
        (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.size}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.price)}</td>
                  <td>${formatCurrency(item.price * item.quantity)}</td>
                </tr>
              `,
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Invoice - ${order.order_number}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #111; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .brand { font-size: 24px; font-weight: bold; }
            .invoice-title { font-size: 24px; color: #666; }
            .grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #f9f9f9; }
            .total-row { font-weight: bold; font-size: 18px; }
            .notes { margin-top: 40px; padding: 15px; background: #f9f9f9; border-radius: 4px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">${storeName}</div>
            <div class="invoice-title">INVOICE</div>
          </div>
          <div class="grid">
            <div>
              <strong>Billed To:</strong><br>
              ${order.customer_name}<br>
              ${order.customer_phone}<br>
              ${order.customer_email || ""}
            </div>
            <div>
              <strong>Shipping Address:</strong><br>
              ${order.shipping_address}<br>
              ${order.shipping_city}
            </div>
            <div style="text-align: right;">
              <strong>Order Number:</strong> ${order.order_number}<br>
              <strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}<br>
              <strong>Payment:</strong> ${order.payment_method.toUpperCase()}<br>
              <strong>Status:</strong> ${order.status.toUpperCase()}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Size</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItems}
              <tr>
                <td colspan="3"></td>
                <td>Delivery Fee</td>
                <td>${formatCurrency(order.delivery_fee)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3"></td>
                <td>Grand Total</td>
                <td>${formatCurrency(order.total)}</td>
              </tr>
            </tbody>
          </table>
          ${order.notes ? `<div class="notes"><strong>Notes / TrxID:</strong><br>${order.notes}</div>` : ""}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground">{orders?.length ?? 0} total orders</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by order #, name, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-[140px]" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package className="mb-4 h-12 w-12" />
          <p>No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Card key={order.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-heading text-sm font-bold text-foreground">{order.order_number}</p>
                      <Badge className={statusColors[order.status] || "bg-secondary"}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.customer_name} · {order.customer_phone}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()} · {order.items.length} item(s) · {formatCurrency(order.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={order.status}
                      onValueChange={(v) => handleStatusChange(order.id, v)}
                    >
                      <SelectTrigger className="h-9 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setViewOrder(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewOrder} onOpenChange={(open) => !open && setViewOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium text-foreground">{viewOrder.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{viewOrder.customer_phone}</p>
                  {viewOrder.customer_email && (
                    <p className="text-xs text-muted-foreground">{viewOrder.customer_email}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Shipping</p>
                  <p className="font-medium text-foreground">{viewOrder.shipping_address}</p>
                  <p className="text-xs text-muted-foreground">{viewOrder.shipping_city}</p>
                </div>
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-sm font-medium text-foreground">Items</p>
                {viewOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity} ({item.size})</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground">
                  <span>Total</span>
                  <span>{formatCurrency(viewOrder.total)}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Payment: {viewOrder.payment_method.toUpperCase()} ·{" "}
                Placed: {new Date(viewOrder.created_at).toLocaleString()}
              </div>
              {viewOrder.notes && (
                <div className="mt-4 rounded-md border border-border bg-secondary/50 p-3">
                  <p className="mb-1 text-xs font-semibold text-foreground">Customer Notes / TrxID:</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{viewOrder.notes}</p>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <Button onClick={() => handlePrintInvoice(viewOrder)} className="gap-2">
                  <Printer className="h-4 w-4" /> Print Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
