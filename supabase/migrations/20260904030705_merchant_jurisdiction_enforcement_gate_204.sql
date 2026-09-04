create table if not exists public.platform_jurisdiction_enforcement_config (
  singleton boolean primary key default true check (singleton),
  country_enforcement_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.platform_jurisdiction_enforcement_config enable row level security;
revoke all on public.platform_jurisdiction_enforcement_config from public, anon, authenticated;
grant select, insert, update on public.platform_jurisdiction_enforcement_config to service_role;
grant all on public.platform_jurisdiction_enforcement_config to postgres;

insert into public.platform_jurisdiction_enforcement_config(singleton, country_enforcement_enabled)
values(true, false)
on conflict(singleton) do nothing;

create or replace function public.assert_current_platform_policy_accepted(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enforcement_enabled boolean;
  v_version text;
  v_binding boolean;
  v_effective_at timestamptz;
  v_country text;
  v_regime text;
  v_contract_required boolean;
  v_privacy_required boolean;
begin
  select country_enforcement_enabled
    into v_enforcement_enabled
  from public.platform_jurisdiction_enforcement_config
  where singleton = true;

  if coalesce(v_enforcement_enabled, false) = false then
    return;
  end if;

  select business_country_code, legal_regime
    into v_country, v_regime
  from public.merchant_legal_profiles
  where user_id = p_user_id;

  if coalesce(v_country, '') = '' or coalesce(v_regime, '') = '' then
    raise exception using
      errcode = 'P0001',
      message = 'merchant_country_required';
  end if;

  select policy_version, binding, effective_at
    into v_version, v_binding, v_effective_at
  from public.platform_policy_config
  where singleton = true;

  if coalesce(v_binding, false) = false
     or v_effective_at is null
     or now() < v_effective_at then
    return;
  end if;

  select merchant_contract_acceptance_required, privacy_acknowledgement_required
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
