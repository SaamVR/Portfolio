-- Subscription rows are entitlement records, not merchant-managed settings.
-- Authenticated clients may read their scoped row, while all mutations must
-- pass through server-side billing paths using the service role.

alter table public.store_subscriptions enable row level security;

drop policy if exists "Store owners can manage subscriptions"
  on public.store_subscriptions;
drop policy if exists "Platform admins can manage subscriptions"
  on public.store_subscriptions;
drop policy if exists "Store managers can view subscriptions"
  on public.store_subscriptions;
drop policy if exists "Store members can view subscriptions"
  on public.store_subscriptions;

create policy "Store members can view subscriptions"
  on public.store_subscriptions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.stores
      where stores.id = store_subscriptions.store_id
        and stores.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.store_memberships
      where store_memberships.store_id = store_subscriptions.store_id
        and store_memberships.user_id = (select auth.uid())
    )
    or public.has_role((select auth.uid()), 'admin')
  );

revoke all privileges on table public.store_subscriptions from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.store_subscriptions
  from authenticated;
grant select on table public.store_subscriptions to authenticated;

-- Keep server billing routes explicit even if defaults change later.
grant select, insert, update, delete
  on table public.store_subscriptions
  to service_role;
