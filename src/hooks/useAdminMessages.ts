import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildAdminCollectionPage,
  getAdminCollectionRange,
} from "@/lib/admin/admin-collection-pagination";

export type AdminContactMessageListItem = {
  id: string;
  name: string;
  email: string;
  is_read: boolean;
  created_at: string;
};

export type AdminContactMessageDetail = {
  id: string;
  message: string;
};

export const ADMIN_CONTACT_MESSAGE_LIST_COLUMNS = "id,name,email,is_read,created_at" as const;
export const adminMessagePagesKey = (storeId?: string | null) => ["admin-messages-pages", storeId] as const;
export const adminUnreadMessagesKey = (storeId?: string | null) => ["unread-messages-count", storeId] as const;
export const adminMessageDetailKey = (storeId?: string | null, messageId?: string | null) => [
  "admin-message-detail",
  storeId,
  messageId,
] as const;

export async function fetchAdminMessagePage(storeId: string, page: number) {
  const range = getAdminCollectionRange(page);
  const { data, error } = await supabase
    .from("contact_messages")
    .select(ADMIN_CONTACT_MESSAGE_LIST_COLUMNS)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(range.from, range.to);

  if (error) throw error;
  return buildAdminCollectionPage(
    (data ?? []) as unknown as AdminContactMessageListItem[],
    range.page,
    range.pageSize,
  );
}

export function useAdminMessagePages(storeId: string | null | undefined) {
  return useInfiniteQuery({
    queryKey: adminMessagePagesKey(storeId),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchAdminMessagePage(storeId as string, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: Boolean(storeId),
    staleTime: 15_000,
  });
}

export function useAdminUnreadMessagesCount(storeId: string | null | undefined) {
  return useQuery({
    queryKey: adminUnreadMessagesKey(storeId),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId as string)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(storeId),
    staleTime: 15_000,
  });
}

export function useAdminMessageDetail(storeId: string | null | undefined, messageId: string | null) {
  return useQuery({
    queryKey: adminMessageDetailKey(storeId, messageId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("id,message")
        .eq("store_id", storeId as string)
        .eq("id", messageId as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Message not found");
      return data as AdminContactMessageDetail;
    },
    enabled: Boolean(storeId && messageId),
  });
}
