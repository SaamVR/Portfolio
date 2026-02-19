import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Clock,
  ArrowRight,
  Eye,
} from "lucide-react";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  customer_name: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  pending_payment: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  processing: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  shipped: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  delivered: "bg-green-500/10 text-green-600 border-green-500/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const Dashboard = () => {
  const { role } = useAuth();
  const [productStats, setProductStats] = useState({ total: 0, outOfStock: 0, featured: 0 });
  const [orderStats, setOrderStats] = useState({ total: 0, revenue: 0, pending: 0 });
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: products }, { data: orders }] = await Promise.all([
        supabase.from("products").select("id, stock, featured"),
        supabase.from("orders").select("id, order_number, status, total, customer_name, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      if (products) {
        setProductStats({
          total: products.length,
          outOfStock: products.filter((p) => p.stock <= 0).length,
          featured: products.filter((p) => p.featured).length,
        });
      }

      if (orders) {
        const typedOrders = orders as unknown as OrderRow[];
        setRecentOrders(typedOrders.slice(0, 5));
        setOrderStats({
          total: typedOrders.length,
          revenue: typedOrders
            .filter((o) => o.status !== "cancelled")
            .reduce((sum, o) => sum + (o.total || 0), 0),
          pending: typedOrders.filter((o) => o.status === "pending" || o.status === "pending_payment").length,
        });
      }
    };
    fetchAll();
  }, []);

  const statCards = [
    { title: "Total Orders", value: orderStats.total, icon: ShoppingCart, color: "text-primary" },
    { title: "Revenue", value: `৳${orderStats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-green-500" },
    { title: "Pending", value: orderStats.pending, icon: Clock, color: "text-yellow-500" },
    { title: "Products", value: productStats.total, icon: Package, color: "text-accent" },
    { title: "Out of Stock", value: productStats.outOfStock, icon: AlertTriangle, color: "text-destructive" },
    { title: "Featured", value: productStats.featured, icon: TrendingUp, color: "text-primary" },
  ];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          {role === "admin" ? "Full admin access" : "Product management access"}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Manage Products", to: "/admin/products", icon: Package },
          { label: "View Orders", to: "/admin/orders", icon: ShoppingCart },
          { label: "Site Settings", to: "/admin/site-settings", icon: TrendingUp, adminOnly: true },
        ]
          .filter((a) => !a.adminOnly || role === "admin")
          .map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <action.icon className="h-4 w-4 text-primary" />
              {action.label}
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
      </div>

      {/* Recent orders */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Orders</CardTitle>
          <Link to="/admin/orders" className="flex items-center gap-1 text-xs text-primary hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {order.order_number}
                      </span>
                      <Badge variant="outline" className={statusColors[order.status] || "border-border text-muted-foreground"}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {order.customer_name} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <span className="ml-4 whitespace-nowrap font-heading text-sm font-bold text-foreground">
                    ৳{order.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
