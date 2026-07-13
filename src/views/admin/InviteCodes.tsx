import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Navigate } from "@/lib/react-router-dom-shim";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Copy, Loader2, KeyRound } from "lucide-react";

type StaffInvite = {
  id: string;
  code: string;
  role: "admin" | "editor" | "viewer";
  used_by: string | null;
  created_at: string;
  email: string | null;
};

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const InviteCodes = () => {
  const { role, user , activeStoreId} = useAuth();
  const [codes, setCodes] = useState<StaffInvite[]>([]);
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
      .select("id, code, role, used_by, created_at, email")
      .eq("store_id", activeStoreId as string)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as StaffInvite[];
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
        const nextCodes = await fetchCodes();
        if (!active) return;
        setCodes(nextCodes);
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
  }, [activeStoreId, fetchCodes, role]);

  useEffect(() => {
    setNewRole("editor");
    setInviteEmail("");
    setCreating(false);
  }, [activeStoreId]);

  if (role !== "admin") return <Navigate to="/admin" replace />;

  const handleCreate = async () => {
    if (!activeStoreId) {
      toast.error("Select a store before creating invite codes.");
      return;
    }

    setCreating(true);
    const code = generateCode();
    const { error } = await (supabase as any).from("store_staff_invites").insert({
      code,
      role: newRole,
      store_id: activeStoreId,
      invited_by: user?.id,
      email: inviteEmail.trim() || null,
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
        <h1 className="font-heading text-3xl font-bold text-foreground">Invite Codes</h1>
        <p className="text-sm text-muted-foreground">Generate store staff codes that turn into tenant memberships</p>
      </div>

      <Card className="border-border">
        <CardHeader><CardTitle className="text-lg">Create Staff Invite</CardTitle></CardHeader>
        <CardContent className="flex items-end gap-4">
          <div className="grid gap-2">
            <Label>Email (optional)</Label>
            <input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="staff@store.com"
              className="h-10 w-56 rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "editor" | "viewer")}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Store Owner</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Generate Code
          </Button>
        </CardContent>
      </Card>

      {loading ? (
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
                  <code className="rounded bg-secondary px-3 py-1.5 font-mono text-sm text-foreground">{c.code}</code>
                  <Badge variant={c.role === "admin" ? "default" : "secondary"}>
                    {c.role === "admin" ? "Store Owner" : c.role === "editor" ? "Editor" : "Viewer"}
                  </Badge>
                  {c.email ? <span className="text-xs text-muted-foreground">{c.email}</span> : null}
                  {c.used_by ? (
                    <Badge variant="outline" className="text-muted-foreground">Used</Badge>
                  ) : (
                    <Badge variant="outline" className="border-primary/30 text-primary">Available</Badge>
                  )}
                </div>
                {!c.used_by && (
                  <Button variant="ghost" size="icon" onClick={() => copyCode(c.code)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InviteCodes;

