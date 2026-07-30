"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BellRing, HardDriveDownload, Mail, MessageSquare, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/lib/react-router-dom-shim";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

type ActivityItem = {
  id: string;
  created_at: string;
  title: string;
  detail: string;
  href: string;
  kind: "order" | "message" | "review" | "notification" | "backup";
  tone?: "default" | "secondary" | "destructive" | "outline";
  badge: string;
};

const iconMap = {
  order: ShoppingCart,
  message: Mail,
  review: MessageSquare,
  notification: BellRing,
  backup: HardDriveDownload,
} as const;

function formatActivityDate(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StoreActivityTimeline({ storeId }: { storeId?: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["store-activity-timeline", storeId],
    enabled: Boolean(storeId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [
        ordersResult,
        messagesResult,
        reviewsResult,
        notificationsResult,
        backupResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, customer_name, created_at")
          .eq("store_id", storeId as string)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("contact_messages")
          .select("id, name, is_read, created_at")
          .eq("store_id", storeId as string)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("product_reviews" as any)
          .select("id, author_name, status, created_at")
          .eq("store_id", storeId as string)
          .order("created_at", { ascending: false })
          .limit(5),
        (supabase as any)
          .from("notification_events")
          .select("id, template_name, status, created_at")
          .eq("store_id", storeId as string)
          .order("created_at", { ascending: false })
          .limit(5),
        (supabase as any)
          .from("store_backup_events")
          .select("id, action, format, created_at")
          .eq("store_id", storeId as string)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (messagesResult.error) throw messagesResult.error;
      if (reviewsResult.error) throw reviewsResult.error;
      if (notificationsResult.error) throw notificationsResult.error;
      if (backupResult.error) throw backupResult.error;

      return {
        orders: ordersResult.data ?? [],
        messages: messagesResult.data ?? [],
        reviews: reviewsResult.data ?? [],
        notifications: notificationsResult.data ?? [],
        backups: backupResult.data ?? [],
      };
    },
  });

  const items = useMemo<ActivityItem[]>(() => {
    if (!data) return [];

    const orderItems: ActivityItem[] = data.orders.map((order: any) => ({
      id: `order-${order.id}`,
      created_at: order.created_at,
      title: `Order ${order.order_number || "received"}`,
      detail: `${order.customer_name || "A customer"} placed an order with status ${order.status || "unknown"}.`,
      href: "/admin/orders",
      kind: "order",
      tone: "outline",
      badge: order.status || "order",
    }));

    const messageItems: ActivityItem[] = data.messages.map((message: any) => ({
      id: `message-${message.id}`,
      created_at: message.created_at,
      title: message.is_read ? "Customer message reviewed" : "New customer message",
      detail: `${message.name || "A visitor"} sent a contact message.`,
      href: "/admin/messages",
      kind: "message",
      tone: message.is_read ? "outline" : "default",
      badge: message.is_read ? "read" : "new",
    }));

    const reviewItems: ActivityItem[] = data.reviews.map((review: any) => ({
      id: `review-${review.id}`,
      created_at: review.created_at,
      title: review.status === "pending" ? "Review awaiting moderation" : "Review moderation updated",
      detail: `${review.author_name || "A customer"} left a ${review.status || "pending"} review.`,
      href: "/admin/reviews",
      kind: "review",
      tone: review.status === "pending" ? "secondary" : "outline",
      badge: review.status || "review",
    }));

    const notificationItems: ActivityItem[] = data.notifications.map((event: any) => ({
      id: `notification-${event.id}`,
      created_at: event.created_at,
      title: event.status === "failed" ? "Notification delivery failed" : "Notification activity recorded",
      detail: `${event.template_name || "Notification event"} is marked ${event.status || "unknown"}.`,
      href: "/admin/notifications",
      kind: "notification",
      tone: event.status === "failed" ? "destructive" : "outline",
      badge: event.status || "event",
    }));

    const backupItems: ActivityItem[] = data.backups.map((event: any) => ({
      id: `backup-${event.id}`,
      created_at: event.created_at,
      title: event.action === "import" ? "Backup restore completed" : "Backup export created",
      detail: `${String(event.action || "backup")} finished in ${String(event.format || "unknown").toUpperCase()} format.`,
      href: "/admin/backup",
      kind: "backup",
      tone: "outline",
      badge: event.action || "backup",
    }));

    return [...orderItems, ...messageItems, ...reviewItems, ...notificationItems, ...backupItems]
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, 8);
  }, [data]);

  if (!storeId) return null;

  if (!isLoading && items.length === 0) {
    return (
      <AdminEmptyState
        icon={BellRing}
        title="No recent operator activity yet"
        description="Orders, messages, notification events, and backup actions will appear here once the store starts moving."
        helper="This gives merchants and operators one trusted place to answer: what changed recently?"
        compact
      />
    );
  }

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Operator-relevant events across orders, customer messages, reviews, notifications, and backups.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="py-4 text-sm text-muted-foreground">Loading recent activity...</div>
        ) : items.map((item) => {
          const Icon = iconMap[item.kind];
          return (
            <Link
              key={item.id}
              to={item.href}
              className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4 transition-colors hover:border-primary/30 hover:bg-background"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <Badge variant={item.tone ?? "outline"}>{item.badge}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">{formatActivityDate(item.created_at)}</p>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
