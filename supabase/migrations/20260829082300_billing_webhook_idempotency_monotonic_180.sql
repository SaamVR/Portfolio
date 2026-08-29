create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  invoice_id uuid,
  store_id uuid,
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  outcome text not null default 'claimed',
  failure_reason text,
  created_at timestamptz not null default now(),
  constraint billing_webhook_events_provider_event_unique unique (provider, event_id)
);

create index if not exists billing_webhook_events_invoice_idx
  on public.billing_webhook_events (invoice_id, received_at desc);

alter table public.billing_webhook_events enable row level security;
revoke all on table public.billing_webhook_events from public, anon, authenticated;
grant select, insert, update on table public.billing_webhook_events to service_role;

create or replace function public.apply_billing_webhook_event(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_invoice_id uuid,
  p_payment_method text default null,
  p_provider_invoice_id text default null,
  p_provider_subscription_id text default null,
  p_occurred_at timestamptz default null
)
returns table(
  outcome text,
  duplicate boolean,
  invoice_status text,
  store_id uuid,
  incident_reason text
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_event_pk uuid;
  v_existing_outcome text;
  v_invoice public.store_invoices%rowtype;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_paid_at timestamptz;
begin
  if coalesce(btrim(p_provider), '') = ''
     or coalesce(btrim(p_event_id), '') = ''
     or p_event_type not in ('payment.success', 'payment.failed')
     or p_invoice_id is null then
    raise exception 'Invalid billing webhook event identity' using errcode = '22023';
  end if;

  insert into public.billing_webhook_events (
    provider, event_id, event_type, invoice_id, occurred_at
  ) values (
    btrim(p_provider), btrim(p_event_id), p_event_type, p_invoice_id, p_occurred_at
  )
  on conflict (provider, event_id) do nothing
  returning id into v_event_pk;

  if v_event_pk is null then
    select e.outcome into v_existing_outcome
    from public.billing_webhook_events e
    where e.provider = btrim(p_provider)
      and e.event_id = btrim(p_event_id);

    select i.status, i.store_id into invoice_status, store_id
    from public.store_invoices i
    where i.id = p_invoice_id;

    return query select coalesce(v_existing_outcome, 'duplicate'), true, invoice_status, store_id, null::text;
    return;
  end if;

  select * into v_invoice
  from public.store_invoices
  where id = p_invoice_id
  for update;

  if not found then
    update public.billing_webhook_events
    set outcome = 'rejected', failure_reason = 'invoice_not_found', processed_at = now()
    where id = v_event_pk;
    return query select 'rejected'::text, false, null::text, null::uuid, 'invoice_not_found'::text;
    return;
  end if;

  update public.billing_webhook_events
  set store_id = v_invoice.store_id
  where id = v_event_pk;

  if v_invoice.provider is not null and btrim(v_invoice.provider) <> btrim(p_provider) then
    update public.billing_webhook_events
    set outcome = 'rejected', failure_reason = 'provider_mismatch', processed_at = now()
    where id = v_event_pk;
    return query select 'rejected'::text, false, v_invoice.status, v_invoice.store_id, 'provider_mismatch'::text;
    return;
  end if;

  if v_invoice.provider_invoice_id is not null
     and p_provider_invoice_id is not null
     and v_invoice.provider_invoice_id <> p_provider_invoice_id then
    update public.billing_webhook_events
    set outcome = 'rejected', failure_reason = 'provider_invoice_mismatch', processed_at = now()
    where id = v_event_pk;
    return query select 'rejected'::text, false, v_invoice.status, v_invoice.store_id, 'provider_invoice_mismatch'::text;
    return;
  end if;

  if p_event_type = 'payment.success' then
    if v_invoice.status = 'paid' then
      update public.billing_webhook_events
      set outcome = 'ignored_already_paid', processed_at = now()
      where id = v_event_pk;
      return query select 'ignored_already_paid'::text, false, v_invoice.status, v_invoice.store_id, null::text;
      return;
    end if;

    v_period_start := coalesce(v_invoice.billing_period_start, v_invoice.created_at);
    v_period_end := coalesce(
      v_invoice.billing_period_end,
      case
        when v_invoice.billing_interval = 'annual' then v_period_start + interval '1 year'
        else v_period_start + interval '1 month'
      end
    );
    v_paid_at := coalesce(p_occurred_at, v_invoice.paid_at, now());

    update public.store_invoices
    set status = 'paid',
        paid_at = v_paid_at,
        payment_method = coalesce(nullif(btrim(p_payment_method), ''), payment_method, 'manual-webhook'),
        provider = coalesce(provider, btrim(p_provider)),
        provider_invoice_id = coalesce(provider_invoice_id, nullif(btrim(p_provider_invoice_id), '')),
        billing_period_start = v_period_start,
        billing_period_end = v_period_end,
        updated_at = now()
    where id = v_invoice.id;

    update public.billing_webhook_events
    set outcome = 'applied_success', processed_at = now()
    where id = v_event_pk;

    return query select 'applied_success'::text, false, 'paid'::text, v_invoice.store_id, null::text;
    return;
  end if;

  if v_invoice.status = 'paid' then
    update public.billing_webhook_events
    set outcome = 'ignored_paid_failure', failure_reason = 'late_failure_after_paid', processed_at = now()
    where id = v_event_pk;
    return query select 'ignored_paid_failure'::text, false, 'paid'::text, v_invoice.store_id, 'late_failure_after_paid'::text;
    return;
  end if;

  update public.store_invoices
  set status = 'failed', updated_at = now()
  where id = v_invoice.id;

  insert into public.store_subscriptions (store_id, plan_id, status, updated_at)
  values (v_invoice.store_id, v_invoice.plan_id, 'past_due', now())
  on conflict (store_id) do update
  set status = 'past_due', updated_at = now();

  update public.stores
  set is_published = false, updated_at = now()
  where id = v_invoice.store_id;

  if not found then
    raise exception 'Cannot fail invoice %, store % does not exist', v_invoice.id, v_invoice.store_id;
  end if;

  update public.billing_webhook_events
  set outcome = 'applied_failure', processed_at = now()
  where id = v_event_pk;

  return query select 'applied_failure'::text, false, 'failed'::text, v_invoice.store_id, null::text;
end;
$function$;

revoke all on function public.apply_billing_webhook_event(text,text,text,uuid,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.apply_billing_webhook_event(text,text,text,uuid,text,text,text,timestamptz) to service_role;
