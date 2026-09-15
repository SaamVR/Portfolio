-- Rollback-only RLS smoke tests for tenant manager policies.
-- Run this against a local/dev Supabase Postgres using psql.
--
-- Coverage:
-- - owner
-- - store admin
-- - editor
-- - viewer
-- - unrelated authenticated user
-- - platform admin
--
-- The target store remains unpublished so access to the tested rows depends on
-- real tenant membership policies instead of public storefront reads.

begin;

-- Mock settings required by trigger handle_order_notifications()
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

create or replace function pg_temp.assert_actor_access(
  test_user uuid,
  label text,
  expected_manage boolean,
  expected_product_rows integer,
  expected_setting_rows integer,
  expected_order_rows integer,
  expected_order_updates integer,
  expected_category_rows integer,
  expected_type_rows integer,
  expected_theme_rows integer,
  expected_invoice_rows integer,
  expected_subscription_rows integer
)
returns void
language plpgsql
as $$
declare
  store_id constant uuid := '20000000-0000-4000-8000-000000000001';
  product_id constant uuid := '30000000-0000-4000-8000-000000000001';
  setting_id constant uuid := '30000000-0000-4000-8000-000000000002';
  order_id constant uuid := '30000000-0000-4000-8000-000000000003';
  category_id constant uuid := '30000000-0000-4000-8000-000000000004';
  type_id constant uuid := '30000000-0000-4000-8000-000000000005';
  theme_id constant uuid := '30000000-0000-4000-8000-000000000006';
  invoice_id constant uuid := '30000000-0000-4000-8000-000000000007';
  actual_count integer;
  affected integer;
begin
  perform pg_temp.set_authenticated_user(test_user);

  perform pg_temp.assert_true(
    public.can_manage_store(store_id, test_user) = expected_manage,
    format('%s can_manage_store mismatch', label)
  );

  select count(*) into actual_count from public.products where id = product_id;
  perform pg_temp.assert_true(actual_count = expected_product_rows, format('%s product select mismatch', label));
  update public.products set price = price + 1 where id = product_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected = expected_product_rows, format('%s product update mismatch', label));

  select count(*) into actual_count from public.site_settings where id = setting_id;
  perform pg_temp.assert_true(actual_count = expected_setting_rows, format('%s site_settings select mismatch', label));
  update public.site_settings set value = jsonb_build_object('last_actor', label) where id = setting_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected = expected_setting_rows, format('%s site_settings update mismatch', label));

  select count(*) into actual_count from public.orders where id = order_id;
  perform pg_temp.assert_true(actual_count = expected_order_rows, format('%s orders select mismatch', label));
  affected := 0;
  begin
    update public.orders set notes = label where id = order_id;
    get diagnostics affected = row_count;
  exception
    when insufficient_privilege then affected := 0;
  end;
  perform pg_temp.assert_true(affected = expected_order_updates, format('%s direct orders update authority mismatch', label));

  select count(*) into actual_count from public.product_categories where id = category_id;
  perform pg_temp.assert_true(actual_count = expected_category_rows, format('%s product_categories select mismatch', label));
  update public.product_categories set sort_order = sort_order + 1 where id = category_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected = expected_category_rows, format('%s product_categories update mismatch', label));

  select count(*) into actual_count from public.product_types where id = type_id;
  perform pg_temp.assert_true(actual_count = expected_type_rows, format('%s product_types select mismatch', label));
  update public.product_types set sort_order = sort_order + 1 where id = type_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected = expected_type_rows, format('%s product_types update mismatch', label));

  select count(*) into actual_count from public.store_themes where id = theme_id;
  perform pg_temp.assert_true(actual_count = expected_theme_rows, format('%s store_themes select mismatch', label));
  update public.store_themes set preset_id = label where id = theme_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected = expected_theme_rows, format('%s store_themes update mismatch', label));

  select count(*) into actual_count from public.store_invoices where id = invoice_id;
  perform pg_temp.assert_true(actual_count = expected_invoice_rows, format('%s store_invoices select mismatch', label));

  begin
    update public.store_invoices
    set status = case when status = 'pending' then 'paid' else 'pending' end
    where id = invoice_id;
    raise exception '% store_invoices update unexpectedly succeeded', label;
  exception
    when insufficient_privilege then null;
  end;

  select count(*) into actual_count
  from public.store_subscriptions
  where store_subscriptions.store_id = '20000000-0000-4000-8000-000000000001';
  perform pg_temp.assert_true(
    actual_count = expected_subscription_rows,
    format('%s store_subscriptions select mismatch', label)
  );
