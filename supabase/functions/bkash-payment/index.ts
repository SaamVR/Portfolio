import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import {
  assertBkashOrderAwaitingPayment,
  assertBkashOrderPaymentMethod,
  assertBkashProviderPaymentMatchesOrder,
  type BkashOrderPaymentContext,
} from "./authority.ts"
import {
  runBkashExecutionLifecycle,
  type ProviderProbe,
} from "./lifecycle.ts"

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

type JsonRecord = Record<string, unknown>;

function firstRow(value: unknown): JsonRecord | null {
  if (Array.isArray(value)) {
    const row = value[0];
    return row && typeof row === 'object' ? row as JsonRecord : null;
  }
  return value && typeof value === 'object' ? value as JsonRecord : null;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeProviderEvidence(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object') return {};
  const source = value as JsonRecord;
  const allowed = [
    'statusCode',
    'statusMessage',
    'paymentID',
    'trxID',
    'transactionStatus',
    'amount',
    'currency',
    'merchantInvoiceNumber',
    'paymentCreateTime',
    'paymentExecuteTime',
  ];
  return Object.fromEntries(allowed.filter((key) => key in source).map((key) => [key, source[key]]));
}

function jsonResponse(body: JsonRecord, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const payload = await req.json();
    const { action, order_id, amount, paymentID, store_id, reason } = payload;

    if (!['create', 'execute', 'release'].includes(action)) {
      throw new Error("Action must be 'create', 'execute', or 'release'");
    }
    if (!order_id || typeof order_id !== 'string') {
      throw new Error('order_id is required');
    }

    let resolvedStoreId = typeof store_id === 'string' && store_id.trim() ? store_id.trim() : undefined;
    let orderContext: BkashOrderPaymentContext | null = null;

    const orderQuery = supabaseClient
      .from('orders')
      .select('store_id, total, status, payment_method, notes, reservation_state, reservation_expires_at')
      .eq('order_number', order_id);
    if (resolvedStoreId) orderQuery.eq('store_id', resolvedStoreId);

    const { data: orderRecord, error: orderError } = await orderQuery.maybeSingle();
    if (orderError) throw new Error('Could not load authoritative order context for payment');
    orderContext = orderRecord as BkashOrderPaymentContext | null;
    resolvedStoreId = resolvedStoreId || orderContext?.store_id;

    if (!resolvedStoreId || !orderContext) {
      throw new Error('Order context is required for tenant-scoped bKash payment');
    }
    assertBkashOrderPaymentMethod(orderContext);

    if (action === 'release') {
      if (!paymentID || typeof paymentID !== 'string') throw new Error('paymentID is required for release');
      const normalizedReason = reason === 'provider_cancelled' ? 'provider_cancelled' : 'provider_failed';
      const { data, error } = await supabaseClient.rpc('release_storefront_payment_session', {
        _store_id: resolvedStoreId,
        _order_number: order_id,
        _provider: 'bkash',
        _provider_payment_id: paymentID,
        _reason: normalizedReason,
      });
      if (error) throw new Error(`Could not release payment reservation: ${error.message}`);
      const released = firstRow(data);
      if (released?.released === true) {
        return jsonResponse({
          success: true,
          reservation_released: true,
          attempt_state: released.attempt_state,
          order_status: released.order_status,
        }, 200, corsHeaders);
      }

      return jsonResponse({
        success: false,
        reservation_released: false,
        attempt_state: released?.attempt_state ?? 'unknown',
        reconciliation_required: ['executing', 'reconciliation_required', 'succeeded'].includes(text(released?.attempt_state)),
        error: 'The payment reservation could not be safely released.',
      }, 200, corsHeaders);
    }

    const { data: connection, error: connectionError } = await supabaseClient
      .from('store_payment_connections_secure')
      .select('status, public_metadata, secret_payload')
      .eq('store_id', resolvedStoreId)
      .eq('provider', 'bkash')
      .maybeSingle();
    if (connectionError) throw new Error('Could not load payment connection');

    const settings = (connection?.secret_payload ?? {}) as JsonRecord;
    const metadata = (connection?.public_metadata ?? {}) as JsonRecord;
    const bkashConfig: BkashConfig = {
      app_key: text(settings.app_key),
      app_secret: text(settings.app_secret),
      username: text(settings.username),
      password: text(settings.password),
      is_live: metadata.is_live === true,
    };

    const operationallyConfigured = connection?.status === 'connected' || connection?.status === 'configured';
    if (!operationallyConfigured || !bkashConfig.app_key || !bkashConfig.app_secret || !bkashConfig.username || !bkashConfig.password) {
      throw new Error('bKash API credentials are not configured in the dashboard');
    }

    const baseURL = bkashConfig.is_live
      ? 'https://tokenized.pay.bka.sh/v1.2.0-beta'
      : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';

    const grantToken = async () => {
      const response = await fetch(`${baseURL}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'username': bkashConfig.username,
          'password': bkashConfig.password,
        },
        body: JSON.stringify({ app_key: bkashConfig.app_key, app_secret: bkashConfig.app_secret }),
      });
      const data = await response.json();
      if (data.statusCode !== '0000') throw new Error(`bKash Token Error: ${data.statusMessage}`);
      return data.id_token as string;
    };

    const providerRequest = async (path: string, idToken: string, body: JsonRecord) => {
      const response = await fetch(`${baseURL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken,
          'X-APP-Key': bkashConfig.app_key,
        },
        body: JSON.stringify(body),
      });
      return await response.json() as JsonRecord;
    };

    if (action === 'create') {
      assertBkashOrderAwaitingPayment(orderContext);
      const requestedAmount = Number(amount);
      if (Number.isFinite(requestedAmount) && Math.abs(requestedAmount - Number(orderContext.total)) > 0.01) {
        throw new Error('Payment amount does not match the order total');
      }

      const { data: preparedData, error: preparedError } = await supabaseClient.rpc('prepare_storefront_payment_attempt', {
        _store_id: resolvedStoreId,
        _order_number: order_id,
        _provider: 'bkash',
      });
      if (preparedError) throw new Error(`Could not prepare payment attempt: ${preparedError.message}`);
      const prepared = firstRow(preparedData);
      if (!prepared) throw new Error('Payment attempt preparation returned no authority record');

      if (prepared.attempt_state === 'created' && text(prepared.provider_payment_id) && text(prepared.checkout_url)) {
        return jsonResponse({
          success: true,
          paymentID: prepared.provider_payment_id,
          bkashURL: prepared.checkout_url,
          replayed: true,
        }, 200, corsHeaders);
      }

      if (prepared.claimed !== true || !text(prepared.attempt_id)) {
        const state = text(prepared.attempt_state) || 'unknown';
        return jsonResponse({
          success: false,
          attempt_state: state,
          reconciliation_required: state === 'reconciliation_required',
          error: state === 'order_expired'
            ? 'This order reservation expired. Return to checkout to create a fresh order.'
            : 'A payment session already exists or is still being prepared for this order.',
        }, 200, corsHeaders);
      }

      const attemptId = text(prepared.attempt_id);
      const failCreation = async (failureReason: string) => {
        try {
          await supabaseClient.rpc('fail_storefront_payment_creation', {
            _attempt_id: attemptId,
            _reason: failureReason.slice(0, 500),
          });
        } catch {
          // The order reservation lease still bounds any orphaned create claim.
        }
      };

      let createData: JsonRecord;
      try {
        const idToken = await grantToken();
        const callbackUrl = new URL(`${getAllowedOrigin(origin)}/payment/callback`);
        callbackUrl.searchParams.set('provider', 'bkash');
        callbackUrl.searchParams.set('order_id', order_id);
        callbackUrl.searchParams.set('store_id', resolvedStoreId);

        createData = await providerRequest('/tokenized/checkout/create', idToken, {
          mode: '0011',
          payerReference: ' ',
          callbackURL: callbackUrl.toString(),
          amount: Number(orderContext.total).toString(),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: order_id,
        });
      } catch (error) {
        await failCreation(error instanceof Error ? `provider_create_transport:${error.message}` : 'provider_create_transport');
        throw error;
      }

      if (createData.statusCode !== '0000') {
        await failCreation(`provider_create_failed:${text(createData.statusMessage) || text(createData.statusCode)}`);
        throw new Error(`bKash Create Error: ${createData.statusMessage}`);
      }
      assertBkashProviderPaymentMatchesOrder(orderContext, order_id, createData);

      const providerPaymentId = text(createData.paymentID);
      const checkoutUrl = text(createData.bkashURL);
      if (!providerPaymentId || !checkoutUrl) {
        await failCreation('provider_create_missing_identity_or_url');
        throw new Error('bKash did not return a payment ID and checkout URL');
      }

      const { data: bound, error: bindError } = await supabaseClient.rpc('bind_storefront_payment_attempt', {
        _attempt_id: attemptId,
        _provider_payment_id: providerPaymentId,
        _checkout_url: checkoutUrl,
        _provider_evidence: safeProviderEvidence(createData),
      });
      if (bindError || bound !== true) {
        await failCreation(`provider_create_bind_failed:${bindError?.message ?? 'reservation_closed'}`);
        throw new Error('bKash session was created but could not be bound to the active order reservation. Start a fresh payment.');
      }

      return jsonResponse({ success: true, paymentID: providerPaymentId, bkashURL: checkoutUrl, replayed: false }, 200, corsHeaders);
    }

    if (!paymentID || typeof paymentID !== 'string') throw new Error('paymentID is required for execute');

    // Token grant is reversible/non-charging and intentionally happens before
    // the durable execute claim. The claim itself is still committed before the
    // first request to bKash /execute.
    const idToken = await grantToken();

    const queryProvider = async (): Promise<ProviderProbe> => {
      try {
        const data = await providerRequest('/tokenized/checkout/payment/status', idToken, { paymentID });
        const evidence = safeProviderEvidence(data);
        const transactionStatus = text(data.transactionStatus).toLowerCase();
        if (data.statusCode === '0000' && transactionStatus === 'completed') {
          assertBkashProviderPaymentMatchesOrder(orderContext!, order_id, data, { requireCompleted: true });
          return { kind: 'completed', trxId: text(data.trxID), evidence };
        }
        if (transactionStatus === 'failed' || transactionStatus === 'cancelled' || transactionStatus === 'canceled') {
          return { kind: 'failed', evidence };
        }
        if (data.statusCode === '0000' && transactionStatus === 'initiated') {
          return { kind: 'pending', evidence };
        }
        return {
          kind: 'unknown',
          reason: text(data.statusMessage) || text(data.statusCode) || 'query_status_unknown',
          evidence,
        };
      } catch (error) {
        return {
          kind: 'unknown',
          reason: error instanceof Error ? error.message : 'query_transport_unknown',
          evidence: {},
        };
      }
    };

    const result = await runBkashExecutionLifecycle({
      claim: async () => {
        const { data, error } = await supabaseClient.rpc('claim_storefront_payment_execution', {
          _store_id: resolvedStoreId,
          _order_number: order_id,
          _provider: 'bkash',
          _provider_payment_id: paymentID,
        });
        if (error) throw new Error(`Could not claim payment execution: ${error.message}`);
        return firstRow(data) ?? { attempt_state: 'missing', claimed: false };
      },
      executeProvider: async () => {
        const data = await providerRequest('/tokenized/checkout/execute', idToken, { paymentID });
        const evidence = safeProviderEvidence(data);
        if (data.statusCode === '0000') {
          assertBkashProviderPaymentMatchesOrder(orderContext!, order_id, data, { requireCompleted: true });
          return { kind: 'completed' as const, trxId: text(data.trxID), evidence };
        }
        return { kind: 'failed' as const, evidence };
      },
      queryProvider,
      finalize: async (attemptId, trxId, evidence) => {
        const { data, error } = await supabaseClient.rpc('finalize_storefront_payment_success', {
          _attempt_id: attemptId,
          _provider_payment_id: paymentID,
          _provider_transaction_id: trxId,
          _provider_evidence: evidence,
        });
        if (error) throw new Error(error.message);
        const row = firstRow(data);
        if (!row) throw new Error('Payment finalization returned no authority record');
        return {
          finalized: row.finalized === true,
          attemptState: text(row.attempt_state) || 'unknown',
          orderNumber: text(row.order_number) || order_id,
          trxId: text(row.provider_transaction_id) || trxId,
        };
      },
      markReconciliation: async (attemptId, reconciliationReason, evidence) => {
        const { error } = await supabaseClient.rpc('mark_storefront_payment_reconciliation_required', {
          _attempt_id: attemptId,
          _reason: reconciliationReason.slice(0, 500),
          _provider_evidence: evidence,
        });
        if (error) throw new Error(error.message);
      },
      failExecution: async (attemptId, failureReason, evidence) => {
        const { error } = await supabaseClient.rpc('fail_storefront_payment_execution', {
          _attempt_id: attemptId,
          _reason: failureReason.slice(0, 500),
          _provider_evidence: evidence,
        });
        if (error) throw new Error(error.message);
      },
    });

    if (result.kind === 'success') {
      return jsonResponse({
        success: true,
        trxID: result.trxId,
        order_number: result.orderNumber,
        idempotent: result.idempotent,
      }, 200, corsHeaders);
    }

    if (result.kind === 'failed') {
      return jsonResponse({
        success: false,
        final_failure: true,
        reservation_released: true,
        retryable: false,
        error: result.message,
      }, 200, corsHeaders);
    }

    if (result.kind === 'reconciliation_required') {
      return jsonResponse({
        success: false,
        reconciliation_required: true,
        retryable: false,
        error: result.message,
      }, 200, corsHeaders);
    }

    if (result.kind === 'processing') {
      return jsonResponse({
        success: false,
        payment_processing: true,
        retryable: false,
        error: result.message,
      }, 200, corsHeaders);
    }

    return jsonResponse({
      success: false,
      stale_payment_session: true,
      attempt_state: result.state,
      retryable: false,
      error: result.message,
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 400, corsHeaders);
  }
});
