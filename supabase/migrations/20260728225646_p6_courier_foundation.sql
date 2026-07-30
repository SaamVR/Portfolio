create table if not exists public.store_courier_connections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null check (provider in ('pathao', 'steadfast', 'redx', 'ecourier', 'paperfly', 'manual')),
  status text not null default 'draft' check (status in ('draft', 'connected', 'disabled')),
  display_name text,
  supports_cod boolean not null default true,
  supports_city_delivery boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_error jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, provider)
);

create table if not exists public.order_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null check (provider in ('pathao', 'steadfast', 'redx', 'ecourier', 'paperfly', 'manual')),
  status text not null default 'pending' check (status in ('pending', 'prepared', 'booked', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned', 'cancelled')),
  tracking_number text,
  consignment_id text,
  recipient_name text,
  recipient_phone text,
  destination_city text,
  destination_address text,
  cash_collection_amount numeric(10, 2) not null default 0,
  shipping_fee numeric(10, 2) not null default 0,
  booking_payload jsonb not null default '{}'::jsonb,
  latest_provider_payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  booked_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_store_courier_connections_store_id
  on public.store_courier_connections(store_id);

create index if not exists idx_order_shipments_store_id
  on public.order_shipments(store_id, created_at desc);

create index if not exists idx_order_shipments_order_id
  on public.order_shipments(order_id);

create index if not exists idx_order_shipments_status
  on public.order_shipments(store_id, status, created_at desc);

alter table public.store_courier_connections enable row level security;
alter table public.order_shipments enable row level security;

drop policy if exists "Store managers can view courier connections" on public.store_courier_connections;
create policy "Store managers can view courier connections"
on public.store_courier_connections
for select
to authenticated
using (can_manage_store(store_id, auth.uid()));

drop policy if exists "Store managers can create courier connections" on public.store_courier_connections;
create policy "Store managers can create courier connections"
on public.store_courier_connections
for insert
to authenticated
with check (can_manage_store(store_id, auth.uid()));

drop policy if exists "Store managers can update courier connections" on public.store_courier_connections;
create policy "Store managers can update courier connections"
on public.store_courier_connections
for update
to authenticated
using (can_manage_store(store_id, auth.uid()))
with check (can_manage_store(store_id, auth.uid()));

drop policy if exists "Store managers can view shipments" on public.order_shipments;
create policy "Store managers can view shipments"
on public.order_shipments
for select
to authenticated
using (can_manage_store(store_id, auth.uid()));

drop policy if exists "Store managers can create shipments" on public.order_shipments;
create policy "Store managers can create shipments"
on public.order_shipments
for insert
to authenticated
with check (can_manage_store(store_id, auth.uid()));

drop policy if exists "Store managers can update shipments" on public.order_shipments;
create policy "Store managers can update shipments"
on public.order_shipments
for update
to authenticated
using (can_manage_store(store_id, auth.uid()))
with check (can_manage_store(store_id, auth.uid()));
