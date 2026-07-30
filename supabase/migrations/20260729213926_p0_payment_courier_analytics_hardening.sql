create table if not exists public.store_payment_connections_secure (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null check (provider in ('bkash')),
  status text not null default 'draft' check (status in ('draft', 'connected', 'revoked')),
  public_metadata jsonb not null default '{}'::jsonb,
  secret_payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  revoked_by uuid,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, provider)
);

create index if not exists idx_store_payment_connections_secure_store_id
  on public.store_payment_connections_secure(store_id);

alter table public.store_payment_connections_secure enable row level security;

revoke all on public.store_payment_connections_secure from public;
revoke all on public.store_payment_connections_secure from anon;
revoke all on public.store_payment_connections_secure from authenticated;

grant select, insert, update, delete on public.store_payment_connections_secure to service_role;
grant all on public.store_payment_connections_secure to postgres;

update public.site_settings
set value = coalesce(value, '{}'::jsonb)
  - 'bkash_app_key'
  - 'bkash_app_secret'
  - 'bkash_username'
  - 'bkash_password'
  - 'bkash_is_live'
where key = 'payment_settings'
  and (
    coalesce(value, '{}'::jsonb) ? 'bkash_app_key'
    or coalesce(value, '{}'::jsonb) ? 'bkash_app_secret'
    or coalesce(value, '{}'::jsonb) ? 'bkash_username'
    or coalesce(value, '{}'::jsonb) ? 'bkash_password'
    or coalesce(value, '{}'::jsonb) ? 'bkash_is_live'
  );

alter table public.store_courier_connections
  add column if not exists connection_key text,
  add column if not exists zone_label text,
  add column if not exists service_area_name text;

update public.store_courier_connections
set
  connection_key = coalesce(nullif(connection_key, ''), nullif(settings->>'connection_key', ''), provider),
  zone_label = coalesce(nullif(zone_label, ''), nullif(settings->>'zone_label', ''), display_name, provider),
  service_area_name = coalesce(nullif(service_area_name, ''), nullif(settings->>'service_area_name', ''), display_name, provider)
where connection_key is null
  or zone_label is null
  or service_area_name is null;

alter table public.store_courier_connections
  alter column connection_key set default gen_random_uuid()::text,
  alter column connection_key set not null;

alter table public.store_courier_connections
  drop constraint if exists store_courier_connections_store_id_provider_key;

create unique index if not exists store_courier_connections_store_provider_key_idx
  on public.store_courier_connections(store_id, provider, connection_key);

alter table public.store_courier_credentials_secure
  drop constraint if exists store_courier_credentials_secure_store_id_provider_key;

alter table public.order_shipments
  add column if not exists courier_connection_id uuid references public.store_courier_connections(id) on delete set null;

create index if not exists idx_order_shipments_courier_connection_id
  on public.order_shipments(courier_connection_id);

alter table public.store_analytics_events
  add constraint store_analytics_events_event_name_check
  check (
    event_name in (
      'page_view',
      'view_item',
      'quick_view_open',
      'search',
      'tag_click',
      'search_result_click',
      'filter_used',
      'sort_changed',
      'add_to_cart',
      'remove_from_cart',
      'cart_quantity_changed',
      'clear_cart',
      'view_cart',
      'begin_checkout',
      'purchase',
      'purchase_item',
      'track_order_search',
      'track_order_result',
      'add_to_wishlist',
      'remove_from_wishlist'
    )
  ) not valid;

alter table public.store_analytics_events validate constraint store_analytics_events_event_name_check;

alter table public.store_analytics_events
  add constraint store_analytics_events_metadata_size_check
  check (octet_length(metadata::text) <= 4096) not valid;

alter table public.store_analytics_events validate constraint store_analytics_events_metadata_size_check;

create index if not exists idx_store_analytics_events_created_retention
  on public.store_analytics_events(created_at);

create table if not exists public.store_analytics_ingestion_limits (
  identifier text primary key,
  window_start timestamptz not null,
  count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.store_analytics_ingestion_limits enable row level security;

revoke all on public.store_analytics_ingestion_limits from public;
revoke all on public.store_analytics_ingestion_limits from anon;
revoke all on public.store_analytics_ingestion_limits from authenticated;

grant select, insert, update, delete on public.store_analytics_ingestion_limits to service_role;
grant all on public.store_analytics_ingestion_limits to postgres;
