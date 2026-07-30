-- Repair paid invoices that were approved before the subscription write was
-- made reliable. Existing subscription rows are intentionally not overwritten:
-- they may contain a newer cancellation or operator decision.

with latest_paid_invoice as (
  select distinct on (invoice.store_id)
    invoice.store_id,
    invoice.plan_id,
    invoice.provider,
    invoice.provider_invoice_id,
    invoice.billing_period_end
  from public.store_invoices as invoice
  where invoice.status = 'paid'
  order by
    invoice.store_id,
    invoice.paid_at desc nulls last,
    invoice.created_at desc,
    invoice.id desc
),
missing_subscription as (
  select invoice.*
  from latest_paid_invoice as invoice
  left join public.store_subscriptions as subscription
    on subscription.store_id = invoice.store_id
  where subscription.store_id is null
)
insert into public.store_subscriptions (
  store_id,
  plan_id,
  status,
  provider,
  provider_subscription_id,
  current_period_ends_at,
  trial_ends_at
)
select
  store_id,
  plan_id,
  'active',
  provider,
  provider_invoice_id,
  billing_period_end,
  null
from missing_subscription;

with latest_paid_invoice as (
  select distinct on (invoice.store_id)
    invoice.store_id,
    invoice.plan_id
  from public.store_invoices as invoice
  where invoice.status = 'paid'
  order by
    invoice.store_id,
    invoice.paid_at desc nulls last,
    invoice.created_at desc,
    invoice.id desc
)
update public.stores as store
set plan = invoice.plan_id
from latest_paid_invoice as invoice
join public.store_subscriptions as subscription
  on subscription.store_id = invoice.store_id
  and subscription.plan_id = invoice.plan_id
where store.id = invoice.store_id
  and store.plan is distinct from invoice.plan_id;
