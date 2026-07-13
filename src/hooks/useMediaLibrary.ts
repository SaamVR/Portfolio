import { useQuery } from "@tanstack/react-query";
import { fetchMediaLibrary } from "@/lib/media-library";

export function useMediaLibrary(storeId?: string | null) {
  return useQuery({
    queryKey: ["media_library", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      return fetchMediaLibrary(storeId);
    },
    staleTime: 60_000,
    enabled: !!storeId,
  });
}

