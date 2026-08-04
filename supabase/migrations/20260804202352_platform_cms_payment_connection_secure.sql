create table if not exists public.platform_payment_connections_secure (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique check (provider in ('bkash')),
  status text not null default 'draft' check (status in ('draft', 'connected', 'revoked')),
  public_metadata jsonb not null default '{}'::jsonb,
  secret_payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  revoked_by uuid,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_payment_connections_secure enable row level security;

revoke all on public.platform_payment_connections_secure from public;
revoke all on public.platform_payment_connections_secure from anon;
revoke all on public.platform_payment_connections_secure from authenticated;

grant select, insert, update, delete on public.platform_payment_connections_secure to service_role;
grant all on public.platform_payment_connections_secure to postgres;
