import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Package, Printer, Truck, Loader2, RefreshCw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth-context";
import { useSearchParams } from "@/lib/react-router-dom-shim";
import {
  fetchAdminOrderDetail,
  useAdminOrders,
  useAdminOrdersCount,
  useUpdateOrderStatus,
  type AdminOrderListItem,
  type Order,
} from "@/hooks/useOrders";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useBookCourierShipment, useCourierConnections, useOrderShipments } from "@/hooks/useCouriers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCourierConnectionLabel, getCourierProviderLabel, type CourierProvider } from "@/lib/couriers/shared";
import ReturnsOperationsPage from "./ReturnsOperations";
import CouriersPage from "./Couriers";

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

export default function AdminOrders() {
  const { activeStoreId } = useAuth();
  const activeStoreIdRef = useRef(activeStoreId);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "orders";

  const { data: courierConnections = [] } = useCourierConnections(activeStoreId);
  const { data: shipments = [] } = useOrderShipments(activeStoreId);
  const bookCourierShipment = useBookCourierShipment(activeStoreId);

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
  const debouncedSearch = useDebouncedValue(search, 300);
  const orderPages = useAdminOrders(activeStoreId, { search: debouncedSearch, status: filterStatus });
  const orders = orderPages.data?.pages.flatMap((page) => page.items) ?? [];
  const orderCountQuery = useAdminOrdersCount(activeStoreId);
  const orderCount = orderCountQuery.data ?? 0;
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [bookingOrder, setBookingOrder] = useState<Order | null>(null);
  const [bookingConnectionId, setBookingConnectionId] = useState("");
  const [bookingWeight, setBookingWeight] = useState("0.5");
  const [bookingQuantity, setBookingQuantity] = useState("1");
  const [bookingDescription, setBookingDescription] = useState("");
  const [bookingInstruction, setBookingInstruction] = useState("");
  const [bookingAmountToCollect, setBookingAmountToCollect] = useState("0");
  const [bookingShippingFee, setBookingShippingFee] = useState("0");
  const [loadingOrderAction, setLoadingOrderAction] = useState<string | null>(null);

  useEffect(() => {
    activeStoreIdRef.current = activeStoreId;
    setSearch("");
    setFilterStatus("all");
    setViewOrder(null);
    setBookingOrder(null);
    setBookingConnectionId("");
    setLoadingOrderAction(null);
  }, [activeStoreId]);

  const connectedCouriers = useMemo(
    () => courierConnections.filter((connection) => connection.status === "configured"),
    [courierConnections],
  );
  const selectedBookingConnection = useMemo(
    () => connectedCouriers.find((connection) => connection.id === bookingConnectionId) ?? null,
    [bookingConnectionId, connectedCouriers],
  );

  const shipmentsByOrder = useMemo(() => {
    const map = new Map<string, typeof shipments>();
    shipments.forEach((shipment) => {
      const current = map.get(shipment.order_id) ?? [];
      current.push(shipment);
      map.set(shipment.order_id, current);
    });
    return map;
  }, [shipments]);

  const hasOrderFilters = search.trim().length > 0 || filterStatus !== "all";
  const workspaceDescription = activeTab === "returns"
    ? "Handle return requests and COD follow-up."
    : activeTab === "couriers"
      ? "Manage courier connections, bookings and shipment progress."
      : "Review incoming orders and move fulfillment forward.";

  const clearOrderFilters = () => {
    setSearch("");
    setFilterStatus("all");
  };

  const handleStatusChange = (orderId: string, status: string) => {
    updateStatus.mutate(
      { orderId, status, storeId: activeStoreId ?? undefined },
      { onSuccess: () => toast.success(`Order updated to ${status}`) },
    );
  };

  const openViewOrder = async (order: AdminOrderListItem) => {
    if (!activeStoreId) return;
    const storeId = activeStoreId;
    setLoadingOrderAction(`view:${order.id}`);
    try {
      const detail = await fetchAdminOrderDetail(storeId, order.id);
      if (activeStoreIdRef.current !== storeId) return;
      setViewOrder(detail);
    } catch (error) {
      console.error("Failed to load order detail:", error);
      toast.error("Could not load this order.");
    } finally {
      setLoadingOrderAction(null);
    }
  };

  const openBookingDialog = async (orderOrId: AdminOrderListItem | Order) => {
    if (!activeStoreId) return;
    const storeId = activeStoreId;
    const orderId = orderOrId.id;
    setLoadingOrderAction(`book:${orderId}`);
    try {
      const order = "items" in orderOrId ? orderOrId : await fetchAdminOrderDetail(storeId, orderId);
      if (activeStoreIdRef.current !== storeId) return;
      const itemQuantity = order.items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity ?? 1)), 0);
      const itemDescription = order.items.map((item) => item.name).filter(Boolean).slice(0, 3).join(", ");
      setBookingOrder(order);
      setBookingConnectionId(connectedCouriers[0]?.id ?? "");
      setBookingWeight("0.5");
      setBookingQuantity(String(itemQuantity || 1));
      setBookingDescription(itemDescription || `Order ${order.order_number}`);
      setBookingInstruction("");
      setBookingAmountToCollect(/cod/i.test(order.payment_method) ? String(order.total) : "0");
      setBookingShippingFee(String(order.delivery_fee));
    } catch (error) {
      console.error("Failed to prepare courier booking:", error);
      toast.error("Could not load this order for courier booking.");
    } finally {
      setLoadingOrderAction(null);
    }
  };

  const submitBooking = async () => {
    if (!bookingOrder || !bookingConnectionId) {
      toast.error("Choose a courier connection first.");
      return;
    }

    try {
      await bookCourierShipment.mutateAsync({
        orderId: bookingOrder.id,
        connectionId: bookingConnectionId,
        booking: {
          itemWeightKg: Number(bookingWeight),
          itemQuantity: Number(bookingQuantity),
          itemDescription: bookingDescription,
          specialInstruction: bookingInstruction,
          amountToCollect: Number(bookingAmountToCollect),
          shippingFee: Number(bookingShippingFee),
        },
      });
      toast.success("Courier booking created.");
      setBookingOrder(null);
      setBookingConnectionId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create courier booking.");
    }
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
          ${order.manual_payment_provider && order.manual_payment_reference ? `<div class="notes"><strong>Manual Payment Reference:</strong><br>${order.manual_payment_provider === "bkash" ? "bKash" : "Nagad"}: ${order.manual_payment_reference}</div>` : ""}
          ${order.notes ? `<div class="notes"><strong>Notes:</strong><br>${order.notes}</div>` : ""}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      window.setTimeout(() => {
        printWindow.close();
      }, 500);
    };
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-bold text-foreground">Orders & Fulfillment</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Review {orderCount} {orderCount === 1 ? "order" : "orders"}, update fulfillment, and hand deliveries to your courier.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val }, { replace: true })} className="space-y-6">
        <div className="space-y-2 sm:hidden">
          <Label htmlFor="orders-workspace" className="text-sm font-semibold text-foreground">
            Orders workspace
          </Label>
          <Select value={activeTab} onValueChange={(val) => setSearchParams({ tab: val }, { replace: true })}>
            <SelectTrigger id="orders-workspace" className="min-h-14 w-full rounded-xl border-border bg-card px-4 text-left font-medium shadow-sm">
              <SelectValue placeholder="Choose a workspace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="orders">All Orders</SelectItem>
              <SelectItem value="returns">Returns & COD</SelectItem>
              <SelectItem value="couriers">Couriers & Shipping</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs leading-5 text-muted-foreground">{workspaceDescription}</p>
        </div>

        <TabsList className="hidden h-auto w-auto grid-cols-3 gap-1 border border-border bg-secondary/40 p-1 sm:grid">
          <TabsTrigger value="orders" className="min-h-11 gap-2 px-4">
            <ShoppingBag className="h-4 w-4" />
            All Orders
          </TabsTrigger>
          <TabsTrigger value="returns" className="min-h-11 gap-2 px-4">
            <RefreshCw className="h-4 w-4" />
            Returns & COD
          </TabsTrigger>
          <TabsTrigger value="couriers" className="min-h-11 gap-2 px-4">
            <Truck className="h-4 w-4" />
            Couriers & Shipping
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div>
              <Label htmlFor="order-search" className="sr-only">Search orders</Label>
              <Input
                id="order-search"
                placeholder="Search order #, customer, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-11 w-full"
              />
            </div>
            <div>
              <Label htmlFor="order-status-filter" className="sr-only">Filter by status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="order-status-filter" className="min-h-11 w-full">
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
          </div>

          {!orderPages.isLoading && orders.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Showing {orders.length} {orders.length === 1 ? "order" : "orders"}{filterStatus !== "all" ? ` with ${filterStatus} status` : ""}
              </span>
              {hasOrderFilters ? (
                <Button type="button" variant="ghost" size="sm" className="min-h-11 px-3" onClick={clearOrderFilters}>
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : null}

          {orderPages.isLoading && orders.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="p-4 sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                        <Skeleton className="h-3 w-44" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3 lg:flex">
                        <Skeleton className="h-11 w-full sm:w-[150px]" />
                        <Skeleton className="h-11 w-full sm:w-32" />
                        <Skeleton className="h-11 w-full sm:w-32" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-16 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-heading text-base font-semibold text-foreground">
                {hasOrderFilters ? "No matching orders" : "No orders yet"}
              </p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                {hasOrderFilters
                  ? "Try another order number, customer, phone number, or status."
                  : "New storefront orders will appear here as soon as customers place them."}
              </p>
              {hasOrderFilters ? (
                <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={clearOrderFilters}>
                  Clear search and filters
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const firstShipment = (shipmentsByOrder.get(order.id) ?? [])[0];
                return (
                  <Card key={order.id} className="border-border transition-colors hover:border-primary/30">
                    <CardContent className="p-4 sm:p-5">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-heading text-sm font-bold text-foreground">{order.order_number}</p>
                            <Badge className={statusColors[order.status] || "bg-secondary"}>
                              {order.status}
                            </Badge>
                            {firstShipment ? (
                              <Badge variant="outline" className="font-normal text-muted-foreground">
                                {firstShipment.courier_connection_label?.trim() || getCourierProviderLabel(firstShipment.provider as CourierProvider)} · {firstShipment.status}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="font-medium text-foreground">{order.customer_name}</span>
                            <span className="text-muted-foreground">{order.customer_phone}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                            <span className="font-semibold text-foreground">{formatCurrency(order.total)}</span>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,auto)_minmax(0,auto)] lg:flex lg:items-center">
                          <div>
                            <Label htmlFor={`order-status-${order.id}`} className="mb-1 block text-xs font-medium text-muted-foreground sm:sr-only">
                              Order status
                            </Label>
                            <Select value={order.status} onValueChange={(v) => handleStatusChange(order.id, v)}>
                              <SelectTrigger id={`order-status-${order.id}`} className="min-h-11 w-full text-xs sm:w-[150px]">
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
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11 gap-2"
                            onClick={() => void openBookingDialog(order)}
                            disabled={connectedCouriers.length === 0 || loadingOrderAction === `book:${order.id}`}
                          >
                            {loadingOrderAction === `book:${order.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                            Book courier
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            className="min-h-11 gap-2"
                            onClick={() => void openViewOrder(order)}
                            disabled={loadingOrderAction === `view:${order.id}`}
                          >
                            {loadingOrderAction === `view:${order.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                            Review order
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {orderPages.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => void orderPages.fetchNextPage()}
                disabled={orderPages.isFetchingNextPage}
                className="min-h-11 gap-2"
              >
                {orderPages.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Load more orders
              </Button>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <ReturnsOperationsPage />
        </TabsContent>

        <TabsContent value="couriers" className="space-y-4">
          <CouriersPage />
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewOrder} onOpenChange={(open) => !open && setViewOrder(null)}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span>{viewOrder?.order_number}</span>
              {viewOrder ? <Badge className={statusColors[viewOrder.status] || "bg-secondary"}>{viewOrder.status}</Badge> : null}
            </DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
                  <p className="mt-2 font-medium text-foreground">{viewOrder.customer_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{viewOrder.customer_phone}</p>
                  {viewOrder.customer_email && (
                    <p className="mt-0.5 break-all text-xs text-muted-foreground">{viewOrder.customer_email}</p>
                  )}
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipping</p>
                  <p className="mt-2 font-medium text-foreground">{viewOrder.shipping_address}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{viewOrder.shipping_city}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="mb-3 text-sm font-medium text-foreground">Items</p>
                <div className="space-y-2">
                  {viewOrder.items.map((item, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0">{item.name} x {item.quantity} ({item.size})</span>
                      <span className="shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t border-border pt-3 font-bold text-foreground">
                  <span>Total</span>
                  <span>{formatCurrency(viewOrder.total)}</span>
                </div>
              </div>

              <div className="rounded-lg bg-secondary/40 px-3 py-2.5 text-xs text-muted-foreground">
                Payment: <span className="font-semibold text-foreground">{viewOrder.payment_method.toUpperCase()}</span>
                <span className="mx-2">·</span>
                Placed: <span className="font-semibold text-foreground">{new Date(viewOrder.created_at).toLocaleString()}</span>
              </div>

              {(shipmentsByOrder.get(viewOrder.id) ?? []).length > 0 ? (
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Courier bookings</p>
                  <div className="space-y-2">
                    {(shipmentsByOrder.get(viewOrder.id) ?? []).map((shipment) => (
                      <div key={shipment.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline">
                          {shipment.courier_connection_label?.trim() || getCourierProviderLabel(shipment.provider as CourierProvider)}
                        </Badge>
                        <Badge variant="secondary">{shipment.status}</Badge>
                        <span className="break-all text-muted-foreground">{shipment.tracking_number || shipment.consignment_id || "Tracking pending"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {viewOrder.manual_payment_provider && viewOrder.manual_payment_reference ? (
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <p className="mb-1 text-xs font-semibold text-foreground">Manual Payment Reference</p>
                  <p className="text-sm text-foreground">
                    {viewOrder.manual_payment_provider === "bkash" ? "bKash" : "Nagad"}: {viewOrder.manual_payment_reference}
                  </p>
                </div>
              ) : null}

              {viewOrder.notes && (
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <p className="mb-1 text-xs font-semibold text-foreground">Customer Notes:</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{viewOrder.notes}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => void openBookingDialog(viewOrder)}
                  className="min-h-11 gap-2"
                  disabled={connectedCouriers.length === 0 || loadingOrderAction === `book:${viewOrder.id}`}
                >
                  {loadingOrderAction === `book:${viewOrder.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  Book Courier
                </Button>
                <Button onClick={() => handlePrintInvoice(viewOrder)} className="min-h-11 gap-2">
                  <Printer className="h-4 w-4" /> Print Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!bookingOrder} onOpenChange={(open) => !open && setBookingOrder(null)}>
        <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book courier for {bookingOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {bookingOrder ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-background/60 p-4 text-sm">
                <p className="font-medium text-foreground">{bookingOrder.customer_name}</p>
                <p className="text-muted-foreground">{bookingOrder.customer_phone}</p>
                <p className="text-muted-foreground">{bookingOrder.shipping_address}, {bookingOrder.shipping_city}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-connection">Courier connection</Label>
                <Select value={bookingConnectionId} onValueChange={setBookingConnectionId}>
                  <SelectTrigger id="booking-connection" className="min-h-11">
                    <SelectValue placeholder="Choose a configured courier" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectedCouriers.map((connection) => (
                      <SelectItem key={connection.id} value={connection.id}>
                        {formatCourierConnectionLabel({
                          provider: connection.provider,
                          displayName: connection.displayName,
                          zoneLabel: connection.settingsSummary.zoneLabel,
                          serviceAreaName: connection.settingsSummary.serviceAreaName,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBookingConnection ? (
                  <p className="text-xs text-muted-foreground">
                    Booking through {formatCourierConnectionLabel({
                      provider: selectedBookingConnection.provider,
                      displayName: selectedBookingConnection.displayName,
                      zoneLabel: selectedBookingConnection.settingsSummary.zoneLabel,
                      serviceAreaName: selectedBookingConnection.settingsSummary.serviceAreaName,
                    })}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="booking-weight">Item weight (kg)</Label>
                  <Input id="booking-weight" inputMode="decimal" className="min-h-11" value={bookingWeight} onChange={(event) => setBookingWeight(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking-quantity">Item quantity</Label>
                  <Input id="booking-quantity" inputMode="numeric" className="min-h-11" value={bookingQuantity} onChange={(event) => setBookingQuantity(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking-collect">Amount to collect</Label>
                  <Input id="booking-collect" inputMode="decimal" className="min-h-11" value={bookingAmountToCollect} onChange={(event) => setBookingAmountToCollect(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking-fee">Shipping fee</Label>
                  <Input id="booking-fee" inputMode="decimal" className="min-h-11" value={bookingShippingFee} onChange={(event) => setBookingShippingFee(event.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-description">Item description</Label>
                <Input id="booking-description" className="min-h-11" value={bookingDescription} onChange={(event) => setBookingDescription(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-instruction">Special instruction</Label>
                <Input id="booking-instruction" className="min-h-11" value={bookingInstruction} onChange={(event) => setBookingInstruction(event.target.value)} placeholder="Optional delivery note" />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setBookingOrder(null)}>
                  Cancel
                </Button>
                <Button type="button" className="min-h-11" onClick={() => void submitBooking()} disabled={bookCourierShipment.isPending || connectedCouriers.length === 0}>
                  {bookCourierShipment.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <Truck className="mr-2 h-4 w-4" />
                      Create booking
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
