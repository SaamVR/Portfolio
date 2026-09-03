-- #204: keep renewal contact PII outside tenant-readable subscription rows.

create table public.store_subscription_renewal_contacts (
  store_id uuid primary key references public.stores(id) on delete cascade,
  renewal_phone text not null,
  updated_at timestamptz not null default now(),
  constraint store_subscription_renewal_contacts_phone_check
    check (renewal_phone ~ '^\+[1-9][0-9]{7,14}$')
);

do $block$
begin
  if exists (
    select 1
    from public.store_subscriptions
    where renewal_phone is not null
      and btrim(renewal_phone) !~ '^\+[1-9][0-9]{7,14}$'
  ) then
    raise exception 'cannot migrate renewal contacts: non-E.164 renewal phone exists';
  end if;
end;
$block$;

alter table public.store_subscription_renewal_contacts enable row level security;
revoke all privileges on table public.store_subscription_renewal_contacts from public, anon, authenticated;
grant select, insert, update, delete on table public.store_subscription_renewal_contacts to service_role;
grant all privileges on table public.store_subscription_renewal_contacts to postgres;

insert into public.store_subscription_renewal_contacts (store_id, renewal_phone, updated_at)
select store_id, btrim(renewal_phone), now()
from public.store_subscriptions
where renewal_phone is not null
  and btrim(renewal_phone) ~ '^\+[1-9][0-9]{7,14}$'
on conflict (store_id) do update
set renewal_phone = excluded.renewal_phone,
    updated_at = excluded.updated_at;

do $block$
begin
  if exists (
    select 1
    from public.store_subscriptions as subscription
    left join public.store_subscription_renewal_contacts as contact
      on contact.store_id = subscription.store_id
    where subscription.auto_renew = false
      and contact.store_id is null
  ) then
    raise exception 'cannot migrate renewal contacts: opted-out subscription is missing a private renewal contact';
  end if;
end;
$block$;

create or replace function public.set_store_subscription_renewal_preferences(
  p_store_id uuid,
  p_auto_renew boolean,
  p_renewal_phone text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_phone text;
  v_plan_id text;
begin
  if p_store_id is null or p_auto_renew is null then
    raise exception 'store id and auto-renew preference are required';
  end if;

  select subscription.plan_id
    into v_plan_id
  from public.store_subscriptions as subscription
  where subscription.store_id = p_store_id
  for update;

  if not found then
    raise exception 'subscription not found for store %', p_store_id;
  end if;

  if v_plan_id = 'free' then
    raise exception 'renewal preferences are not available for the free plan';
  end if;

  v_phone := nullif(btrim(p_renewal_phone), '');

  if p_auto_renew = false then
    if v_phone is null or v_phone !~ '^\+[1-9][0-9]{7,14}$' then
      raise exception 'a valid international renewal phone is required when auto-renew is off';
    end if;

    insert into public.store_subscription_renewal_contacts (store_id, renewal_phone, updated_at)
    values (p_store_id, v_phone, now())
    on conflict (store_id) do update
    set renewal_phone = excluded.renewal_phone,
        updated_at = excluded.updated_at;
  else
    delete from public.store_subscription_renewal_contacts
    where store_id = p_store_id;
  end if;

  update public.store_subscriptions
  set auto_renew = p_auto_renew,
      renewal_reminder_sent_for = null,
      updated_at = now()
  where store_id = p_store_id;
end;
$function$;

revoke all privileges on function public.set_store_subscription_renewal_preferences(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.set_store_subscription_renewal_preferences(uuid, boolean, text)
  to service_role, postgres;

create or replace function public.enqueue_due_subscription_expiry_reminders()
returns integer
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_subscription record;
  v_count integer := 0;
begin
  for v_subscription in
    select subscription.store_id,
           subscription.current_period_ends_at
    from public.store_subscriptions as subscription
    join public.stores as store on store.id = subscription.store_id
    join auth.users as owner_user on owner_user.id = store.owner_id
    join public.store_subscription_renewal_contacts as contact
      on contact.store_id = subscription.store_id
    where subscription.status = 'active'
      and subscription.auto_renew = false
      and subscription.current_period_ends_at is not null
      and subscription.current_period_ends_at > now()
      and subscription.current_period_ends_at <= now() + interval '3 days'
      and subscription.renewal_reminder_sent_for is distinct from subscription.current_period_ends_at
      and coalesce(btrim(owner_user.email), '') <> ''
      and coalesce(btrim(contact.renewal_phone), '') <> ''
    order by subscription.current_period_ends_at
    for update of subscription skip locked
  loop
    perform public.enqueue_trigger_email_event(
      v_subscription.store_id,
      null,
      'subscription-expiry-reminder',
      null,
      jsonb_build_object(
        'channel', 'email',
        'templateName', 'subscription-expiry-reminder',
        'store_id', v_subscription.store_id,
        'currentPeriodEndsAt', v_subscription.current_period_ends_at,
        'renewalPath', '/admin/billing'
      ),
      'email'
    );

    perform public.enqueue_trigger_email_event(
      v_subscription.store_id,
      null,
      'subscription-expiry-reminder',
      null,
      jsonb_build_object(
        'channel', 'sms',
        'templateName', 'subscription-expiry-reminder',
        'store_id', v_subscription.store_id,
        'currentPeriodEndsAt', v_subscription.current_period_ends_at,
        'renewalPath', '/admin/billing'
      ),
      'sms'
    );

    update public.store_subscriptions
    set renewal_reminder_sent_for = current_period_ends_at,
        updated_at = now()
    where store_id = v_subscription.store_id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;

alter table public.store_subscriptions
  drop constraint if exists store_subscriptions_auto_renew_phone_check,
  drop constraint if exists store_subscriptions_renewal_phone_check;

alter table public.store_subscriptions
  drop column renewal_phone;
