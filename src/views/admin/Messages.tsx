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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl font-bold text-foreground">Customers & Feedback</h1>
            {unreadCount > 0 ? (
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                {unreadCount} unread
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Keep customer questions and product feedback in one clear service queue.
          </p>
        </div>
        {activeTab === "inbox" ? (
          <Button
            variant="outline"
            onClick={() => void refreshInbox()}
            className="min-h-11 w-full gap-2 sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh inbox
          </Button>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val }, { replace: true })} className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Customer workspace</p>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 border border-border bg-secondary/40 p-1 sm:max-w-xl">
            <TabsTrigger value="inbox" className="min-h-12 gap-2 px-3">
              <MessageSquare className="h-4 w-4" />
              <span>Inbox</span>
              {unreadCount > 0 ? <span className="text-xs font-semibold">({unreadCount})</span> : null}
            </TabsTrigger>
            <TabsTrigger value="reviews" className="min-h-12 gap-2 px-3">
              <Star className="h-4 w-4" />
              <span>Reviews</span>
            </TabsTrigger>
          </TabsList>
          <p className="text-xs leading-5 text-muted-foreground">
            {activeTab === "reviews"
              ? "Approve, reject, and reply to customer reviews before they shape storefront trust."
              : "Read new inquiries first, then reply or return them to unread when follow-up is still needed."}
          </p>
        </div>

        <TabsContent value="inbox" className="space-y-4">
          {messagePages.isLoading && messages.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-56 max-w-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
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
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{messages.length} loaded {messages.length === 1 ? "conversation" : "conversations"}</span>
                {unreadCount > 0 ? <span className="font-medium text-primary">Start with unread messages</span> : <span>Inbox is caught up</span>}
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`overflow-hidden rounded-xl border transition-colors ${
                    !msg.is_read ? "border-primary/35 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <button
                    className="flex min-h-20 w-full items-start gap-3 p-4 text-left sm:items-center sm:p-5"
                    onClick={() => handleExpand(msg)}
                    aria-expanded={expanded === msg.id}
                  >
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border sm:mt-0 ${
                      !msg.is_read ? "border-primary/25 bg-primary/10" : "border-border bg-muted/40"
                    }`}>
                      {msg.is_read ? (
                        <MailOpen className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Mail className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-heading font-semibold text-foreground">{msg.name}</span>
                        {!msg.is_read ? <Badge className="h-5 px-2 text-[10px]">New</Badge> : null}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{msg.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{format(new Date(msg.created_at), "MMM d, yyyy")}</span>
                        <span>{format(new Date(msg.created_at), "h:mm a")}</span>
                        <span className="font-medium text-foreground/75">{expanded === msg.id ? "Close message" : "Read message"}</span>
                      </div>
                    </div>
                  </button>

                  {expanded === msg.id ? (
                    <div className="space-y-4 border-t border-border px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                      <div className="rounded-lg border border-border bg-background p-4">
                        {detailQuery.isLoading ? (
                          <div className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading message…
                          </div>
                        ) : detailQuery.isError ? (
                          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                            <span>Could not load this message.</span>
                            <Button variant="outline" className="min-h-11" onClick={() => void detailQuery.refetch()}>Retry</Button>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{detailQuery.data?.message ?? ""}</p>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 sm:justify-end">
                        <Button asChild className="min-h-11 gap-2">
                          <a href={`mailto:${msg.email}`}>Reply by email</a>
                        </Button>
                        <Button
                          variant="outline"
                          className="min-h-11 gap-2"
                          onClick={() => activeStoreId && markRead.mutate({ id: msg.id, isRead: !msg.is_read, storeId: activeStoreId })}
                          disabled={markRead.isPending || !activeStoreId}
                        >
                          {msg.is_read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                          {msg.is_read ? "Mark unread" : "Mark read"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}

              {messagePages.hasNextPage ? (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => void messagePages.fetchNextPage()}
                    disabled={messagePages.isFetchingNextPage}
                    className="min-h-11 gap-2"
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