end;
$$;

create or replace function pg_temp.assert_subscription_mutations_denied(
  test_user uuid,
  label text
)
returns void
language plpgsql
as $$
declare
  target_store_id constant uuid := '20000000-0000-4000-8000-000000000001';
begin
  perform pg_temp.set_authenticated_user(test_user);

  begin
    update public.store_subscriptions
    set plan_id = 'rls-smoke-upgrade-plan'
    where store_id = target_store_id;
    raise exception '% unexpectedly self-upgraded a subscription', label;
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.store_subscriptions
    set status = 'active'
    where store_id = target_store_id;
    raise exception '% unexpectedly reactivated a subscription', label;
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.store_subscriptions
    set current_period_ends_at = now() + interval '1 year'
    where store_id = target_store_id;
    raise exception '% unexpectedly extended a billing period', label;
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.store_subscriptions
    where store_id = target_store_id;
    raise exception '% unexpectedly deleted a subscription', label;
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

create or replace function pg_temp.assert_billing_authority_mutations_denied(
  test_user uuid,
  label text
)
returns void
language plpgsql
as $$
declare
  target_store_id constant uuid := '20000000-0000-4000-8000-000000000001';
  target_invoice_id constant uuid := '30000000-0000-4000-8000-000000000007';
  affected integer;
begin
  perform pg_temp.set_authenticated_user(test_user);

  begin
    update public.store_invoices set status = 'paid' where id = target_invoice_id;
    raise exception '% unexpectedly transitioned an invoice to paid', label;
  exception when insufficient_privilege then null;
  end;

  begin
    update public.store_invoices set amount = 1 where id = target_invoice_id;
    raise exception '% unexpectedly changed invoice amount', label;
  exception when insufficient_privilege then null;
  end;

  begin
    update public.store_invoices set plan_id = 'rls-smoke-upgrade-plan' where id = target_invoice_id;
    raise exception '% unexpectedly changed invoice plan', label;
  exception when insufficient_privilege then null;
  end;

  begin
    update public.store_invoices set provider = 'attacker' where id = target_invoice_id;
    raise exception '% unexpectedly changed invoice provider', label;
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.store_invoices (
      store_id, plan_id, amount, currency, status, provider, provider_invoice_id
    ) values (
      target_store_id, 'rls-smoke-upgrade-plan', 1, 'BDT', 'paid', 'attacker', 'ATTACK-PAID'
    );
    raise exception '% unexpectedly inserted a paid invoice', label;
  exception when insufficient_privilege then null;
  end;

  affected := 0;
  begin
    update public.stores set plan = 'rls-smoke-upgrade-plan' where id = target_store_id;
    get diagnostics affected = row_count;
    if affected > 0 then
      raise exception '% unexpectedly changed legacy stores.plan', label;
    end if;
  exception when insufficient_privilege then null;
  end;
end;
$$;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner-rls@example.com', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'admin-rls@example.com', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'editor-rls@example.com', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'viewer-rls@example.com', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'outsider-rls@example.com', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'platform-admin-rls@example.com', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.user_roles (user_id, role)
values ('10000000-0000-4000-8000-000000000006', 'admin');

insert into public.cms_plans (
  id, name, description, monthly_price, currency_code, is_active, sort_order, feature_flags
)
values
  ('rls-smoke-plan', 'RLS Smoke Plan', 'Temporary plan for RLS smoke tests.', 0, 'BDT', true, 999, '{"staff":5}'::jsonb),
  ('rls-smoke-upgrade-plan', 'RLS Smoke Upgrade Plan', 'Unauthorized upgrade target.', 1000, 'BDT', true, 1000, '{"staff":5}'::jsonb)
on conflict (id) do nothing;

insert into public.stores (
  id,
  owner_id,
  name,
  slug,
  description,
  currency_code,
  locale,
  plan,
  store_type,
  is_published
)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'RLS Smoke Store',
  'rls-smoke-store',
  'Unpublished store used for tenant RLS checks.',
  'BDT',
  'en-BD',
  'rls-smoke-plan',
  'general',
  false
);

