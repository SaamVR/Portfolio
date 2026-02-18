import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Copy, Loader2, KeyRound } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type InviteCode = Tables<"invite_codes">;

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const InviteCodes = () => {
  const { role, user } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState<"admin" | "co_admin">("co_admin");

  useEffect(() => {
    if (role !== "admin") return;
    fetchCodes();
  }, [role]);

  const fetchCodes = async () => {
    setLoading(true);
    const { data } = await supabase.from("invite_codes").select("*").order("created_at", { ascending: false });
    setCodes(data ?? []);
    setLoading(false);
  };

  if (role !== "admin") return <Navigate to="/admin" replace />;

  const handleCreate = async () => {
    setCreating(true);
    const code = generateCode();
    const { error } = await supabase.from("invite_codes").insert({
      code,
      role: newRole,
      created_by: user?.id,
    });
    if (error) {
      toast.error("Failed to create invite code");
    } else {
      toast.success("Invite code created");
      navigator.clipboard.writeText(code);
      toast.info("Code copied to clipboard");
      fetchCodes();
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
        <p className="text-sm text-muted-foreground">Generate codes to invite new admins</p>
      </div>

      <Card className="border-border">
        <CardHeader><CardTitle className="text-lg">Create New Code</CardTitle></CardHeader>
        <CardContent className="flex items-end gap-4">
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "co_admin")}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="co_admin">Co-Admin</SelectItem>
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
          <p>No invite codes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((c) => (
            <Card key={c.id} className="border-border">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <code className="rounded bg-secondary px-3 py-1.5 font-mono text-sm text-foreground">{c.code}</code>
                  <Badge variant={c.role === "admin" ? "default" : "secondary"}>
                    {c.role === "admin" ? "Admin" : "Co-Admin"}
                  </Badge>
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
