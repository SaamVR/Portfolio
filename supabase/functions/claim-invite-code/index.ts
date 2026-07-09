import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Invite code is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check store staff invites first. These create tenant memberships, not platform roles.
    const { data: storeInvite, error: storeInviteError } = await supabaseAdmin
      .from("store_staff_invites")
      .select("*")
      .eq("code", code.trim())
      .is("used_by", null)
      .maybeSingle();

    if (storeInviteError) {
      return new Response(
        JSON.stringify({ error: "Failed to validate invite code", details: storeInviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (storeInvite) {
      if (storeInvite.email && user.email && storeInvite.email.toLowerCase() !== user.email.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "This invite code is assigned to a different email address" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existingMembership } = await supabaseAdmin
        .from("store_memberships")
        .select("id")
        .eq("store_id", storeInvite.store_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingMembership) {
        return new Response(
          JSON.stringify({ error: "You already belong to this store workspace" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (storeInvite.expires_at && new Date(storeInvite.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "This invite code has expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: membershipError } = await supabaseAdmin
        .from("store_memberships")
        .insert({ store_id: storeInvite.store_id, user_id: userId, role: storeInvite.role });

      if (membershipError) {
        return new Response(
          JSON.stringify({ error: "Failed to assign store membership", details: membershipError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("name, slug")
        .eq("id", storeInvite.store_id)
        .maybeSingle();

      await supabaseAdmin
        .from("store_staff_invites")
        .update({ used_by: userId, used_at: new Date().toISOString() })
        .eq("id", storeInvite.id);

      return new Response(
        JSON.stringify({
          success: true,
          role: storeInvite.role,
          store_id: storeInvite.store_id,
          store_name: store?.name ?? null,
          store_slug: store?.slug ?? null,
          membership_type: "store",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Legacy platform invites still work for engine operators.
    const { data: existingRoles, error: existingRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1);

    if (existingRoleError) {
      return new Response(
        JSON.stringify({ error: "Failed to validate existing role", details: existingRoleError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingRoles && existingRoles.length > 0) {
      return new Response(
        JSON.stringify({ error: "You already have a platform role assigned", role: existingRoles[0].role }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invite_codes")
      .select("*")
      .eq("code", code.trim())
      .is("used_by", null)
      .maybeSingle();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Invalid or already used invite code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invite code has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: invite.role }, { onConflict: "user_id,role", ignoreDuplicates: true });

    if (roleError) {
      return new Response(
        JSON.stringify({ error: "Failed to assign role", details: roleError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabaseAdmin
      .from("invite_codes")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("id", invite.id);

    return new Response(
      JSON.stringify({ success: true, role: invite.role, membership_type: "platform" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
