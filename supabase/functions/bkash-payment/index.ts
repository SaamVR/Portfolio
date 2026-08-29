import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import {
  appendBkashPaymentNote,
  assertBkashOrderAwaitingPayment,
  assertBkashProviderPaymentMatchesOrder,
  type BkashOrderPaymentContext,
} from "./authority.ts"

const fallbackOrigin = Deno.env.get("CMS_PUBLIC_URL") || "https://commerce-engine.local";
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || `${fallbackOrigin},http://localhost:8080,http://localhost:8081,http://localhost:8082`)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const getAllowedOrigin = (origin: string | null) => origin && allowedOrigins.includes(origin) ? origin : fallbackOrigin;

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(origin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

interface BkashConfig {
  app_key: string;
  app_secret: string;
  username: string;
  password: string;
  is_live: boolean;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { action, order_id, amount, paymentID, store_id } = payload

    if (action !== 'create' && action !== 'execute') {
      throw new Error("Action must be 'create' or 'execute'")
    }

    if (!order_id || typeof order_id !== 'string') {
      throw new Error("order_id is required")
    }

    let resolvedStoreId = typeof store_id === 'string' && store_id.trim() ? store_id.trim() : undefined;
    let orderContext: BkashOrderPaymentContext | null = null;

    if (!resolvedStoreId) {
      const { data: orderRecord, error: orderError } = await supabaseClient
        .from('orders')
        .select('store_id, total, status, payment_method, notes')
        .eq('order_number', order_id)
        .maybeSingle()

      if (orderError) throw new Error("Could not resolve order context for payment")
      orderContext = orderRecord as BkashOrderPaymentContext | null;
      resolvedStoreId = orderContext?.store_id;
    } else {
      const { data: orderRecord, error: orderError } = await supabaseClient
        .from('orders')
        .select('store_id, total, status, payment_method, notes')
        .eq('order_number', order_id)
        .eq('store_id', resolvedStoreId)
        .maybeSingle()

      if (orderError) throw new Error("Could not load tenant-scoped order context for payment")
      orderContext = orderRecord as BkashOrderPaymentContext | null;
    }

    if (!resolvedStoreId || !orderContext) {
      throw new Error("Order context is required for tenant-scoped bKash payment")
    }

    assertBkashOrderAwaitingPayment(orderContext)

    if (action === 'create') {
      const requestedAmount = Number(amount);
      if (Number.isFinite(requestedAmount) && Math.abs(requestedAmount - Number(orderContext.total)) > 0.01) {
        throw new Error("Payment amount does not match the order total");
      }
    }

    const { data: connection, error: connectionError } = await supabaseClient
      .from('store_payment_connections_secure')
      .select('status, public_metadata, secret_payload')
      .eq('store_id', resolvedStoreId)
      .eq('provider', 'bkash')
      .maybeSingle()

    if (connectionError) throw new Error("Could not load payment connection")

    const settings = (connection?.secret_payload ?? {}) as any;
    const metadata = (connection?.public_metadata ?? {}) as any;
    const bkashConfig: BkashConfig = {
      app_key: settings.app_key,
      app_secret: settings.app_secret,
      username: settings.username,
      password: settings.password,
      is_live: metadata.is_live === true
    }

    const operationallyConfigured = connection?.status === 'connected' || connection?.status === 'configured';
    if (!operationallyConfigured || !bkashConfig.app_key || !bkashConfig.app_secret || !bkashConfig.username || !bkashConfig.password) {
      throw new Error("bKash API credentials are not configured in the dashboard")
    }

    const baseURL = bkashConfig.is_live
      ? 'https://tokenized.pay.bka.sh/v1.2.0-beta'
      : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'

    const grantToken = async () => {
      const response = await fetch(`${baseURL}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'username': bkashConfig.username,
          'password': bkashConfig.password,
        },
        body: JSON.stringify({ app_key: bkashConfig.app_key, app_secret: bkashConfig.app_secret })
      });
      const data = await response.json();
      if (data.statusCode !== "0000") throw new Error(`bKash Token Error: ${data.statusMessage}`)
      return data.id_token;
    }

    if (action === 'create') {
      const idToken = await grantToken();
      const callbackUrl = new URL(`${getAllowedOrigin(origin)}/payment/callback`);
      callbackUrl.searchParams.set("provider", "bkash");
      callbackUrl.searchParams.set("order_id", order_id);
      callbackUrl.searchParams.set("store_id", resolvedStoreId);

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
      if (createData.statusCode !== "0000") throw new Error(`bKash Create Error: ${createData.statusMessage}`)
      assertBkashProviderPaymentMatchesOrder(orderContext, order_id, createData)

      if (typeof createData.bkashURL !== 'string' || !createData.bkashURL.trim()) {
        throw new Error("bKash did not return a checkout URL")
      }

      return new Response(JSON.stringify({ success: true, paymentID: createData.paymentID, bkashURL: createData.bkashURL }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (!paymentID || typeof paymentID !== 'string') throw new Error("paymentID is required for execute");
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

    assertBkashProviderPaymentMatchesOrder(orderContext, order_id, executeData, { requireCompleted: true })

    const trxID = String(executeData.trxID).trim();
    const { data: confirmedOrder, error: updateError } = await supabaseClient
      .from('orders')
      .update({ status: 'confirmed', notes: appendBkashPaymentNote(orderContext.notes, trxID) })
      .eq('order_number', order_id)
      .eq('store_id', resolvedStoreId)
      .eq('status', 'pending')
      .eq('payment_method', 'bkash')
      .select('order_number')
      .maybeSingle()

    if (updateError) throw new Error("Payment succeeded but order confirmation failed")
    if (!confirmedOrder) {
      throw new Error(`Payment succeeded but order state changed before confirmation. Contact support with bKash TrxID ${trxID}`)
    }

    return new Response(JSON.stringify({ success: true, trxID, order_number: confirmedOrder.order_number }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})