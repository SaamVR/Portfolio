import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const fallbackOrigin = Deno.env.get("CMS_PUBLIC_URL") || "https://commerce-engine.local";
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || `${fallbackOrigin},http://localhost:8080,http://localhost:8081,http://localhost:8082`)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : fallbackOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};

interface BkashConfig {
  app_key: string;
  app_secret: string;
  username: string;
  password: string;
  is_live: boolean;
}

interface OrderPaymentContext {
  store_id: string;
  total: number;
  status: string;
  payment_method: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the request
    const payload = await req.json()
    const { action, order_id, amount, paymentID, store_id } = payload

    if (!action) {
      throw new Error("Action is required ('create' or 'execute')")
    }

    let resolvedStoreId = store_id as string | undefined;
    let orderContext: OrderPaymentContext | null = null;

    if (!resolvedStoreId && order_id) {
      const { data: orderRecord } = await supabaseClient
        .from('orders')
        .select('store_id, total, status, payment_method')
        .eq('order_number', order_id)
        .maybeSingle()
      orderContext = orderRecord as OrderPaymentContext | null;
      resolvedStoreId = orderContext?.store_id;
    } else if (order_id) {
      const { data: orderRecord } = await supabaseClient
        .from('orders')
        .select('store_id, total, status, payment_method')
        .eq('order_number', order_id)
        .eq('store_id', resolvedStoreId)
        .maybeSingle()
      orderContext = orderRecord as OrderPaymentContext | null;
    }

    if (action === 'create') {
      if (!order_id) throw new Error("order_id is required for create");
      if (!orderContext) throw new Error("Order could not be found for payment");
      if (orderContext.payment_method !== 'bkash') throw new Error("Order is not configured for bKash payment");
      if (orderContext.status === 'confirmed') throw new Error("Order is already confirmed");

      const requestedAmount = Number(amount);
      if (Number.isFinite(requestedAmount) && Math.abs(requestedAmount - Number(orderContext.total)) > 0.01) {
        throw new Error("Payment amount does not match the order total");
      }
    }

    if (action === 'execute' && !resolvedStoreId && order_id) {
      throw new Error("Order context is required to execute tenant-scoped bKash payment");
    }

    // Fetch tenant-scoped payment credentials first, then fall back to global settings during migration.
    let settingsQuery = supabaseClient
      .from('site_settings')
      .select('value')
      .eq('key', 'payment_settings')
      .limit(1)

    if (resolvedStoreId) {
      settingsQuery = settingsQuery.eq('store_id', resolvedStoreId)
    } else {
      settingsQuery = settingsQuery.is('store_id', null)
    }

    let { data: settingsRows, error: settingsError } = await settingsQuery

    if ((!settingsRows || settingsRows.length === 0) && resolvedStoreId) {
      const fallback = await supabaseClient
        .from('site_settings')
        .select('value')
        .eq('key', 'payment_settings')
        .is('store_id', null)
        .limit(1)
      settingsRows = fallback.data
      settingsError = fallback.error
    }

    const siteSettings = settingsRows?.[0]
    if (settingsError || !siteSettings) {
      throw new Error("Could not load payment settings")
    }

    const settings = siteSettings.value as any;
    const bkashConfig: BkashConfig = {
      app_key: settings.bkash_app_key,
      app_secret: settings.bkash_app_secret,
      username: settings.bkash_username,
      password: settings.bkash_password,
      is_live: settings.bkash_is_live === true
    }

    if (!bkashConfig.app_key || !bkashConfig.username) {
      throw new Error("bKash API credentials are not configured in the dashboard")
    }

    const baseURL = bkashConfig.is_live 
      ? 'https://tokenized.pay.bka.sh/v1.2.0-beta' 
      : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'

    // Helper to get Token
    const grantToken = async () => {
      const response = await fetch(`${baseURL}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'username': bkashConfig.username,
          'password': bkashConfig.password,
        },
        body: JSON.stringify({
          app_key: bkashConfig.app_key,
          app_secret: bkashConfig.app_secret,
        })
      });
      const data = await response.json();
      if (data.statusCode !== "0000") {
        throw new Error(`bKash Token Error: ${data.statusMessage}`)
      }
      return data.id_token;
    }

    if (action === 'create') {
      if (!order_id || !orderContext) throw new Error("Order context is required for create");
      
      const idToken = await grantToken();
      const callbackUrl = new URL(`${origin || fallbackOrigin}/bkash/callback`);
      callbackUrl.searchParams.set("order_id", order_id);
      if (resolvedStoreId) callbackUrl.searchParams.set("store_id", resolvedStoreId);

      const createResponse = await fetch(`${baseURL}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken,
          'X-APP-Key': bkashConfig.app_key,
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: ' ',
          callbackURL: callbackUrl.toString(),
          amount: Number(orderContext.total).toString(),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: order_id
        })
      });

      const createData = await createResponse.json();
      
      if (createData.statusCode !== "0000") {
        throw new Error(`bKash Create Error: ${createData.statusMessage}`)
      }

      return new Response(JSON.stringify({ 
        success: true, 
        paymentID: createData.paymentID,
        bkashURL: createData.bkashURL 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'execute') {
      if (!paymentID) throw new Error("paymentID is required for execute");

      const idToken = await grantToken();

      const executeResponse = await fetch(`${baseURL}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken,
          'X-APP-Key': bkashConfig.app_key,
        },
        body: JSON.stringify({ paymentID })
      });

      const executeData = await executeResponse.json();

      if (executeData.statusCode !== "0000") {
        return new Response(JSON.stringify({ success: false, error: executeData.statusMessage }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Find the order by invoice number and mark as Paid
      const orderId = executeData.merchantInvoiceNumber;
      if (orderId) {
        if (order_id && order_id !== orderId) {
          throw new Error("Payment invoice did not match the expected order");
        }

        let orderUpdate = supabaseClient
          .from('orders')
          .update({ 
            status: 'confirmed',
            notes: `Paid via bKash. TrxID: ${executeData.trxID}`
          })
          .eq('order_number', orderId)

        if (resolvedStoreId) {
          orderUpdate = orderUpdate.eq('store_id', resolvedStoreId);
        }

        const { error: updateError } = await orderUpdate;
        if (updateError) {
          throw new Error("Payment succeeded but order confirmation failed");
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        trxID: executeData.trxID,
        order_number: orderId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error("Invalid action");

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
