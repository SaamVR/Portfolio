\set ON_ERROR_STOP on

-- P0 #308/#314 database authority smoke.
-- Runs only as a rollback-only test fixture; this file is not a migration.
begin;

-- Fixture creation must not depend on unrelated store-creation policy gates.
-- Restore normal trigger behavior before testing billing rows.
set local session_replication_role = replica;

insert into public.cms_plans (
  id, name, description, monthly_price, currency_code, is_active, sort_order
) values (
  'billing-authority-smoke-plan',
  'Billing Authority Smoke Plan',
  'Rollback-only plan for billing authority smoke.',
  0,
  'BDT',
  true,
  9999
)
on conflict (id) do nothing;
insert into public.stores (
  id, name, slug, currency_code, locale, plan, store_type, is_published
) values
  (
    '24000000-0000-4000-8000-000000000001',
    'Billing Authority Smoke A',
    'billing-authority-smoke-a',
    'BDT', 'en-BD', 'free', 'general', false
  ),
  (
    '24000000-0000-4000-8000-000000000002',
    'Billing Authority Smoke B',
    'billing-authority-smoke-b',
    'BDT', 'en-BD', 'free', 'general', false
  );

set local session_replication_role = origin;

do $$
declare
  v_identity text;
  v_duplicate_blocked boolean := false;
  v_invalid_blocked boolean := false;
begin
  insert into public.store_invoices (
    id, store_id, plan_id, amount, currency, status,
    provider, payment_method, provider_invoice_id
  ) values (
    '34000000-0000-4000-8000-000000000001',
    '24000000-0000-4000-8000-000000000001',
    'billing-authority-smoke-plan',
    0, 'BDT', 'pending',
    'bkash_manual', 'bkash_manual', '  trxabc123  '
  );

  select provider_invoice_id
    into v_identity
  from public.store_invoices
  where id = '34000000-0000-4000-8000-000000000001';

  if v_identity is distinct from 'TRXABC123' then
    raise exception 'manual bKash identity was not normalized: %', v_identity;
  end if;
  begin
    insert into public.store_invoices (
      id, store_id, plan_id, amount, currency, status,
      provider, payment_method, provider_invoice_id
    ) values (
      '34000000-0000-4000-8000-000000000002',
      '24000000-0000-4000-8000-000000000002',
      'billing-authority-smoke-plan',
      0, 'BDT', 'pending',
      'bkash_manual', 'bkash_manual', 'TrXaBc123'
    );
  exception
    when unique_violation then
      v_duplicate_blocked := true;
  end;

  if not v_duplicate_blocked then
    raise exception 'cross-store manual bKash replay was not blocked';
  end if;
  begin
    insert into public.store_invoices (
      id, store_id, plan_id, amount, currency, status,
      provider, payment_method, provider_invoice_id
    ) values (
      '34000000-0000-4000-8000-000000000003',
      '24000000-0000-4000-8000-000000000002',
      'billing-authority-smoke-plan',
      0, 'BDT', 'pending',
      'bkash_manual', 'bkash_manual', 'TRX-INVALID'
    );
  exception
    when check_violation then
      v_invalid_blocked := true;
  end;

  if not v_invalid_blocked then
    raise exception 'invalid manual bKash provider identity was not blocked';
  end if;
end;
$$;

select 'Billing authority database smoke passed' as result;
rollback;
