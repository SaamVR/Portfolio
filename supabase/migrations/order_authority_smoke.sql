-- Rollback-only security smoke for authoritative order creation.
-- Browser roles must never be able to create public.orders rows directly;
-- only the server-side service_role RPC may create checkout orders.
begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not condition then raise exception '%', message; end if;
end;
$$;

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.orders', 'INSERT'),
  'anon must not have direct INSERT privilege on public.orders'
);

select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.orders', 'INSERT'),
  'authenticated must not have direct INSERT privilege on public.orders'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Customers can create store orders'
  ),
  'legacy public order INSERT policy must stay removed'
);

select pg_temp.assert_true(
  has_function_privilege(
    'service_role',
    'public.create_store_order_with_stock(uuid,text,uuid,jsonb,integer,integer,text,text,text,text,text,text,text,text)',
    'EXECUTE'
  ),
  'service_role must retain canonical order RPC execution'
);

select pg_temp.assert_true(
  not has_function_privilege(
    'anon',
    'public.create_store_order_with_stock(uuid,text,uuid,jsonb,integer,integer,text,text,text,text,text,text,text,text)',
    'EXECUTE'
  ),
  'anon must not execute canonical order RPC directly'
);

select pg_temp.assert_true(
  not has_function_privilege(
    'authenticated',
    'public.create_store_order_with_stock(uuid,text,uuid,jsonb,integer,integer,text,text,text,text,text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated must not execute canonical order RPC directly'
);

rollback;
