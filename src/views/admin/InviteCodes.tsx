import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Navigate } from "@/lib/react-router-dom-shim";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { resolveStorePlanState } from "@/lib/billing/plans";
import { Plus, Copy, Loader2, KeyRound, ShieldCheck, Users as UsersIcon, UserRoundPlus } from "lucide-react";

type StaffInvite = {
  id: string;
  invite_code: string;
  role: "owner" | "admin" | "editor" | "viewer";
  claimed_by: string | null;
  created_at: string;
  email: string | null;
  status: "pending" | "claimed" | "revoked" | "expired";
};

type StoreMember = {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "editor" | "viewer";
  created_at: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type PlanSummary = {
  name: string;
  staffLimit: number | null;
};

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const InviteCodes = () => {
  const { role, session, user, activeStoreId, loading: authLoading } = useAuth();
  const [codes, setCodes] = useState<StaffInvite[]>([]);
  const [members, setMembers] = useState<StoreMember[]>([]);
  const [planSummary, setPlanSummary] = useState<PlanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [inviteEmail, setInviteEmail] = useState("");

  const fetchCodes = useCallback(async () => {
    if (!activeStoreId) {
      return [] as StaffInvite[];
    }

    const { data, error } = await (supabase as any)
      .from("store_staff_invites")
      .select("id, invite_code, role, claimed_by, created_at, email, status")
      .eq("store_id", activeStoreId as string)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as StaffInvite[];
  }, [activeStoreId]);

  const fetchMembers = useCallback(async () => {
    if (!activeStoreId) {
      return [] as StoreMember[];
    }

    const { data: membershipRows, error: membershipError } = await (supabase as any)
      .from("store_memberships")
      .select("id, user_id, role, created_at")
      .eq("store_id", activeStoreId as string)
      .order("created_at", { ascending: true });

    if (membershipError) throw membershipError;

    const memberRows = (membershipRows ?? []) as Array<{ id: string; user_id: string; role: StoreMember["role"]; created_at: string }>;
    const userIds = memberRows.map((member) => member.user_id).filter(Boolean);

    if (userIds.length === 0) {
      return [];
    }

    const { data: profiles, error: profileError } = await (supabase as any)
      .from("profiles")
      .select("user_id, display_name, email, avatar_url")
      .in("user_id", userIds);

    if (profileError) throw profileError;

    const profileMap = new Map(
      ((profiles ?? []) as Array<{ user_id: string; display_name: string | null; email: string | null; avatar_url: string | null }>)
        .map((profile) => [profile.user_id, profile]),
    );

    return memberRows.map((member) => {
      const profile = profileMap.get(member.user_id);
      return {
        ...member,
        email: profile?.email ?? null,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      };
    });
  }, [activeStoreId]);

  const fetchPlanSummary = useCallback(async () => {
    if (!activeStoreId) {
      return null;
    }

    const [{ data: subscription, error: subscriptionError }, { data: store, error: storeError }] = await Promise.all([
      (supabase as any)
        .from("store_subscriptions")
        .select("plan_id, status, trial_ends_at, current_period_ends_at")
        .eq("store_id", activeStoreId as string)
        .maybeSingle(),
      (supabase as any)
        .from("stores")
        .select("plan")
        .eq("id", activeStoreId as string)
        .maybeSingle(),
    ]);

    if (subscriptionError) throw subscriptionError;
    if (storeError) throw storeError;

    const planState = resolveStorePlanState({
      subscription,
      legacyPlanId: store?.plan ?? null,
    });
    const effectivePlanId = planState.effectivePlanId ?? "free";
    const { data: plan, error: planError } = await (supabase as any)
      .from("cms_plans")
      .select("name, feature_flags")
      .eq("id", effectivePlanId)
      .maybeSingle();

    if (planError) throw planError;

    const featureFlags = plan?.feature_flags && typeof plan.feature_flags === "object"
      ? plan.feature_flags as Record<string, unknown>
      : null;
    const rawStaffLimit = featureFlags && typeof featureFlags.staff === "number" ? featureFlags.staff : 0;

    return {
      name: plan?.name ?? "Current plan",
      staffLimit: rawStaffLimit,
    } satisfies PlanSummary;
  }, [activeStoreId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (role !== "admin") {
        setLoading(false);
        return;
      }

      if (!activeStoreId) {
        setCodes([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [nextCodes, nextMembers, nextPlanSummary] = await Promise.all([
          fetchCodes(),
          fetchMembers(),
          fetchPlanSummary(),
        ]);
        if (!active) return;
        setCodes(nextCodes);
        setMembers(nextMembers);
        setPlanSummary(nextPlanSummary);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load invite codes:", error);
        toast.error("Failed to refresh invite codes. Please try again.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [activeStoreId, fetchCodes, fetchMembers, fetchPlanSummary, role]);

  useEffect(() => {
    setNewRole("editor");
    setInviteEmail("");
    setCreating(false);
  }, [activeStoreId]);

  const pendingInvites = useMemo(
    () => codes.filter((code) => !code.claimed_by && code.status === "pending"),
    [codes],
  );
  const claimedInvites = useMemo(
    () => codes.filter((code) => code.claimed_by || code.status === "claimed"),
    [codes],
  );
  const activeStaffCount = members.filter((member) => member.role !== "owner").length;
  const staffLimit = planSummary?.staffLimit ?? null;
  const isUnlimitedSeats = staffLimit != null && staffLimit < 0;
  const seatLimitReached = typeof staffLimit === "number" && staffLimit >= 0 && activeStaffCount >= staffLimit;
  const seatSummary = !planSummary
    ? "Checking package access"
    : isUnlimitedSeats
      ? `${activeStaffCount} active staff with unlimited seats`
      : typeof staffLimit === "number"
        ? `${activeStaffCount} of ${staffLimit} staff seats in use`
        : `${activeStaffCount} active staff`;

  const roleLabel = (memberRole: StoreMember["role"] | StaffInvite["role"]) => {
    switch (memberRole) {
      case "owner":
        return "Owner";
      case "admin":
        return "Admin";
      case "editor":
        return "Editor";
      default:
        return "Viewer";
    }
  };

  if ((authLoading || (session && role !== "admin")) && role !== "admin") {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "admin") return <Navigate to="/admin" replace />;

  const handleCreate = async () => {
    if (!activeStoreId) {
      toast.error("Select a store before creating invite codes.");
      return;
    }
    if (seatLimitReached) {
      toast.error("This package is already at its active staff-seat limit.");
      return;
    }

    setCreating(true);
    const code = generateCode();
    const { error } = await (supabase as any).from("store_staff_invites").insert({
      invite_code: code,
      role: newRole,
      store_id: activeStoreId,
      created_by: user?.id,
      email: inviteEmail.trim() || null,
      status: "pending",
    });
    if (error) {
      toast.error("Failed to create invite code");
    } else {
      toast.success("Invite code created");
      navigator.clipboard.writeText(code);
      toast.info("Code copied to clipboard");
      setInviteEmail("");
      void fetchCodes()
        .then((nextCodes) => {
          setCodes(nextCodes);
        })
        .catch((fetchError) => {
          console.error("Failed to reload invite codes:", fetchError);
          toast.error("Failed to refresh invite codes. Please try again.");
        });
    }
    setCreating(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Team Access</h1>
        <p className="text-sm text-muted-foreground">Invite staff, review active dashboard access, and keep seat usage clear for this store.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersIcon className="h-4 w-4 text-primary" />
              Active staff
            </CardTitle>
            <CardDescription>{seatSummary}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">{activeStaffCount}</CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRoundPlus className="h-4 w-4 text-primary" />
              Pending invites
            </CardTitle>
            <CardDescription>Invites waiting to be claimed do not become active seats until someone joins.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">{pendingInvites.length}</CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Access package
            </CardTitle>
            <CardDescription>{planSummary?.name ?? "Current package"} team capacity</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">
            {isUnlimitedSeats ? "Unlimited" : typeof staffLimit === "number" ? staffLimit : "—"}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Create Staff Invite</CardTitle>
          <CardDescription>
            Admins can manage catalog, orders, and store settings. Editors handle day-to-day content and commerce work. Viewers can safely review data without changing it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_180px_auto] md:items-end">
          <div className="grid gap-2">
            <Label>Email (optional)</Label>
            <Input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="staff@store.com"
            />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "editor" | "viewer")}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={creating || seatLimitReached} className="gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Generate Code
          </Button>
          {seatLimitReached ? (
            <p className="text-sm text-amber-600 md:col-span-3">
              This package is already at its active seat limit. Upgrade if you need more staff access.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Active Team Members</CardTitle>
          <CardDescription>Everyone who currently has dashboard access for this store.</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No active team members were found for this store yet.
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{member.display_name || member.email || "Store team member"}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.email || "No email available"} · Joined {new Date(member.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <Badge variant={member.role === "owner" || member.role === "admin" ? "default" : "secondary"}>
                    {roleLabel(member.role)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {loading && codes.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : codes.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <KeyRound className="mb-4 h-12 w-12" />
          <p>No staff invites yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((c) => (
            <Card key={c.id} className="border-border">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <code className="rounded bg-secondary px-3 py-1.5 font-mono text-sm text-foreground">{c.invite_code}</code>
                  <Badge variant={c.role === "owner" || c.role === "admin" ? "default" : "secondary"}>
                    {roleLabel(c.role)}
                  </Badge>
                  {c.email ? <span className="text-xs text-muted-foreground">{c.email}</span> : null}
                  {c.claimed_by || c.status === "claimed" ? (
                    <Badge variant="outline" className="text-muted-foreground">Claimed</Badge>
                  ) : c.status === "revoked" ? (
                    <Badge variant="outline" className="text-muted-foreground">Revoked</Badge>
                  ) : c.status === "expired" ? (
                    <Badge variant="outline" className="text-muted-foreground">Expired</Badge>
                  ) : (
                    <Badge variant="outline" className="border-primary/30 text-primary">Available</Badge>
                  )}
                </div>
                {!c.claimed_by && c.status === "pending" && (
                  <Button variant="ghost" size="icon" onClick={() => copyCode(c.invite_code)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {claimedInvites.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Claimed invite history stays visible here so merchants can track who joined and which access level was issued.
        </p>
      ) : null}
    </div>
  );
};

export default InviteCodes;
