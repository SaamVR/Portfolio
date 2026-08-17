-- Rollback-only launch smoke for the customer checkout transaction.
begin;

set local app.settings.edge_function_url = 'http://localhost';
set local app.settings.service_role_key = 'test-key';

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not condition then raise exception '%', message; end if;
end;
$$;

create or replace function pg_temp.expect_invalid_checkout(
  p_store_id uuid,
  p_request_id text,
  p_items jsonb
)
returns void language plpgsql as $$
begin
  begin
    perform * from public.create_store_order_with_stock(
      p_store_id,
      p_request_id,
      null,
      p_items,
      60,
      0,
      'Smoke Buyer',
      '01700000000',
      'buyer@example.com',
      'Smoke address',
      'Dhaka',
      'cod',
      null,
      null
    );
    raise exception 'unsafe checkout unexpectedly succeeded: %', p_request_id;
  exception
    when sqlstate '22023' then null;
  end;
end;
$$;

insert into public.stores (
  id, name, slug, description, currency_code, locale, plan, store_type, is_published
)
values
  ('41000000-0000-4000-8000-000000000001', 'Checkout Smoke A', 'checkout-smoke-a', 'Checkout smoke A', 'BDT', 'en-BD', 'basic', 'general', true),
  ('41000000-0000-4000-8000-000000000002', 'Checkout Smoke B', 'checkout-smoke-b', 'Checkout smoke B', 'BDT', 'en-BD', 'basic', 'general', true);

insert into public.products (
  id, store_id, name, price, image_url, description, category, type, stock, is_available
)
values
  ('42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'Smoke Product A', 500, 'https://example.com/a.png', 'A', 'Smoke', 'Test', 5, true),
  ('42000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000002', 'Smoke Product B', 700, 'https://example.com/b.png', 'B', 'Smoke', 'Test', 4, true);

-- First checkout decrements stock and creates one durable order.
select * from public.create_store_order_with_stock(
  '41000000-0000-4000-8000-000000000001',
  'checkout-smoke-idempotent',
  null,
  '[{"productId":"42000000-0000-4000-8000-000000000001","size":"M","quantity":2}]'::jsonb,
  60,
  0,
  'Smoke Buyer',
  '01700000000',
  'buyer@example.com',
  'Smoke address',
  'Dhaka',
  'cod',
  null,
  null
);

select pg_temp.assert_true(
  (select stock from public.products where id = '42000000-0000-4000-8000-000000000001') = 3,
  'first checkout must decrement stock exactly once'
);
select pg_temp.assert_true(
  (select count(*) from public.orders where store_id = '41000000-0000-4000-8000-000000000001' and client_request_id = 'checkout-smoke-idempotent') = 1,
  'first checkout must create exactly one order'
);

-- Browser refresh/double-submit with the same key must return the durable order
-- without touching stock again.
select * from public.create_store_order_with_stock(
  '41000000-0000-4000-8000-000000000001',
  'checkout-smoke-idempotent',
  null,
  '[{"productId":"42000000-0000-4000-8000-000000000001","size":"M","quantity":2}]'::jsonb,
  60,
  0,
  'Smoke Buyer',
  '01700000000',
  'buyer@example.com',
  'Smoke address',
  'Dhaka',
  'cod',
  null,
  null
);

select pg_temp.assert_true(
  (select stock from public.products where id = '42000000-0000-4000-8000-000000000001') = 3,
  'duplicate checkout must not decrement stock twice'
);
select pg_temp.assert_true(
  (select count(*) from public.orders where store_id = '41000000-0000-4000-8000-000000000001' and client_request_id = 'checkout-smoke-idempotent') = 1,
  'duplicate checkout must not create a second order'
);

-- A Store A checkout may not smuggle a Store B product into the cart.
select pg_temp.expect_invalid_checkout(
  '41000000-0000-4000-8000-000000000001',
  'checkout-smoke-cross-store',
  '[{"productId":"42000000-0000-4000-8000-000000000002","size":"M","quantity":1}]'::jsonb
);
select pg_temp.assert_true(
  (select stock from public.products where id = '42000000-0000-4000-8000-000000000002') = 4,
  'cross-store checkout attempt must not mutate the other store product'
);
select pg_temp.assert_true(
  (select count(*) from public.orders where client_request_id = 'checkout-smoke-cross-store') = 0,
  'cross-store checkout attempt must not create an order'
);

-- Out-of-stock checkout must roll back without a partial order or stock mutation.
select pg_temp.expect_invalid_checkout(
  '41000000-0000-4000-8000-000000000001',
  'checkout-smoke-out-of-stock',
  '[{"productId":"42000000-0000-4000-8000-000000000001","size":"M","quantity":4}]'::jsonb
);
select pg_temp.assert_true(
  (select stock from public.products where id = '42000000-0000-4000-8000-000000000001') = 3,
  'out-of-stock checkout must leave stock unchanged'
);
select pg_temp.assert_true(
  (select count(*) from public.orders where client_request_id = 'checkout-smoke-out-of-stock') = 0,
  'out-of-stock checkout must not create a partial order'
);

rollback;
