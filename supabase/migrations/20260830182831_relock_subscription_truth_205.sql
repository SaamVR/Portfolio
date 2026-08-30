-- Subscription rows are server-authoritative entitlement records.
-- Reassert least-privilege table grants in case later schema changes restored DML grants.
alter table public.store_subscriptions enable row level security;

revoke all privileges on table public.store_subscriptions from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.store_subscriptions
  from authenticated;
grant select on table public.store_subscriptions to authenticated;

grant select, insert, update, delete
  on table public.store_subscriptions
  to service_role;
