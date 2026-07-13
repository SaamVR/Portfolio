import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Navigate } from "@/lib/react-router-dom-shim";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";

const Users = () => {
  const { session, platformRole, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      if (platformRole !== "admin") {
        if (active) {
          setUsers([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const [{ data: roles, error: rolesError }, { data: profiles, error: profilesError }] = await Promise.all([
          supabase.from("user_roles").select("user_id, role"),
          supabase.from("profiles").select("*"),
        ]);

        if (rolesError) throw rolesError;
        if (profilesError) throw profilesError;

        const roleMap: Record<string, string> = {};
        roles?.forEach((r) => { roleMap[r.user_id] = r.role; });

        const combined = (profiles ?? [])
          .filter((p) => roleMap[p.user_id])
          .map((p) => ({ ...p, role: roleMap[p.user_id] }));

        if (!active) return;
        setUsers(combined);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load dashboard users:", error);
        toast.error("Failed to refresh dashboard users. Please try again.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void fetch();

    return () => {
      active = false;
    };
  }, [platformRole]);

  if ((authLoading || (session && platformRole !== "admin")) && platformRole !== "admin") {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (platformRole !== "admin") return <Navigate to="/admin" replace />;

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard Users</h1>
        <p className="text-sm text-muted-foreground">{users.length} users with dashboard access</p>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <UsersIcon className="mb-4 h-12 w-12" />
          <p>No dashboard users yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id} className="border-border">
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(u.display_name || u.email || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{u.display_name || "No name"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                  {u.role === "admin" ? "Owner" : "Staff"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Users;
