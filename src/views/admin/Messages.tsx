import { useAuth } from "@/hooks/auth-context";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MailOpen, Trash2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { toast } from "sonner";
import { format } from "date-fns";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const Messages = () => {
  const { activeStoreId } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-messages", activeStoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .eq("store_id", activeStoreId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContactMessage[];
    },
    enabled: Boolean(activeStoreId),
  });

  const markRead = useMutation({
    mutationFn: async ({ id, is_read }: { id: string; is_read: boolean }) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ is_read } as any)
        .eq("id", id)
        .eq("store_id", activeStoreId as string);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-messages", activeStoreId] }),
        queryClient.invalidateQueries({ queryKey: ["unread-messages-count", activeStoreId] }),
      ]);
    },
  });

  useEffect(() => {
    setExpanded(null);
  }, [activeStoreId]);

  const handleExpand = (msg: ContactMessage) => {
    if (expanded === msg.id) {
      setExpanded(null);
    } else {
      setExpanded(msg.id);
      if (!msg.is_read) {
        markRead.mutate({ id: msg.id, is_read: true });
      }
    }
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">
            Customer inquiries from the contact form
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {isLoading && messages.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <AdminEmptyState
          icon={Mail}
          title="No messages yet"
          description="Customer contact form submissions will appear here once shoppers start reaching out."
          helper="A published contact page, support email, or WhatsApp link usually helps the first real conversations start sooner."
          actions={activeStoreId ? [
            { label: "Open site settings", href: `/admin/site-settings?storeId=${encodeURIComponent(activeStoreId)}&tab=contact` },
            { label: "Preview store", href: `/admin/onboarding?storeId=${encodeURIComponent(activeStoreId)}&guide=continue`, variant: "outline" },
          ] : []}
        />
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg border transition-all duration-200 ${
                !msg.is_read ? "border-primary/30 bg-primary/5" : "border-border bg-card"
              }`}
            >
              {/* Header row */}
              <button
                className="flex w-full items-center gap-4 p-4 text-left"
                onClick={() => handleExpand(msg)}
              >
                <div className="flex-shrink-0">
                  {msg.is_read ? (
                    <MailOpen className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Mail className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-foreground">{msg.name}</span>
                    {!msg.is_read && (
                      <Badge variant="default" className="h-4 px-1.5 text-[10px]">New</Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{msg.email}</p>
                  <p className="mt-0.5 truncate text-sm text-foreground/70">{msg.message}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(msg.created_at), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(msg.created_at), "h:mm a")}
                  </p>
                </div>
              </button>

              {/* Expanded content */}
              {expanded === msg.id && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <div className="mb-3 flex items-center justify-between">
                    <a
                      href={`mailto:${msg.email}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Reply to {msg.email}
                    </a>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => markRead.mutate({ id: msg.id, is_read: !msg.is_read })}
                        disabled={markRead.isPending}
                      >
                        {msg.is_read ? (
                          <><Mail className="h-3 w-3" /> Mark Unread</>
                        ) : (
                          <><MailOpen className="h-3 w-3" /> Mark Read</>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-background p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{msg.message}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
