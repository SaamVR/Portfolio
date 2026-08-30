-- #178: public stock-notification acceptance is server-authoritative.
-- Keep the existing row/schema contract for restock dispatch while removing direct public INSERT access.

alter table public.stock_notifications
  drop constraint if exists stock_notifications_product_id_email_key;

update public.stock_notifications
set email = lower(trim(email));

delete from public.stock_notifications newer
using public.stock_notifications older
where newer.notified = false
  and older.notified = false
  and newer.product_id = older.product_id
  and newer.email = older.email
  and (
    newer.created_at > older.created_at
    or (newer.created_at = older.created_at and newer.id::text > older.id::text)
  );

create unique index if not exists stock_notifications_active_product_email_key
  on public.stock_notifications (product_id, email)
  where notified = false;

-- Remove the permissive public submission policy. Authenticated store staff retain INSERT through
-- their existing can_manage_store-scoped ALL policy; ordinary customers no longer have an INSERT policy.
drop policy if exists "Anyone can insert store stock notifications" on public.stock_notifications;
revoke insert on table public.stock_notifications from anon;
grant insert on table public.stock_notifications to authenticated, service_role;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_notifications'
      and cmd = 'INSERT'
      and ('public' = any(roles) or 'anon' = any(roles))
  ) then
    raise exception 'Public stock_notifications INSERT policy still exists';
  end if;

  if has_table_privilege('anon', 'public.stock_notifications', 'INSERT') then
    raise exception 'Anonymous role still has direct stock_notifications INSERT privilege';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'stock_notifications'
      and indexname = 'stock_notifications_active_product_email_key'
  ) then
    raise exception 'Active stock notification dedupe index is missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_notifications'
      and policyname = 'Store staff can manage stock notifications'
  ) then
    raise exception 'Store staff can manage stock notifications policy is missing';
  end if;
end
$$;

comment on table public.stock_notifications is
  'Back-in-stock subscriptions. Public signup is accepted only through the server-authoritative stock notification API. notified=false is an active subscription; notified=true is a delivery marker and must only be set after successful durable email delivery. Authenticated store staff retain tenant-scoped management.';
