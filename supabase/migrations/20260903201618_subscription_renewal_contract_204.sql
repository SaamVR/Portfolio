-- #204: subscription renewal preference, reminder scheduling, and prepaid-period preservation.

alter table public.store_subscriptions
  add column auto_renew boolean not null default true,
  add column renewal_phone text,
  add column renewal_reminder_sent_for timestamptz;

alter table public.store_subscriptions
  add constraint store_subscriptions_renewal_phone_check
    check (
      renewal_phone is null
      or (char_length(btrim(renewal_phone)) >= 7 and char_length(btrim(renewal_phone)) <= 40)
    ),
  add constraint store_subscriptions_auto_renew_phone_check
    check (auto_renew or renewal_phone is not null);

create or replace function public.protect_subscription_renewal_period()
returns trigger
language plpgsql
as $function$
begin
  if old.status = 'active'
     and new.status = 'active'
     and old.current_period_ends_at is not null
     and new.current_period_ends_at is not null
     and new.current_period_ends_at < old.current_period_ends_at then
    new.current_period_ends_at := old.current_period_ends_at;
  end if;

  if new.current_period_ends_at is distinct from old.current_period_ends_at then
    new.renewal_reminder_sent_for := null;
  end if;

  return new;
end;
$function$;

drop trigger if exists protect_subscription_renewal_period_trigger on public.store_subscriptions;
create trigger protect_subscription_renewal_period_trigger
before update on public.store_subscriptions
for each row execute function public.protect_subscription_renewal_period();

create or replace function public.sync_paid_invoice_entitlements()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_existing_period_end timestamptz;
  v_existing_plan_id text;
  v_paid_at timestamptz;
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  if new.status = 'paid' and old.status is distinct from new.status then
    select subscription.current_period_ends_at, subscription.plan_id
      into v_existing_period_end, v_existing_plan_id
    from public.store_subscriptions as subscription
    where subscription.store_id = new.store_id
    for update;

    v_paid_at := coalesce(new.paid_at, now());
    v_period_start := case
      when v_existing_plan_id = new.plan_id
       and v_existing_period_end is not null
       and v_existing_period_end > v_paid_at
        then v_existing_period_end
      else v_paid_at
    end;
    v_period_end := case
      when new.billing_interval = 'annual'
        then v_period_start + interval '1 year'
      else v_period_start + interval '1 month'
    end;

    update public.store_invoices
    set billing_period_start = v_period_start,
        billing_period_end = v_period_end,
        updated_at = now()
    where id = new.id;

    insert into public.store_subscriptions (
      store_id,
      plan_id,
      status,
      provider,
      provider_subscription_id,
      current_period_ends_at,
      trial_ends_at,
      updated_at
    )
    values (
      new.store_id,
      new.plan_id,
      'active',
      new.provider,
      new.provider_invoice_id,
      v_period_end,
      null,
      now()
    )
    on conflict (store_id) do update
    set plan_id = excluded.plan_id,
        status = 'active',
        provider = excluded.provider,
        provider_subscription_id = excluded.provider_subscription_id,
        current_period_ends_at = excluded.current_period_ends_at,
        trial_ends_at = null,
        renewal_reminder_sent_for = null,
        updated_at = now();

    update public.stores
    set plan = new.plan_id,
        updated_at = now()
    where id = new.store_id;

    if not found then
      raise exception 'Cannot settle invoice %, store % does not exist', new.id, new.store_id;
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists sync_paid_invoice_entitlements_trigger on public.store_invoices;
create trigger sync_paid_invoice_entitlements_trigger
after update of status on public.store_invoices
for each row
when ((new.status = 'paid') and (old.status is distinct from new.status))
execute function public.sync_paid_invoice_entitlements();

create or replace function public.enqueue_due_subscription_expiry_reminders()
returns integer
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_subscription record;
  v_queued boolean;
  v_count integer := 0;
begin
  for v_subscription in
    select subscription.store_id,
           subscription.current_period_ends_at,
           subscription.renewal_phone,
           store.name as store_name,
           store.slug as store_slug,
           owner_user.email as owner_email
    from public.store_subscriptions as subscription
    join public.stores as store on store.id = subscription.store_id
    left join auth.users as owner_user on owner_user.id = store.owner_id
    where subscription.status = 'active'
      and subscription.auto_renew = false
      and subscription.current_period_ends_at is not null
      and subscription.current_period_ends_at > now()
      and subscription.current_period_ends_at <= now() + interval '3 days'
      and subscription.renewal_reminder_sent_for is distinct from subscription.current_period_ends_at
    order by subscription.current_period_ends_at
    for update of subscription skip locked
  loop
    v_queued := false;

    if coalesce(btrim(v_subscription.owner_email), '') <> '' then
      perform public.enqueue_trigger_email_event(
        v_subscription.store_id,
        null,
        'subscription-expiry-reminder',
        v_subscription.owner_email,
        jsonb_build_object(
          'channel', 'email',
          'to', v_subscription.owner_email,
          'templateName', 'subscription-expiry-reminder',
          'store_id', v_subscription.store_id,
          'storeName', v_subscription.store_name,
          'storeSlug', v_subscription.store_slug,
          'currentPeriodEndsAt', v_subscription.current_period_ends_at,
          'renewalPath', '/admin/billing'
        ),
        'email'
      );
      v_queued := true;
    end if;

    if coalesce(btrim(v_subscription.renewal_phone), '') <> '' then
      perform public.enqueue_trigger_email_event(
        v_subscription.store_id,
        null,
        'subscription-expiry-reminder',
        v_subscription.renewal_phone,
        jsonb_build_object(
          'channel', 'sms',
          'customer_phone', v_subscription.renewal_phone,
          'templateName', 'subscription-expiry-reminder',
          'store_id', v_subscription.store_id,
          'storeName', v_subscription.store_name,
          'storeSlug', v_subscription.store_slug,
          'currentPeriodEndsAt', v_subscription.current_period_ends_at,
          'renewalPath', '/admin/billing'
        ),
        'sms'
      );
      v_queued := true;
    end if;

    if v_queued then
      update public.store_subscriptions
      set renewal_reminder_sent_for = current_period_ends_at,
          updated_at = now()
      where store_id = v_subscription.store_id;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$function$;

revoke all privileges on function public.enqueue_due_subscription_expiry_reminders()
  from public, anon, authenticated;
grant execute on function public.enqueue_due_subscription_expiry_reminders()
  to service_role, postgres;

create or replace function public.kick_notification_queue_processor()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_url text;
  v_secret text;
begin
  perform public.enqueue_due_subscription_expiry_reminders();

  v_url := current_setting('app.settings.notification_processor_url', true);
  v_secret := current_setting('app.settings.notification_processor_secret', true);

  if coalesce(v_url, '') <> '' and coalesce(v_secret, '') <> '' then
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-notification-queue-secret', v_secret
      ),
      body := '{}'::jsonb
    );
  end if;
end;
$function$;
