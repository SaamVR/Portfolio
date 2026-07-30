"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Filter,
  Inbox,
  Mail,
  MailOpen,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Store,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logPlatformAuditAction } from "@/lib/platform/audit-logger";
import { cn } from "@/lib/utils";

interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  planName?: string;
  subscriptionStatus: string;
  ownerLabel?: string;
}

interface SupportMessage {
  id: string;
  store_id?: string | null;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface PlatformSupportInboxCardProps {
  storeSummaries: StoreSummary[];
  currentUser?: { id?: string; email?: string; role?: string };
  onImpersonateStore?: (store: StoreSummary) => void;
}

export function PlatformSupportInboxCard({
  storeSummaries,
  currentUser,
  onImpersonateStore,
}: PlatformSupportInboxCardProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  const storeMap = useMemo(() => {
    const map = new Map<string, StoreSummary>();
    storeSummaries.forEach((s) => map.set(s.id, s));
    return map;
  }, [storeSummaries]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages((data as SupportMessage[]) || []);
    } catch (err: any) {
      console.error("Failed to load platform support messages:", err);
      toast.error("Failed to load merchant support tickets.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();
  }, []);

  const handleToggleRead = async (msg: SupportMessage) => {
    const newReadState = !msg.is_read;
    try {
      const { error } = await supabase
        .from("contact_messages")
        .update({ is_read: newReadState } as any)
        .eq("id", msg.id);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_read: newReadState } : m))
      );

      await logPlatformAuditAction(supabase, {
        actorId: currentUser?.id,
        actorEmail: currentUser?.email,
        actorRole: currentUser?.role,
        action: newReadState ? "mark_support_ticket_read" : "mark_support_ticket_unread",
        targetType: "support_message",
        targetId: msg.id,
        details: { merchant_email: msg.email, store_id: msg.store_id },
      });

      toast.success(newReadState ? "Ticket marked as read." : "Ticket marked as unread.");
    } catch (err: any) {
      toast.error("Failed to update ticket status.");
    }
  };

  const handleSendReply = async (msg: SupportMessage) => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply message before sending.");
      return;
    }

    setIsSendingReply(true);
    try {
      await logPlatformAuditAction(supabase, {
        actorId: currentUser?.id,
        actorEmail: currentUser?.email,
        actorRole: currentUser?.role,
        action: "reply_support_ticket",
        targetType: "support_message",
        targetId: msg.id,
        details: {
          merchant_email: msg.email,
          reply_snippet: replyText.substring(0, 100),
          store_id: msg.store_id,
        },
      });

      if (!msg.is_read) {
        await handleToggleRead(msg);
      }

      // Open mailto client with prefilled response
      const mailtoUrl = `mailto:${encodeURIComponent(msg.email)}?subject=${encodeURIComponent(
        `[COMMERCE Engine Support] Re: Inquiry from ${msg.name}`
      )}&body=${encodeURIComponent(replyText)}`;
      window.open(mailtoUrl, "_blank");

      toast.success(`Operator response logged. Opening email composer for ${msg.email}`);
      setReplyText("");
    } catch (err: any) {
      toast.error("Failed to record support response.");
    } finally {
      setIsSendingReply(false);
    }
  };

  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (statusFilter === "unread" && msg.is_read) return false;
      if (statusFilter === "read" && !msg.is_read) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const store = msg.store_id ? storeMap.get(msg.store_id) : null;

      return (
        msg.name.toLowerCase().includes(q) ||
        msg.email.toLowerCase().includes(q) ||
        msg.message.toLowerCase().includes(q) ||
        (store && (store.name.toLowerCase().includes(q) || store.slug.toLowerCase().includes(q)))
      );
    });
  }, [messages, searchQuery, statusFilter, storeMap]);

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="space-y-3 border-b border-border/60 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <Inbox className="h-5 w-5 text-primary" /> Unified Platform Support & Communications Center
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Central operator inbox for merchant inquiries, store feedback, and context-aware support.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold text-xs">
                {unreadCount} Unread Ticket{unreadCount === 1 ? "" : "s"}
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadMessages()}
              className="h-8 px-3 text-xs"
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isLoading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by merchant name, email, store slug, or query..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9"
            >
              <option value="all">All Ticket Statuses</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read / Handled</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {isLoading && messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Loading platform support messages...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Inbox className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No support messages found</p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "No tickets match your search query." : "All merchant inquiry tickets have been addressed."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((msg) => {
              const matchingStore = msg.store_id ? storeMap.get(msg.store_id) : null;
              const isExpanded = expandedId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-xl border transition-all duration-200 overflow-hidden",
                    !msg.is_read
                      ? "border-primary/40 bg-primary/5 shadow-2xs"
                      : "border-border/80 bg-card hover:border-border"
                  )}
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                    className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {msg.is_read ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary animate-pulse" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{msg.name}</span>
                          <span className="text-xs text-muted-foreground">({msg.email})</span>
                          {!msg.is_read && (
                            <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                              New
                            </Badge>
                          )}
                          {matchingStore && (
                            <Badge variant="outline" className="bg-background/80 text-[10px] gap-1 font-medium">
                              <Store className="h-3 w-3 text-primary" /> {matchingStore.name} ({matchingStore.planName || "Free"})
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {msg.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs text-muted-foreground">
                      <span>{format(new Date(msg.created_at), "MMM d, h:mm a")}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleToggleRead(msg);
                        }}
                      >
                        {msg.is_read ? "Mark Unread" : "Mark Read"}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Ticket View & Reply Composer */}
                  {isExpanded && (
                    <div className="border-t border-border/60 bg-background/60 p-5 space-y-4">
                      {/* Merchant Store Context Bar */}
                      {matchingStore && (
                        <div className="rounded-lg border border-border/80 bg-card p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-primary" />
                            <span>
                              Store Context: <strong>{matchingStore.name}</strong> (/{matchingStore.slug}) · Subscription:{" "}
                              <strong className="capitalize">{matchingStore.subscriptionStatus}</strong>
                            </span>
                          </div>

                          {onImpersonateStore && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onImpersonateStore(matchingStore)}
                              className="h-7 text-[11px] gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" /> Impersonate Merchant
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Original Message Body */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inquiry Message</label>
                        <div className="rounded-lg border border-border bg-card p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                          {msg.message}
                        </div>
                      </div>

                      {/* Reply Composer */}
                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-primary" /> Send Operator Response
                        </label>
                        <Textarea
                          placeholder={`Write a response to ${msg.name} (${msg.email})...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="text-xs min-h-[90px]"
                        />
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-[11px] text-muted-foreground">
                            Sending will record an audit trail event and launch your default email client.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isSendingReply || !replyText.trim()}
                            onClick={() => void handleSendReply(msg)}
                            className="h-8 px-4 text-xs font-medium"
                          >
                            <Mail className="mr-1.5 h-3.5 w-3.5" /> Send & Record Response
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
