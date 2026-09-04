create table if not exists public.platform_jurisdiction_rules (
  legal_regime text primary key check (legal_regime ~ '^[A-Z0-9_]{2,32}$'),
  merchant_contract_acceptance_required boolean not null default true,
  privacy_acknowledgement_required boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.platform_jurisdiction_rules enable row level security;
revoke all on public.platform_jurisdiction_rules from public, anon, authenticated;
grant select, insert, update, delete on public.platform_jurisdiction_rules to service_role;
grant all on public.platform_jurisdiction_rules to postgres;

insert into public.platform_jurisdiction_rules(
  legal_regime,
  merchant_contract_acceptance_required,
  privacy_acknowledgement_required
)
values
  ('GLOBAL', true, true),
  ('BD', true, true),
  ('IN', true, true),
  ('EEA', true, true),
  ('UK', true, true),
  ('US', true, true)
on conflict (legal_regime) do nothing;

create table if not exists public.platform_country_jurisdictions (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  legal_regime text not null references public.platform_jurisdiction_rules(legal_regime),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.platform_country_jurisdictions enable row level security;
revoke all on public.platform_country_jurisdictions from public, anon, authenticated;
grant select, insert, update, delete on public.platform_country_jurisdictions to service_role;
grant all on public.platform_country_jurisdictions to postgres;

insert into public.platform_country_jurisdictions(country_code, legal_regime)
values
  ('BD', 'BD'),
  ('IN', 'IN'),
  ('GB', 'UK'),
  ('US', 'US'),
  ('AT', 'EEA'), ('BE', 'EEA'), ('BG', 'EEA'), ('HR', 'EEA'), ('CY', 'EEA'),
  ('CZ', 'EEA'), ('DK', 'EEA'), ('EE', 'EEA'), ('FI', 'EEA'), ('FR', 'EEA'),
  ('DE', 'EEA'), ('GR', 'EEA'), ('HU', 'EEA'), ('IE', 'EEA'), ('IT', 'EEA'),
  ('LV', 'EEA'), ('LT', 'EEA'), ('LU', 'EEA'), ('MT', 'EEA'), ('NL', 'EEA'),
  ('PL', 'EEA'), ('PT', 'EEA'), ('RO', 'EEA'), ('SK', 'EEA'), ('SI', 'EEA'),
  ('ES', 'EEA'), ('SE', 'EEA'), ('IS', 'EEA'), ('LI', 'EEA'), ('NO', 'EEA')
on conflict (country_code) do nothing;

create or replace function public.resolve_platform_legal_regime(p_country_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select c.legal_regime
      from public.platform_country_jurisdictions c
      where c.country_code = upper(btrim(coalesce(p_country_code, '')))
    ),
    'GLOBAL'
  );
$$;

revoke all on function public.resolve_platform_legal_regime(text)
  from public, anon, authenticated;
grant execute on function public.resolve_platform_legal_regime(text)
  to service_role, postgres;

create table if not exists public.merchant_legal_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_country_code text not null check (business_country_code ~ '^[A-Z]{2}$'),
  legal_regime text not null references public.platform_jurisdiction_rules(legal_regime),
  geo_hint_country_code text check (geo_hint_country_code is null or geo_hint_country_code ~ '^[A-Z]{2}$'),
  geo_hint_region_code text check (
    geo_hint_region_code is null or geo_hint_region_code ~ '^[A-Z0-9-]{1,12}$'
  ),
  source text not null default 'merchant_selected' check (source in ('merchant_selected', 'admin_updated')),
  confirmed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.merchant_legal_profiles enable row level security;
revoke all on public.merchant_legal_profiles from public, anon, authenticated;
grant select, insert, update, delete on public.merchant_legal_profiles to service_role;
grant all on public.merchant_legal_profiles to postgres;

create or replace function public.set_merchant_legal_profile(
  p_user_id uuid,
  p_business_country_code text,
  p_geo_hint_country_code text default null,
  p_geo_hint_region_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_country text := upper(btrim(coalesce(p_business_country_code, '')));
  v_geo_country text := nullif(upper(btrim(coalesce(p_geo_hint_country_code, ''))), '');
  v_geo_region text := nullif(upper(btrim(coalesce(p_geo_hint_region_code, ''))), '');
  v_regime text;
begin
  if p_user_id is null then
    raise exception 'merchant user is required';
  end if;
  if v_country !~ '^[A-Z]{2}$' then
    raise exception 'business country must be a two-letter ISO code';
  end if;
  if v_geo_country is not null and v_geo_country !~ '^[A-Z]{2}$' then
    v_geo_country := null;
  end if;
  if v_geo_region is not null and v_geo_region !~ '^[A-Z0-9-]{1,12}$' then
    v_geo_region := null;
  end if;

  v_regime := public.resolve_platform_legal_regime(v_country);

  insert into public.merchant_legal_profiles(
    user_id,
    business_country_code,
    legal_regime,
    geo_hint_country_code,
    geo_hint_region_code,
    source,
    confirmed_at,
    updated_at
  )
  values(
    p_user_id,
    v_country,
    v_regime,
    v_geo_country,
    v_geo_region,
    'merchant_selected',
    now(),
    now()
  )
  on conflict (user_id) do update set
    business_country_code = excluded.business_country_code,
    legal_regime = excluded.legal_regime,
    geo_hint_country_code = excluded.geo_hint_country_code,
    geo_hint_region_code = excluded.geo_hint_region_code,
    source = 'merchant_selected',
    confirmed_at = now(),
    updated_at = now();

  return jsonb_build_object(
    'business_country_code', v_country,
    'legal_regime', v_regime,
    'geo_hint_country_code', v_geo_country,
    'geo_hint_region_code', v_geo_region
  );
end;
$$;

revoke all on function public.set_merchant_legal_profile(uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.set_merchant_legal_profile(uuid,text,text,text)
  to service_role, postgres;

alter table public.platform_policy_acceptances
  add column if not exists business_country_code text,
  add column if not exists legal_regime text;

alter table public.platform_policy_acceptances
  drop constraint if exists platform_policy_acceptances_user_id_policy_version_key;

create unique index if not exists platform_policy_acceptances_user_version_jurisdiction_uidx
  on public.platform_policy_acceptances(
    user_id,
    policy_version,
    business_country_code,
    legal_regime
  )
  where business_country_code is not null
    and legal_regime is not null;

create index if not exists merchant_legal_profiles_regime_idx
  on public.merchant_legal_profiles(legal_regime, business_country_code);

create or replace function public.assert_current_platform_policy_accepted(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version text;
  v_binding boolean;
  v_effective_at timestamptz;
  v_country text;
  v_regime text;
  v_contract_required boolean;
  v_privacy_required boolean;
begin
  select policy_version, binding, effective_at
    into v_version, v_binding, v_effective_at
  from public.platform_policy_config
  where singleton = true;

  if coalesce(v_binding, false) = false
     or v_effective_at is null
     or now() < v_effective_at then
    return;
  end if;

  select business_country_code, legal_regime
    into v_country, v_regime
  from public.merchant_legal_profiles
  where user_id = p_user_id;

  if coalesce(v_country, '') = '' or coalesce(v_regime, '') = '' then
    raise exception using
      errcode = 'P0001',
      message = 'merchant_country_required',
      detail = coalesce(v_version, 'unknown');
  end if;

  select
    merchant_contract_acceptance_required,
    privacy_acknowledgement_required
    into v_contract_required, v_privacy_required
  from public.platform_jurisdiction_rules
  where legal_regime = v_regime;

  if coalesce(v_contract_required, true) = false
     and coalesce(v_privacy_required, true) = false then
    return;
  end if;

  if p_user_id is null or not exists (
    select 1
    from public.platform_policy_acceptances a
    where a.user_id = p_user_id
      and a.policy_version = v_version
      and a.business_country_code = v_country
      and a.legal_regime = v_regime
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'platform_policy_acceptance_required',
      detail = concat_ws(':', coalesce(v_version, 'unknown'), v_country, v_regime);
  end if;
end;
$$;

revoke all on function public.assert_current_platform_policy_accepted(uuid)
  from public, anon, authenticated;
grant execute on function public.assert_current_platform_policy_accepted(uuid)
  to service_role, postgres;
