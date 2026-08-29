-- Compatibility mirror of the production migration applied as integration_connection_truth_compatibility_150.
-- Kept separate from the cleanup migration so production can roll forward without a live old-app/new-schema gap.

alter table public.store_payment_connections_secure
  add column if not exists verification_status text not null default 'not_checked',
  add column if not exists last_verification_at timestamptz,
  add column if not exists last_verified_at timestamptz,
  add column if not exists verification_error jsonb;

alter table public.platform_payment_connections_secure
  add column if not exists verification_status text not null default 'not_checked',
  add column if not exists last_verification_at timestamptz,
  add column if not exists last_verified_at timestamptz,
  add column if not exists verification_error jsonb;

alter table public.store_courier_connections
  add column if not exists verification_status text not null default 'not_checked',
  add column if not exists last_verification_at timestamptz,
  add column if not exists last_verified_at timestamptz,
  add column if not exists verification_error jsonb;

alter table public.store_payment_connections_secure
  drop constraint if exists store_payment_connections_secure_status_check;
alter table public.store_payment_connections_secure
  add constraint store_payment_connections_secure_status_check
  check (status in ('draft', 'connected', 'configured', 'revoked'));

alter table public.platform_payment_connections_secure
  drop constraint if exists platform_payment_connections_secure_status_check;
alter table public.platform_payment_connections_secure
  add constraint platform_payment_connections_secure_status_check
  check (status in ('draft', 'connected', 'configured', 'revoked'));

alter table public.store_courier_connections
  drop constraint if exists store_courier_connections_status_check;
alter table public.store_courier_connections
  add constraint store_courier_connections_status_check
  check (status in ('draft', 'connected', 'configured', 'disabled'));

alter table public.store_payment_connections_secure
  drop constraint if exists store_payment_connections_secure_verification_status_check;
alter table public.store_payment_connections_secure
  add constraint store_payment_connections_secure_verification_status_check
  check (verification_status in ('not_checked', 'verified', 'failed'));

alter table public.platform_payment_connections_secure
  drop constraint if exists platform_payment_connections_secure_verification_status_check;
alter table public.platform_payment_connections_secure
  add constraint platform_payment_connections_secure_verification_status_check
  check (verification_status in ('not_checked', 'verified', 'failed'));

alter table public.store_courier_connections
  drop constraint if exists store_courier_connections_verification_status_check;
alter table public.store_courier_connections
  add constraint store_courier_connections_verification_status_check
  check (verification_status in ('not_checked', 'verified', 'failed'));
