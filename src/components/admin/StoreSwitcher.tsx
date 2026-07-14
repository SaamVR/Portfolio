import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Store, PlusCircle } from "lucide-react";
import { useNavigate } from "@/lib/react-router-dom-shim";
import { withStoreId } from "@/lib/admin-paths";
import { cn } from "@/lib/utils";

export default function StoreSwitcher({ mobile = false }: { mobile?: boolean }) {
  const { storeMemberships, activeStoreId, setActiveStoreId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storeIds = storeMemberships.map(m => m.storeId);

  const { data: stores } = useQuery({
    queryKey: ["user-stores", storeIds],
    queryFn: async () => {
      if (storeIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("stores")
        .select("id, name, slug")
        .in("id", storeIds)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: storeIds.length > 0,
  });

  const activeStore = stores?.find(s => s.id === activeStoreId);

  const handleSwitch = (storeId: string) => {
    if (storeId === activeStoreId) return;
    setActiveStoreId(storeId);
    queryClient.invalidateQueries();
    navigate("/admin");
  };

  if (mobile) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-background/80 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Store</p>
            <p className="truncate text-sm font-semibold text-foreground">{activeStore?.name ?? "Select Store"}</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {stores?.map((store) => {
            const active = store.id === activeStoreId;
            return (
              <button
                key={store.id}
                onClick={() => handleSwitch(store.id)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                <span className="max-w-[7rem] truncate">{store.name}</span>
              </button>
            );
          })}
          <button
            onClick={() => navigate(withStoreId("/admin/onboarding", activeStoreId))}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 text-sm font-medium text-primary"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-48 justify-between gap-2 border-dashed">
          <div className="flex items-center gap-2 truncate">
            <Store className="h-4 w-4 shrink-0" />
            <span className="truncate">{activeStore?.name ?? "Select Store"}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Store</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {stores?.map(store => (
          <DropdownMenuItem 
            key={store.id} 
            onClick={() => handleSwitch(store.id)}
            className="cursor-pointer justify-between"
          >
            <span className="truncate">{store.name}</span>
            {store.id === activeStoreId && (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(withStoreId("/admin/onboarding", activeStoreId))} className="cursor-pointer text-primary">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Store
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
