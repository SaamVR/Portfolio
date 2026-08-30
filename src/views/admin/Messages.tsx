import { useAuth } from "@/hooks/auth-context";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MailOpen, RefreshCw, Star, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import Reviews from "./Reviews";
import { format } from "date-fns";
import { useSearchParams } from "@/lib/react-router-dom-shim";
import {
  adminMessagePagesKey,
  adminUnreadMessagesKey,
  useAdminMessageDetail,
  useAdminMessagePages,
  useAdminUnreadMessagesCount,
  type AdminContactMessageListItem,
} from "@/hooks/useAdminMessages";

const Messages = () => {
  const { activeStoreId } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "inbox";
  const [expanded, setExpanded] = useState<string | null>(null);

  const messagePages = useAdminMessagePages(activeStoreId);
  const messages = messagePages.data?.pages.flatMap((page) => page.items) ?? [];
  const unreadQuery = useAdminUnreadMessagesCount(activeStoreId);
  const unreadCount = unreadQuery.data ?? 0;
  const detailQuery = useAdminMessageDetail(activeStoreId, expanded);

  const markRead = useMutation({
    mutationFn: async ({ id, isRead, storeId }: { id: string; isRead: boolean; storeId: string }) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ is_read: isRead } as any)
        .eq("id", id)
        .eq("store_id", storeId);
      if (error) throw error;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminMessagePagesKey(variables.storeId) }),
        queryClient.invalidateQueries({ queryKey: adminUnreadMessagesKey(variables.storeId) }),
      ]);
    },
  });

  useEffect(() => {
    setExpanded(null);
  }, [activeStoreId]);

  const handleExpand = (msg: AdminContactMessageListItem) => {
    if (!activeStoreId) return;
    if (expanded === msg.id) {
      setExpanded(null);
      return;
    }

    setExpanded(msg.id);
    if (!msg.is_read) {
      markRead.mutate({ id: msg.id, isRead: true, storeId: activeStoreId });
    }
  };

  const refreshInbox = async () => {
    await Promise.all([messagePages.refetch(), unreadQuery.refetch()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Customers & Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Customer inquiries and product ratings
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        {activeTab === "inbox" && (
          <Button variant="outline" size="sm" onClick={() => void refreshInbox()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val }, { replace: true })} className="space-y-6">
        <TabsList className="bg-secondary/40 p-1 border border-border">
          <TabsTrigger value="inbox" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Contact Inbox
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="h-4 w-4" />
            Product Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {messagePages.isLoading && messages.length === 0 ? (
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
                  <Skeleton className="h-10 w-full" />
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
                      <p className="mt-0.5 truncate text-sm text-foreground/70">Open message to read the full inquiry</p>
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

                  {expanded === msg.id && (
                    <div className="border-t border-border px-4 pb-4 pt-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <a
                          href={`mailto:${msg.email}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Reply to {msg.email}
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => activeStoreId && markRead.mutate({ id: msg.id, isRead: !msg.is_read, storeId: activeStoreId })}
                          disabled={markRead.isPending || !activeStoreId}
                        >
                          {msg.is_read ? (
                            <><Mail className="h-3 w-3" /> Mark Unread</>
                          ) : (
                            <><MailOpen className="h-3 w-3" /> Mark Read</>
                          )}
                        </Button>
                      </div>
                      <div className="rounded-md border border-border bg-background p-4">
                        {detailQuery.isLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading message…
                          </div>
                        ) : detailQuery.isError ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                            <span>Could not load this message.</span>
                            <Button variant="outline" size="sm" onClick={() => void detailQuery.refetch()}>Retry</Button>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{detailQuery.data?.message ?? ""}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {messagePages.hasNextPage ? (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => void messagePages.fetchNextPage()}
                    disabled={messagePages.isFetchingNextPage}
                    className="gap-2"
                  >
                    {messagePages.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Load more messages
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <Reviews />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Messages;
