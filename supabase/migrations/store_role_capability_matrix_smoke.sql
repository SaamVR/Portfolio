-- Rollback-only P1 #324 capability-matrix smoke.
-- Run only after the store_role_capability_matrix_324 migrations are applied.
-- Proves owner/admin administration, editor content/fulfillment scope, viewer
-- read-only scope, unrelated-store denial, and platform-admin bypass.

begin;

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

create or replace function pg_temp.assert_count(sql_text text, expected integer, message text)
returns void
language plpgsql
as $$
declare
  actual integer;
begin
  execute format('select count(*) from (%s) q', sql_text) into actual;
  if actual <> expected then
    raise exception '% (expected %, got %)', message, expected, actual;
  end if;
end;
$$;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('11000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rbac-owner@example.com', 'unused', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('11000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rbac-admin@example.com', 'unused', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('11000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'rbac-editor@example.com', 'unused', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('11000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'rbac-viewer@example.com', 'unused', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('11000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'rbac-outsider@example.com', 'unused', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('11000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'rbac-platform@example.com', 'unused', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.user_roles (user_id, role)
values ('11000000-0000-4000-8000-000000000006', 'admin');

insert into public.stores (id, owner_id, name, slug, is_published)
values
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'RBAC Store', 'rbac-smoke-store', false),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000005', 'Other RBAC Store', 'rbac-smoke-other-store', false);

insert into public.store_subscriptions (store_id, plan_id, status)
values
  ('21000000-0000-4000-8000-000000000001', 'pro', 'active'),
  ('21000000-0000-4000-8000-000000000002', 'pro', 'active');

insert into public.store_memberships (store_id, user_id, role, invited_by)
values
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'owner', '11000000-0000-4000-8000-000000000001'),
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', 'admin', '11000000-0000-4000-8000-000000000001'),
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', 'editor', '11000000-0000-4000-8000-000000000001'),
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000004', 'viewer', '11000000-0000-4000-8000-000000000001'),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000005', 'owner', '11000000-0000-4000-8000-000000000005');

insert into public.products (id, store_id, name, price, image_url, stock, is_available)
values ('31000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'RBAC Product', 500, 'https://example.com/rbac.png', 5, true);

insert into public.site_settings (id, store_id, key, value)
values
  ('31000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', 'hero_section', '{"title":"RBAC"}'::jsonb),
  ('31000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000001', 'payment_settings', '{"bkash":true}'::jsonb);

insert into public.store_domains (id, store_id, hostname, status)
values ('31000000-0000-4000-8000-000000000004', '21000000-0000-4000-8000-000000000001', 'rbac-smoke.example.com', 'pending_verification');

insert into public.store_courier_connections (id, store_id, provider, display_name)
values ('31000000-0000-4000-8000-000000000005', '21000000-0000-4000-8000-000000000001', 'pathao', 'RBAC Courier');

insert into public.storefront_releases (
  id, store_id, release_number, schema_version, snapshot, label, published_by
)
values (
  '31000000-0000-4000-8000-000000000006',
  '21000000-0000-4000-8000-000000000001',
  1,
  1,
  '{}'::jsonb,
  'RBAC release',
  '11000000-0000-4000-8000-000000000001'
);

set local role service_role;
insert into public.store_preview_tokens (store_id, created_by, expires_at)
values ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', now() + interval '1 hour');
reset role;

set local role authenticated;

-- Owner: full tenant administration.
select pg_temp.set_authenticated_user('11000000-0000-4000-8000-000000000001');
select pg_temp.assert_true(public.can_manage_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'owner must manage store');
select pg_temp.assert_true(public.can_administer_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'owner must administer store');
select pg_temp.assert_true(public.can_view_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'owner must view store');
select pg_temp.assert_count('select id from public.store_domains where store_id = ''21000000-0000-4000-8000-000000000001''', 1, 'owner domain read');
select pg_temp.assert_count('select id from public.store_courier_connections where store_id = ''21000000-0000-4000-8000-000000000001''', 1, 'owner courier read');
select pg_temp.assert_count('select id from public.site_settings where store_id = ''21000000-0000-4000-8000-000000000001'' and key = ''payment_settings''', 1, 'owner payment settings read');
select pg_temp.assert_count('select id from public.storefront_releases where store_id = ''21000000-0000-4000-8000-000000000001''', 1, 'owner release read');
do $$
begin
  begin
    insert into public.store_preview_tokens (store_id, created_by, expires_at)
    values ('21000000-0000-4000-8000-000000000001', auth.uid(), now() + interval '1 hour');
    raise exception 'owner unexpectedly bypassed server-only preview-token authority';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- Store admin: same administrative capability.
select pg_temp.set_authenticated_user('11000000-0000-4000-8000-000000000002');
select pg_temp.assert_true(public.can_administer_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'admin must administer store');
select pg_temp.assert_count('select id from public.store_domains where store_id = ''21000000-0000-4000-8000-000000000001''', 1, 'admin domain read');
update public.store_domains set configured_by = 'rbac-admin' where id = '31000000-0000-4000-8000-000000000004';
select pg_temp.assert_true((select configured_by = 'rbac-admin' from public.store_domains where id = '31000000-0000-4000-8000-000000000004'), 'admin domain update');

-- Editor: content/catalog/day-to-day work, but no tenant administration.
select pg_temp.set_authenticated_user('11000000-0000-4000-8000-000000000003');
select pg_temp.assert_true(public.can_manage_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'editor must retain content/commerce management');
select pg_temp.assert_true(not public.can_administer_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'editor must not administer store');
select pg_temp.assert_true(public.can_view_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'editor must view store');
select pg_temp.assert_count('select id from public.products where store_id = ''21000000-0000-4000-8000-000000000001''', 1, 'editor product read');
update public.products set name = 'RBAC Product Edited' where id = '31000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select name = 'RBAC Product Edited' from public.products where id = '31000000-0000-4000-8000-000000000001'), 'editor product update');
select pg_temp.assert_count('select id from public.site_settings where store_id = ''21000000-0000-4000-8000-000000000001'' and key = ''hero_section''', 1, 'editor content setting read');
update public.site_settings set value = '{"title":"Edited"}'::jsonb where id = '31000000-0000-4000-8000-000000000002';
select pg_temp.assert_count('select id from public.site_settings where store_id = ''21000000-0000-4000-8000-000000000001'' and key = ''payment_settings''', 0, 'editor payment settings denied');
select pg_temp.assert_count('select id from public.store_domains where store_id = ''21000000-0000-4000-8000-000000000001''', 0, 'editor domain denied');
select pg_temp.assert_count('select id from public.store_courier_connections where store_id = ''21000000-0000-4000-8000-000000000001''', 0, 'editor courier configuration denied');
select pg_temp.assert_count('select id from public.storefront_releases where store_id = ''21000000-0000-4000-8000-000000000001''', 0, 'editor release authority denied');
do $$
begin
  begin
    insert into public.store_preview_tokens (store_id, created_by, expires_at)
    values ('21000000-0000-4000-8000-000000000001', auth.uid(), now() + interval '1 hour');
    raise exception 'editor unexpectedly created preview token';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- Viewer: read-only review of non-sensitive catalog/content.
select pg_temp.set_authenticated_user('11000000-0000-4000-8000-000000000004');
select pg_temp.assert_true(not public.can_manage_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'viewer must not manage store');
select pg_temp.assert_true(not public.can_administer_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'viewer must not administer store');
select pg_temp.assert_true(public.can_view_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'viewer must view store');
select pg_temp.assert_count('select id from public.products where store_id = ''21000000-0000-4000-8000-000000000001''', 1, 'viewer product read');
select pg_temp.assert_count('select id from public.site_settings where store_id = ''21000000-0000-4000-8000-000000000001'' and key = ''hero_section''', 1, 'viewer content setting read');
select pg_temp.assert_count('select id from public.site_settings where store_id = ''21000000-0000-4000-8000-000000000001'' and key = ''payment_settings''', 0, 'viewer payment settings denied');
select pg_temp.assert_count('select id from public.store_domains where store_id = ''21000000-0000-4000-8000-000000000001''', 0, 'viewer domain denied');
select pg_temp.assert_count('select id from public.store_courier_connections where store_id = ''21000000-0000-4000-8000-000000000001''', 0, 'viewer courier denied');
select pg_temp.assert_count('select id from public.storefront_releases where store_id = ''21000000-0000-4000-8000-000000000001''', 0, 'viewer release denied');
update public.products set name = 'Viewer should not write' where id = '31000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select name = 'RBAC Product Edited' from public.products where id = '31000000-0000-4000-8000-000000000001'), 'viewer product write denied');

-- Cross-store outsider: owning another tenant grants no access to this store.
select pg_temp.set_authenticated_user('11000000-0000-4000-8000-000000000005');
select pg_temp.assert_true(not public.can_view_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'cross-store viewer denied');
select pg_temp.assert_true(not public.can_administer_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'cross-store admin denied');
select pg_temp.assert_count('select id from public.products where store_id = ''21000000-0000-4000-8000-000000000001''', 0, 'cross-store product denied');
select pg_temp.assert_count('select id from public.store_domains where store_id = ''21000000-0000-4000-8000-000000000001''', 0, 'cross-store domain denied');

-- Platform admin: explicit control-plane bypass remains available.
select pg_temp.set_authenticated_user('11000000-0000-4000-8000-000000000006');
select pg_temp.assert_true(public.can_administer_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'platform admin must administer store');
select pg_temp.assert_true(public.can_view_store('21000000-0000-4000-8000-000000000001', auth.uid()), 'platform admin must view store');
select pg_temp.assert_count('select id from public.store_domains where store_id = ''21000000-0000-4000-8000-000000000001''', 1, 'platform admin domain read');

rollback;
