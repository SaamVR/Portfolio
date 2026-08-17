-- Rollback-only cross-tenant RLS smoke test.
-- Proves that one merchant cannot read or mutate another unpublished store's
-- sensitive operational data through authenticated database access.

begin;

set local app.settings.edge_function_url = 'http://localhost';
set local app.settings.service_role_key = 'test-key';

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not condition then
    raise exception '%', message;
  end if;
end;
$$;

create or replace function pg_temp.set_authenticated_user(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.aud', 'authenticated', true);
end;
$$;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('41000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'tenant-a@example.com', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('41000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'tenant-b@example.com', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.cms_plans (id, name, description, monthly_price, currency_code, is_active, sort_order)
values ('cross-tenant-smoke-plan', 'Cross Tenant Smoke', 'Temporary plan for tenant isolation smoke tests.', 0, 'BDT', true, 1999)
on conflict (id) do nothing;

insert into public.stores (
  id, owner_id, name, slug, description, currency_code, locale, plan, store_type, is_published
)
values
  ('42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'Tenant A Store', 'tenant-a-smoke', 'Tenant A isolation store.', 'BDT', 'en-BD', 'basic', 'general', false),
  ('42000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000002', 'Tenant B Store', 'tenant-b-smoke', 'Tenant B isolation store.', 'BDT', 'en-BD', 'basic', 'general', false);

insert into public.store_memberships (store_id, user_id, role, invited_by)
values
  ('42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'owner', '41000000-0000-4000-8000-000000000001'),
  ('42000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000002', 'owner', '41000000-0000-4000-8000-000000000002');

insert into public.store_subscriptions (store_id, plan_id, status)
values
  ('42000000-0000-4000-8000-000000000001', 'cross-tenant-smoke-plan', 'trialing'),
  ('42000000-0000-4000-8000-000000000002', 'cross-tenant-smoke-plan', 'trialing')
on conflict (store_id) do update set plan_id = excluded.plan_id, status = excluded.status;

insert into public.products (
  id, store_id, name, price, image_url, description, category, type, stock, is_available
)
values
  ('43000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', 'Tenant A Product', 100, 'https://example.com/a.png', 'A-only product', 'Smoke', 'Test', 10, true),
  ('43000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000002', 'Tenant B Product', 200, 'https://example.com/b.png', 'B-only product', 'Smoke', 'Test', 10, true);

insert into public.site_settings (id, store_id, key, value)
values
  ('43000000-0000-4000-8000-000000000011', '42000000-0000-4000-8000-000000000001', 'cross_tenant_secret', '{"owner":"a"}'::jsonb),
  ('43000000-0000-4000-8000-000000000012', '42000000-0000-4000-8000-000000000002', 'cross_tenant_secret', '{"owner":"b"}'::jsonb);

insert into public.orders (
  id, store_id, user_id, order_number, status, items, subtotal, delivery_fee, total,
  customer_name, customer_phone, shipping_address, shipping_city, payment_method
)
values
  ('43000000-0000-4000-8000-000000000021', '42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'TENANT-A-ORDER', 'pending', '[]'::jsonb, 100, 0, 100, 'Tenant A Customer', '01700000001', 'A address', 'Dhaka', 'cod'),
  ('43000000-0000-4000-8000-000000000022', '42000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000002', 'TENANT-B-ORDER', 'pending', '[]'::jsonb, 200, 0, 200, 'Tenant B Customer', '01700000002', 'B address', 'Chattogram', 'cod');

insert into public.store_invoices (id, store_id, plan_id, amount, currency, status)
values
  ('43000000-0000-4000-8000-000000000031', '42000000-0000-4000-8000-000000000001', 'cross-tenant-smoke-plan', 0, 'BDT', 'pending'),
  ('43000000-0000-4000-8000-000000000032', '42000000-0000-4000-8000-000000000002', 'cross-tenant-smoke-plan', 0, 'BDT', 'pending');

create or replace function pg_temp.assert_tenant_isolated(
  actor_user uuid,
  actor_store uuid,
  foreign_store uuid,
  actor_product uuid,
  foreign_product uuid,
  foreign_setting uuid,
  foreign_order uuid,
  foreign_invoice uuid,
  label text
)
returns void
language plpgsql
as $$
declare
  actual_count integer;
  affected integer;
begin
  perform pg_temp.set_authenticated_user(actor_user);

  perform pg_temp.assert_true(public.can_manage_store(actor_store, actor_user), format('%s must manage own store', label));
  perform pg_temp.assert_true(not public.can_manage_store(foreign_store, actor_user), format('%s unexpectedly manages foreign store', label));

  select count(*) into actual_count from public.products where id = actor_product;
  perform pg_temp.assert_true(actual_count = 1, format('%s cannot read own product control row', label));

  select count(*) into actual_count from public.products where id = foreign_product;
  perform pg_temp.assert_true(actual_count = 0, format('%s can read foreign product', label));
  update public.products set price = price + 999 where id = foreign_product;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected = 0, format('%s can update foreign product', label));

  select count(*) into actual_count from public.site_settings where id = foreign_setting;
  perform pg_temp.assert_true(actual_count = 0, format('%s can read foreign site settings', label));
  update public.site_settings set value = '{"compromised":true}'::jsonb where id = foreign_setting;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected = 0, format('%s can update foreign site settings', label));

  select count(*) into actual_count from public.orders where id = foreign_order;
  perform pg_temp.assert_true(actual_count = 0, format('%s can read foreign order', label));
  update public.orders set notes = 'cross-tenant-write' where id = foreign_order;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected = 0, format('%s can update foreign order', label));

  select count(*) into actual_count from public.store_invoices where id = foreign_invoice;
  perform pg_temp.assert_true(actual_count = 0, format('%s can read foreign invoice', label));
  update public.store_invoices set status = 'paid' where id = foreign_invoice;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected = 0, format('%s can mutate foreign invoice', label));

  select count(*) into actual_count from public.store_subscriptions where store_id = foreign_store;
  perform pg_temp.assert_true(actual_count = 0, format('%s can read foreign subscription', label));

  select count(*) into actual_count from public.store_memberships where store_id = foreign_store;
  perform pg_temp.assert_true(actual_count = 0, format('%s can enumerate foreign store memberships', label));
end;
$$;

set local role authenticated;

select pg_temp.assert_tenant_isolated(
  '41000000-0000-4000-8000-000000000001',
  '42000000-0000-4000-8000-000000000001',
  '42000000-0000-4000-8000-000000000002',
  '43000000-0000-4000-8000-000000000001',
  '43000000-0000-4000-8000-000000000002',
  '43000000-0000-4000-8000-000000000012',
  '43000000-0000-4000-8000-000000000022',
  '43000000-0000-4000-8000-000000000032',
  'tenant A'
);

select pg_temp.assert_tenant_isolated(
  '41000000-0000-4000-8000-000000000002',
  '42000000-0000-4000-8000-000000000002',
  '42000000-0000-4000-8000-000000000001',
  '43000000-0000-4000-8000-000000000002',
  '43000000-0000-4000-8000-000000000001',
  '43000000-0000-4000-8000-000000000011',
  '43000000-0000-4000-8000-000000000021',
  '43000000-0000-4000-8000-000000000031',
  'tenant B'
);

rollback;
