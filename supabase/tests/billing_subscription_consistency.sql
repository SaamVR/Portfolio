\set ON_ERROR_STOP on

-- A paid invoice is historical evidence. Only the most recently paid invoice
-- for each store describes the billing period the current subscription should
-- reflect.
with latest_paid_invoice as (
  select distinct on (invoice.store_id)
    invoice.id as invoice_id,
    invoice.store_id,
    invoice.plan_id,
    invoice.billing_period_start,
    invoice.billing_period_end,
    invoice.paid_at
  from public.store_invoices as invoice
  where invoice.status = 'paid'
  order by
    invoice.store_id,
    invoice.paid_at desc nulls last,
    invoice.created_at desc,
    invoice.id desc
)
select
  invoice.store_id,
  invoice.invoice_id,
  invoice.plan_id as invoice_plan_id,
  subscription.plan_id as subscription_plan_id,
  subscription.status as subscription_status,
  invoice.billing_period_start as invoice_period_start,
  invoice.billing_period_end as invoice_period_end,
  subscription.current_period_ends_at as subscription_period_end
from latest_paid_invoice as invoice
left join public.store_subscriptions as subscription
  on subscription.store_id = invoice.store_id
where
  subscription.store_id is null
  or subscription.plan_id is distinct from invoice.plan_id
  or subscription.status is distinct from 'active'
  or (
    invoice.billing_period_end is not null
    and subscription.current_period_ends_at is distinct from invoice.billing_period_end
  )
order by invoice.store_id;

do $$
declare
  mismatch_count integer;
begin
  with latest_paid_invoice as (
    select distinct on (invoice.store_id)
      invoice.store_id,
      invoice.plan_id,
      invoice.billing_period_end
    from public.store_invoices as invoice
    where invoice.status = 'paid'
    order by
      invoice.store_id,
      invoice.paid_at desc nulls last,
      invoice.created_at desc,
      invoice.id desc
  )
  select count(*)
  into mismatch_count
  from latest_paid_invoice as invoice
  left join public.store_subscriptions as subscription
    on subscription.store_id = invoice.store_id
  where
    subscription.store_id is null
    or subscription.plan_id is distinct from invoice.plan_id
    or subscription.status is distinct from 'active'
    or (
      invoice.billing_period_end is not null
      and subscription.current_period_ends_at is distinct from invoice.billing_period_end
    );

  if mismatch_count > 0 then
    raise exception
      'Billing consistency check failed: % latest-paid invoice/subscription mismatch(es)',
      mismatch_count;
  end if;
end;
$$;

select 'Billing subscription consistency checks passed' as result;
