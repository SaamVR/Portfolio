create table if not exists public.store_cart_recovery_leads (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  visitor_id text,
  session_id text,
  contact_name text,
  contact_email text,
  contact_phone text,
  contact_capture_source text not null default 'cart'
    check (contact_capture_source in ('cart', 'checkout', 'account', 'operator')),
  contact_consent_status text not null default 'unknown'
    check (contact_consent_status in ('accepted', 'declined', 'unknown', 'operational')),
  marketing_opt_out_at timestamptz,
  cart_snapshot jsonb not null default '[]'::jsonb,
  cart_value integer not null default 0,
  item_count integer not null default 0,
  status text not null default 'active'
    check (status in ('active', 'abandoned', 'contacted', 'recovered', 'expired', 'opted_out')),
  abandonment_window_minutes integer not null default 60,
  recovery_stage text not null default 'cart'
    check (recovery_stage in ('cart', 'checkout', 'sequence', 'recovered')),
  abandoned_at timestamptz,
  last_activity_at timestamptz not null default now(),
  next_contact_at timestamptz,
  last_contact_at timestamptz,
  recovered_order_id uuid references public.orders(id) on delete set null,
  recovered_revenue integer not null default 0,
  recovery_coupon_code text,
  attribution_source text,
  attribution_medium text,
  attribution_campaign text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_cart_recovery_messages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  lead_id uuid not null references public.store_cart_recovery_leads(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  template_key text not null default 'gentle-reminder',
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped', 'opted_out')),
  provider text,
  provider_message_id text,
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  error_message text,
  coupon_code text,
  attributed_revenue integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.store_revenue_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  event_type text not null
    check (event_type in ('sale', 'refund', 'partial_refund', 'cancellation')),
  gross_amount integer not null default 0,
  refund_amount integer not null default 0,
  net_amount integer not null default 0,
  currency_code text not null default 'BDT',
  payment_method text,
  status text,
  attribution_source text,
  attribution_medium text,
  attribution_campaign text,
  metadata jsonb not null default '{}'::jsonb,
  event_timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.store_cart_recovery_leads enable row level security;
alter table public.store_cart_recovery_messages enable row level security;
alter table public.store_revenue_events enable row level security;

drop policy if exists "Store staff can view cart recovery leads" on public.store_cart_recovery_leads;
create policy "Store staff can view cart recovery leads"
  on public.store_cart_recovery_leads for select
  to authenticated
  using (public.can_manage_store(store_id, auth.uid()));

drop policy if exists "Store staff can view cart recovery messages" on public.store_cart_recovery_messages;
create policy "Store staff can view cart recovery messages"
  on public.store_cart_recovery_messages for select
  to authenticated
  using (public.can_manage_store(store_id, auth.uid()));

drop policy if exists "Store staff can manage cart recovery messages" on public.store_cart_recovery_messages;
create policy "Store staff can manage cart recovery messages"
  on public.store_cart_recovery_messages for all
  to authenticated
  using (public.can_manage_store(store_id, auth.uid()))
  with check (public.can_manage_store(store_id, auth.uid()));

drop policy if exists "Store staff can view revenue events" on public.store_revenue_events;
create policy "Store staff can view revenue events"
  on public.store_revenue_events for select
  to authenticated
  using (public.can_manage_store(store_id, auth.uid()));

create index if not exists idx_store_cart_recovery_leads_store_status
  on public.store_cart_recovery_leads(store_id, status, last_activity_at desc);

create index if not exists idx_store_cart_recovery_leads_store_user
  on public.store_cart_recovery_leads(store_id, user_id, last_activity_at desc)
  where user_id is not null;

create index if not exists idx_store_cart_recovery_leads_store_visitor_session
  on public.store_cart_recovery_leads(store_id, visitor_id, session_id, last_activity_at desc);

create index if not exists idx_store_cart_recovery_messages_lead_created
  on public.store_cart_recovery_messages(lead_id, created_at desc);

create index if not exists idx_store_revenue_events_store_time
  on public.store_revenue_events(store_id, event_timestamp desc);

create index if not exists idx_store_revenue_events_store_type_time
  on public.store_revenue_events(store_id, event_type, event_timestamp desc);

drop trigger if exists store_cart_recovery_leads_updated_at on public.store_cart_recovery_leads;
create trigger store_cart_recovery_leads_updated_at
  before update on public.store_cart_recovery_leads
  for each row
  execute function public.update_updated_at_column();