insert into public.store_subscriptions (store_id, plan_id, status)
values ('20000000-0000-4000-8000-000000000001', 'rls-smoke-plan', 'trialing')
on conflict (store_id) do update set plan_id = excluded.plan_id;

insert into public.store_memberships (store_id, user_id, role, invited_by)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'admin', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'editor', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'viewer', '10000000-0000-4000-8000-000000000001');

insert into public.products (
  id,
  store_id,
  name,
  price,
  image_url,
  description,
  category,
  type,
  stock,
  is_available
)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'RLS Smoke Product',
  500,
  'https://example.com/smoke-product.png',
  'Tenant product for RLS checks.',
  'Smoke',
  'Test',
  10,
  true
);

insert into public.site_settings (id, store_id, key, value)
values (
  '30000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  'hero_section',
  '{"enabled": true}'::jsonb
);

insert into public.orders (
  id,
  store_id,
  user_id,
  order_number,
  status,
  items,
  subtotal,
  delivery_fee,
  total,
  customer_name,
  customer_phone,
  shipping_address,
  shipping_city,
  payment_method
)
values (
  '30000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'RLS-SMOKE-ORDER',
  'pending',
  '[{"productId":"30000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,
  500,
  50,
  550,
  'Viewer Customer',
  '01700000000',
  'Smoke Address',
  'Dhaka',
  'cod'
);

insert into public.product_categories (id, store_id, name, sort_order)
values (
  '30000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000001',
  'Smoke Category',
  1
);

insert into public.product_types (id, store_id, name, sort_order)
values (
  '30000000-0000-4000-8000-000000000005',
  '20000000-0000-4000-8000-000000000001',
  'Smoke Type',
  1
);

insert into public.store_themes (id, store_id, preset_id, mode)
values (
  '30000000-0000-4000-8000-000000000006',
  '20000000-0000-4000-8000-000000000001',
  'default',
  'dark'
);

insert into public.store_invoices (
  id,
  store_id,
  plan_id,
  amount,
  currency,
  status
)
values (
  '30000000-0000-4000-8000-000000000007',
  '20000000-0000-4000-8000-000000000001',
  'rls-smoke-plan',
  0,
  'BDT',
  'pending'
);

set local role authenticated;

select pg_temp.assert_actor_access(
  '10000000-0000-4000-8000-000000000001',
  'owner',
  true,
  1,
  1,
  1,
  0,
  1,
  1,
  1,
  1,
  1
);

select pg_temp.assert_actor_access(
  '10000000-0000-4000-8000-000000000002',
  'store_admin',
  true,
  1,
  1,
  1,
  0,
  1,
  1,
  1,
  1,
  1
);

select pg_temp.assert_actor_access(
  '10000000-0000-4000-8000-000000000003',
  'editor',
  true,
  1,
  1,
  1,
  0,
  1,
  1,
  1,
  0,
  0
);

select pg_temp.assert_actor_access(
  '10000000-0000-4000-8000-000000000004',
  'viewer',
  false,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  1
);

select pg_temp.assert_actor_access(
  '10000000-0000-4000-8000-000000000005',
  'outsider',
  false,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0
);

select pg_temp.assert_actor_access(
  '10000000-0000-4000-8000-000000000006',
  'platform_admin',
  true,
  1,
  1,
  1,
  0,
  1,
  1,
  1,
  1,
  1
);

select pg_temp.assert_subscription_mutations_denied(
  '10000000-0000-4000-8000-000000000001',
  'owner'
);

select pg_temp.assert_subscription_mutations_denied(
  '10000000-0000-4000-8000-000000000002',
  'store_admin'
);

select pg_temp.assert_subscription_mutations_denied(
  '10000000-0000-4000-8000-000000000006',
  'platform_admin_client'
);

select pg_temp.assert_billing_authority_mutations_denied(
  '10000000-0000-4000-8000-000000000001',
  'owner'
);

select pg_temp.assert_billing_authority_mutations_denied(
  '10000000-0000-4000-8000-000000000002',
  'store_admin'
);

select pg_temp.assert_billing_authority_mutations_denied(
  '10000000-0000-4000-8000-000000000003',
  'editor'
);

select pg_temp.assert_billing_authority_mutations_denied(
  '10000000-0000-4000-8000-000000000006',
  'platform_admin_client'
);

select 'RLS smoke checks passed' as result;

rollback;
