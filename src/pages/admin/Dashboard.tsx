import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, Users } from "lucide-react";

const Dashboard = () => {
  const { role } = useAuth();
  const [stats, setStats] = useState({ total: 0, outOfStock: 0, featured: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: products } = await supabase.from("products").select("id, stock, featured, is_available");
      if (products) {
        setStats({
          total: products.length,
          outOfStock: products.filter((p) => p.stock <= 0).length,
          featured: products.filter((p) => p.featured).length,
        });
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Total Products", value: stats.total, icon: Package, color: "text-primary" },
    { title: "Out of Stock", value: stats.outOfStock, icon: AlertTriangle, color: "text-destructive" },
    { title: "Featured", value: stats.featured, icon: TrendingUp, color: "text-accent" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          {role === "admin" ? "Full admin access" : "Product management access"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
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
    </div>
  );
};

export default Dashboard;
