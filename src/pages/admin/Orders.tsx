import { useState } from "react";
import { useAllOrders, useUpdateOrderStatus, type Order } from "@/hooks/useOrders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Package, Eye } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  confirmed: "bg-blue-500/10 text-blue-500",
  processing: "bg-purple-500/10 text-purple-500",
  shipped: "bg-indigo-500/10 text-indigo-500",
  delivered: "bg-primary/10 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
};

const AdminOrders = () => {
  const { data: orders, isLoading } = useAllOrders();
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
      { orderId, status },
      { onSuccess: () => toast.success(`Order updated to ${status}`) }
    );
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
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                      {new Date(order.created_at).toLocaleDateString()} · {order.items.length} item(s) · ৳{order.total}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={order.status}
                      onValueChange={(v) => handleStatusChange(order.id, v)}
                    >
                      <SelectTrigger className="w-[140px] h-9 text-xs">
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

      {/* Order Detail Dialog */}
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
                    <span>৳{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                  <span>Total</span>
                  <span>৳{viewOrder.total}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Payment: {viewOrder.payment_method.toUpperCase()} ·{" "}
                Placed: {new Date(viewOrder.created_at).toLocaleString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
