create table if not exists public.store_courier_credentials_secure (
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

create index if not exists idx_store_courier_credentials_secure_store_id
  on public.store_courier_credentials_secure(store_id);

alter table public.store_courier_credentials_secure enable row level security;

revoke all on public.store_courier_credentials_secure from public;
revoke all on public.store_courier_credentials_secure from anon;
revoke all on public.store_courier_credentials_secure from authenticated;

grant select, insert, update, delete on public.store_courier_credentials_secure to service_role;
grant all on public.store_courier_credentials_secure to postgres;

do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_tables
    where schemaname = 'private'
      and tablename = 'store_courier_credentials'
  ) then
    insert into public.store_courier_credentials_secure (
      connection_id,
      store_id,
      provider,
      secret_payload,
      created_by,
      updated_by,
      created_at,
      updated_at
    )
    select
      connection_id,
      store_id,
      provider,
      secret_payload,
      created_by,
      updated_by,
      created_at,
      updated_at
    from private.store_courier_credentials
    on conflict (connection_id) do update
    set
      store_id = excluded.store_id,
      provider = excluded.provider,
      secret_payload = excluded.secret_payload,
      created_by = coalesce(public.store_courier_credentials_secure.created_by, excluded.created_by),
      updated_by = excluded.updated_by,
      created_at = coalesce(public.store_courier_credentials_secure.created_at, excluded.created_at),
      updated_at = excluded.updated_at;
  end if;
end $$;
