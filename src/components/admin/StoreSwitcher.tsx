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
import { ChevronsUpDown, Store, PlusCircle, ArrowRightCircle, ExternalLink } from "lucide-react";
import { useLocation, useNavigate } from "@/lib/react-router-dom-shim";
import { withStoreId } from "@/lib/admin-paths";
import { useStoreCreationEligibility } from "@/hooks/useStoreCreationEligibility";
import { absoluteStoreUrl } from "@/lib/siteUrl";

export default function StoreSwitcher({ mobile = false }: { mobile?: boolean }) {
  const { storeMemberships, activeStoreId, setActiveStoreId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const storeIds = storeMemberships.map(m => m.storeId);
  const { data: storeCreationEligibility } = useStoreCreationEligibility();

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
  const hasStores = Boolean(stores?.length);
  const canCreateStore = !hasStores || Boolean(storeCreationEligibility?.allowed);
  const creationBlockedReason = storeCreationEligibility?.reason ?? "Your current package does not allow another store right now.";

  const buildNextRoute = (storeId: string) => {
    const basePath = location.pathname.startsWith("/cms-admin") ? "/admin" : location.pathname || "/admin";
    return withStoreId(`${basePath}${location.search || ""}`, storeId);
  };

  const handleSwitch = (storeId: string) => {
    if (storeId === activeStoreId) return;
    setActiveStoreId(storeId);
    queryClient.invalidateQueries({ queryKey: ["store-entitlements"] });
    queryClient.invalidateQueries({ queryKey: ["user-stores"] });
    queryClient.invalidateQueries({ queryKey: ["admin-orders-store"] });
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    navigate(buildNextRoute(storeId));
  };

  const goToNewStoreFlow = () => {
    if (!canCreateStore) {
      return;
    }

    if (typeof window !== "undefined") {
      window.location.assign("/signup?intent=new-store");
      return;
    }

    navigate("/signup?intent=new-store");
  };

  const openStorefront = (store: { slug: string }) => {
    if (typeof window !== "undefined") {
      window.open(absoluteStoreUrl({ slug: store.slug }, "/"), "_blank", "noopener,noreferrer");
    }
  };

  if (mobile) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 min-w-0 flex-1 justify-between rounded-2xl px-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Store className="h-4 w-4" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Store</p>
                  <p className="truncate text-sm font-semibold text-foreground">{activeStore?.name ?? (hasStores ? "Select Store" : "Create your first store")}</p>
                </div>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[min(22rem,calc(100vw-2rem))]">
            <DropdownMenuLabel>Switch Store</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hasStores ? stores?.map(store => (
              <div key={store.id}>
                <DropdownMenuItem
                  onClick={() => handleSwitch(store.id)}
                  className="cursor-pointer justify-between"
                >
                  <span className="truncate">{store.name}</span>
                  {store.id === activeStoreId && <div className="h-2 w-2 rounded-full bg-green-500" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openStorefront(store)}
                  className="cursor-pointer pl-8 text-xs text-muted-foreground"
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  View store
                </DropdownMenuItem>
              </div>
            )) : (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                No stores yet. Start onboarding to create your first storefront.
              </div>
            )}
            {canCreateStore ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={goToNewStoreFlow} className="cursor-pointer text-primary">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {hasStores ? "Create New Store" : "Create First Store"}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuSeparator />
                <div className="px-3 py-3 text-xs text-muted-foreground">
                  {creationBlockedReason}
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {canCreateStore ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-2xl border-dashed border-primary/40 text-primary"
            onClick={goToNewStoreFlow}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-48 justify-between gap-2 border-dashed">
          <div className="flex items-center gap-2 truncate">
            <Store className="h-4 w-4 shrink-0" />
            <span className="truncate">{activeStore?.name ?? (hasStores ? "Select Store" : "Create your first store")}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Store</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hasStores ? stores?.map(store => (
          <div key={store.id}>
            <DropdownMenuItem 
              onClick={() => handleSwitch(store.id)}
              className="cursor-pointer justify-between"
            >
              <span className="truncate">{store.name}</span>
              {store.id === activeStoreId && (
                <div className="h-2 w-2 rounded-full bg-green-500" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openStorefront(store)}
              className="cursor-pointer pl-8 text-xs text-muted-foreground"
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              View store
            </DropdownMenuItem>
          </div>
        )) : (
          <div className="px-3 py-3 text-sm text-muted-foreground">
            No stores yet. Create one to unlock the admin workspace.
          </div>
        )}
        {canCreateStore ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={goToNewStoreFlow} className="cursor-pointer text-primary">
              {hasStores ? <PlusCircle className="mr-2 h-4 w-4" /> : <ArrowRightCircle className="mr-2 h-4 w-4" />}
              {hasStores ? "Create New Store" : "Create First Store"}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-3 text-xs text-muted-foreground">
              {creationBlockedReason}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
