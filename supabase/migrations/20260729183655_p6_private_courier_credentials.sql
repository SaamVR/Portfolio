create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

grant usage on schema private to postgres, service_role;

create table if not exists private.store_courier_credentials (
  connection_id uuid primary key references public.store_courier_connections(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null check (provider in ('pathao', 'steadfast', 'redx', 'ecourier', 'paperfly', 'manual')),
  secret_payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, provider)
);

create index if not exists idx_private_store_courier_credentials_store_id
  on private.store_courier_credentials(store_id);

revoke all on private.store_courier_credentials from public;
revoke all on private.store_courier_credentials from anon;
revoke all on private.store_courier_credentials from authenticated;

grant select, insert, update, delete on private.store_courier_credentials to service_role;
grant all on private.store_courier_credentials to postgres;
