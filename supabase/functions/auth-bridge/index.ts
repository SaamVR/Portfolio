import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// P1 #334: authentication exchange authority now lives in the bounded Next
// server route `/api/auth-bridge`, which owns rate limiting, durable external
// subject binding, collision handling and one-time Supabase session issuance.
//
// This legacy public Edge Function must not remain as a second path capable of
// account discovery, password reset or session issuance. Keep the deployment
// present only as a fail-closed compatibility tombstone until it is removed
// from production configuration after the coordinated app rollout.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      error: "Direct auth-bridge Edge access has been retired. Use the application authentication flow.",
      code: "auth_bridge_retired",
    }),
    {
      status: 410,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
});
