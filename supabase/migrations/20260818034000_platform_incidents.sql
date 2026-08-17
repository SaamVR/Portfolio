-- Centralized, operator-facing application incident tracking.
-- Only trusted server code (service_role) may record or mutate incidents.

create table if not exists public.platform_incidents (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  severity text not null check (severity in ('critical', 'warning', 'prewarning', 'info')),
  source text not null,
  title text not null,
  message text not null,
  route text,
  store_id uuid references public.stores(id) on delete set null,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'resolved')),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_incidents_status_last_seen_idx
  on public.platform_incidents (status, last_seen_at desc);
create index if not exists platform_incidents_store_last_seen_idx
  on public.platform_incidents (store_id, last_seen_at desc)
  where store_id is not null;

alter table public.platform_incidents enable row level security;
revoke all on table public.platform_incidents from public, anon, authenticated;
grant select, insert, update, delete on table public.platform_incidents to service_role;

create or replace function public.record_platform_incident(
  p_fingerprint text,
  p_severity text,
  p_source text,
  p_title text,
  p_message text,
  p_route text default null,
  p_store_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(btrim(p_fingerprint), '') = '' then
    raise exception 'Incident fingerprint is required';
  end if;
  if p_severity not in ('critical', 'warning', 'prewarning', 'info') then
    raise exception 'Unsupported incident severity %', p_severity;
  end if;

  insert into public.platform_incidents (
    fingerprint,
    severity,
    source,
    title,
    message,
    route,
    store_id,
    request_id,
    metadata
  )
  values (
    btrim(p_fingerprint),
    p_severity,
    left(coalesce(nullif(btrim(p_source), ''), 'application'), 120),
    left(coalesce(nullif(btrim(p_title), ''), 'Application incident'), 240),
    left(coalesce(p_message, 'Unknown application incident'), 4000),
    nullif(left(coalesce(p_route, ''), 500), ''),
    p_store_id,
    nullif(left(coalesce(p_request_id, ''), 200), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (fingerprint) do update
  set
    severity = excluded.severity,
    source = excluded.source,
    title = excluded.title,
    message = excluded.message,
    route = coalesce(excluded.route, platform_incidents.route),
    store_id = coalesce(excluded.store_id, platform_incidents.store_id),
    request_id = coalesce(excluded.request_id, platform_incidents.request_id),
    metadata = platform_incidents.metadata || excluded.metadata,
    status = 'open',
    occurrence_count = platform_incidents.occurrence_count + 1,
    last_seen_at = now(),
    resolved_at = null,
    resolved_by = null,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_platform_incident(text, text, text, text, text, text, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_platform_incident(text, text, text, text, text, text, uuid, text, jsonb)
  to service_role;
