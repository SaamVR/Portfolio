# Payment checkout recovery

Storefront order creation is authoritative and inventory-reserving. Redirect-payment retries therefore reuse the original checkout request key instead of creating another order.

## Order replay contract

- `create_store_order_with_stock_v2` serializes each `(store_id, client_request_id)` attempt.
- A matching retry returns the existing persisted order with `replayed = true`.
- A changed payment method, customer/shipping payload, item identity, notes, delivery fee, or effective discount conflicts instead of mutating/reinterpreting the existing order.
- A cancelled attempt cannot be replayed with the same key.
- Fresh creation still delegates to `create_store_order_with_stock`, so price, stock, coupon and inventory authority remain unchanged.
- `/api/orders/create` returns the persisted `payment_method` and skips order-created notification/analytics/revenue/recovery work when `replayed = true`.

## Redirect lifecycle

Before a successfully initialized redirect leaves the storefront, the generic payment runtime snapshots the store-scoped normal cart and Buy Now payload in session storage, together with which source produced the checkout.

- Provider initialization failure: the order remains reserved and the browser keeps its current checkout state. Retry the same payment method with the same request key.
- Explicit provider cancellation/failure: the callback restores the exact pre-redirect browser checkout state and marks the result retry-safe.
- Ambiguous verification/settlement error: checkout state is restored, but the result is not declared retry-safe because a charge may already have occurred. The shopper is told not to pay again if charged and to contact the store with the order number.
- Verified payment success: only the purchased source is finalized. Normal-cart checkout clears the store-scoped browser cart and the signed-in customer's RLS-scoped DB cart; Buy Now checkout clears only its Buy Now payload and preserves the normal cart.
- Recovery snapshots are single-use and expire after 24 hours so an old callback cannot overwrite a shopper's later cart changes.

The legacy cart instant-checkout modal now routes into the canonical checkout instead of maintaining its own direct bKash/order engine.

Switching payment methods for an already-reserved order intentionally fails closed. A future explicit cancel/release flow may offer that choice, but the browser must never reinterpret an existing reserved order under another payment method.