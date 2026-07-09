import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_URL_OVERRIDE");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
const DEFAULT_FROM_EMAIL = Deno.env.get("STOCK_EMAIL_FROM") || "Commerce Engine <hello@example.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { record, old_record } = await req.json();

    // Check if this was triggered by a webhook (product update)
    if (record && old_record) {
      // If stock increased from 0 to > 0
      if (old_record.stock === 0 && record.stock > 0 && record.is_available) {
        
        const { data: store } = record.store_id
          ? await supabase
              .from("stores")
              .select("name")
              .eq("id", record.store_id)
              .maybeSingle()
          : { data: null };

        const storeName = store?.name || "your store";

        // Find everyone waiting for this product in the same tenant store.
        let notificationsQuery = supabase
          .from("stock_notifications")
          .select("*")
          .eq("product_id", record.id)
          .eq("notified", false)

        if (record.store_id) {
          notificationsQuery = notificationsQuery.eq("store_id", record.store_id);
        }

        const { data: notifications, error } = await notificationsQuery;

        if (error) throw error;
        if (!notifications || notifications.length === 0) {
          return new Response(JSON.stringify({ message: "No one to notify" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // If no RESEND_API_KEY, just mark as notified (simulation)
        if (!RESEND_API_KEY) {
          console.log(`Simulating email to ${notifications.length} users for product ${record.name}`);
          
          await supabase
            .from("stock_notifications")
            .update({ notified: true })
            .in("id", notifications.map((n: any) => n.id));

          return new Response(JSON.stringify({ message: "Simulated emails (No Resend API Key configured)", count: notifications.length }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Send emails via Resend
        const emails = notifications.map((n: any) => n.email);
        
        const resendReq = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: DEFAULT_FROM_EMAIL,
            to: emails,
            subject: "Back in Stock: " + record.name,
            html: `
              <h2>Good news!</h2>
              <p>The <strong>${record.name}</strong> you were waiting for at ${storeName} is back in stock.</p>
              <p>Hurry and grab yours before it sells out again!</p>
              <br/>
              <p>Thanks,<br/>${storeName}</p>
            `,
          }),
        });

        if (resendReq.ok) {
          // Mark as notified
          await supabase
            .from("stock_notifications")
            .update({ notified: true })
            .in("id", notifications.map((n: any) => n.id));

          return new Response(JSON.stringify({ message: "Emails sent successfully" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          const errText = await resendReq.text();
          throw new Error("Resend API error: " + errText);
        }
      }
    }

    return new Response(JSON.stringify({ message: "Ignored event" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error processing stock notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
