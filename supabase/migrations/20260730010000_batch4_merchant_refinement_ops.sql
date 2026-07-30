create table if not exists public.store_return_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  request_type text not null
    check (request_type in ('return', 'exchange', 'refund', 'partial_refund')),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'rejected', 'received', 'refunded', 'completed')),
  reason text not null,
  customer_note text,
  internal_note text,
  requested_amount integer not null default 0,
  approved_amount integer not null default 0,
  refund_mode text
    check (refund_mode in ('original_payment', 'cod_cash', 'store_credit', 'manual_transfer')),
  courier_status text not null default 'not_required'
    check (courier_status in ('not_required', 'pickup_pending', 'in_transit', 'received')),
  rma_code text,
  created_by uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_cod_reconciliation_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  courier_provider text,
  reconciliation_status text not null default 'pending'
    check (reconciliation_status in ('pending', 'submitted', 'verified', 'settled', 'disputed')),
  amount_collected integer not null default 0,
  courier_fee integer not null default 0,
  amount_remitted integer not null default 0,
  variance_amount integer not null default 0,
  settlement_reference text,
  settlement_date timestamptz,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  verified_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_return_requests enable row level security;
alter table public.store_cod_reconciliation_entries enable row level security;

drop policy if exists "Store staff can view return requests" on public.store_return_requests;
create policy "Store staff can view return requests"
  on public.store_return_requests for select
  to authenticated
  using (public.can_manage_store(store_id, auth.uid()));

drop policy if exists "Store staff can manage return requests" on public.store_return_requests;
create policy "Store staff can manage return requests"
  on public.store_return_requests for all
  to authenticated
  using (public.can_manage_store(store_id, auth.uid()))
  with check (public.can_manage_store(store_id, auth.uid()));

drop policy if exists "Store staff can view cod reconciliation entries" on public.store_cod_reconciliation_entries;
create policy "Store staff can view cod reconciliation entries"
  on public.store_cod_reconciliation_entries for select
  to authenticated
  using (public.can_manage_store(store_id, auth.uid()));

drop policy if exists "Store staff can manage cod reconciliation entries" on public.store_cod_reconciliation_entries;
create policy "Store staff can manage cod reconciliation entries"
  on public.store_cod_reconciliation_entries for all
  to authenticated
  using (public.can_manage_store(store_id, auth.uid()))
  with check (public.can_manage_store(store_id, auth.uid()));

create index if not exists idx_store_return_requests_store_status
  on public.store_return_requests(store_id, status, requested_at desc);

create index if not exists idx_store_return_requests_store_order
  on public.store_return_requests(store_id, order_id, requested_at desc);

create index if not exists idx_store_cod_reconciliation_store_status
  on public.store_cod_reconciliation_entries(store_id, reconciliation_status, created_at desc);

create index if not exists idx_store_cod_reconciliation_store_order
  on public.store_cod_reconciliation_entries(store_id, order_id, created_at desc);

drop trigger if exists store_return_requests_updated_at on public.store_return_requests;
create trigger store_return_requests_updated_at
  before update on public.store_return_requests
  for each row
  execute function public.update_updated_at_column();

drop trigger if exists store_cod_reconciliation_entries_updated_at on public.store_cod_reconciliation_entries;
create trigger store_cod_reconciliation_entries_updated_at
  before update on public.store_cod_reconciliation_entries
  for each row
  execute function public.update_updated_at_column();
