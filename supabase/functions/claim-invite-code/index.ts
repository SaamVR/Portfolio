import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type ClaimResult = {
  success: boolean;
  error?: string;
  role?: string;
  membership_type?: "store" | "platform";
  store_id?: string;
};

function claimFailure(result: ClaimResult) {
  switch (result.error) {
    case "wrong_email":
      return jsonResponse({ error: "This invite code is assigned to a different email address" }, 403);
    case "expired":
      return jsonResponse({ error: "This invite code has expired" }, 400);
    case "existing_membership":
      return jsonResponse({ error: "You already belong to this store workspace" }, 400);
    case "existing_role":
      return jsonResponse({ error: "You already have a platform role assigned" }, 400);
    case "identity_binding_required":
      return jsonResponse({ error: "This privileged invite is no longer claimable. Ask an administrator for a new invite." }, 400);
    case "revoked":
    case "invalid_invite_state":
    case "already_used":
    case "invalid_code":
    default:
      return jsonResponse({ error: "Invalid or already used invite code" }, 400);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }

    const payload = await req.json();
    const code = typeof payload?.code === "string" ? payload.code.trim() : "";
    if (!code) {
      return jsonResponse({ error: "Invite code is required" }, 400);
    }

    const { data, error } = await supabaseAdmin.rpc("claim_invite_code_atomic", {
      p_code: code,
      p_user_id: user.id,
      p_user_email: user.email ?? null,
    });

    if (error) {
      console.error("Atomic invite claim failed", error);
      return jsonResponse({ error: "Failed to claim invite code" }, 500);
    }

    const result = data as ClaimResult | null;
    if (!result || result.success !== true) {
      return claimFailure(result ?? { success: false, error: "invalid_code" });
    }

    if (result.membership_type === "store" && result.store_id) {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("name, slug")
        .eq("id", result.store_id)
        .maybeSingle();

      return jsonResponse({
        success: true,
        role: result.role,
        store_id: result.store_id,
        store_name: store?.name ?? null,
        store_slug: store?.slug ?? null,
        membership_type: "store",
      }, 200);
    }

    return jsonResponse({
      success: true,
      role: result.role,
      membership_type: "platform",
    }, 200);
  } catch (error) {
    console.error("claim-invite-code unexpected failure", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
