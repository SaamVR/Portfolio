-- Order creation must remain authoritative: customer/browser roles must use
-- /api/orders/create, which invokes create_store_order_with_stock as service_role.
-- Direct table inserts can bypass server-side price, stock, coupon, idempotency,
-- publish/entitlement, and notification orchestration checks.

DROP POLICY IF EXISTS "Customers can create store orders" ON public.orders;

REVOKE INSERT ON TABLE public.orders FROM anon, authenticated;
