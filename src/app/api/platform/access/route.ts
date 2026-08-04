import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";

export const platformAccessRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
};

export async function GET(req: Request) {
  try {
    const user = await platformAccessRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = platformAccessRouteDeps.getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const role = Array.isArray(data) && typeof data[0]?.role === "string"
      ? data[0].role
      : null;

    return NextResponse.json({
      success: true,
      role,
      isPlatformUser: role === "admin" || role === "super_admin" || role === "billing_admin" || role === "support_agent",
    });
  } catch (error) {
    console.error("Platform access lookup error:", error);
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Failed to resolve platform access";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
