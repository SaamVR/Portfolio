create table if not exists public.platform_identity_config (
  singleton boolean primary key default true check (singleton),
  site_name text not null default 'EZComo' check (char_length(btrim(site_name)) between 1 and 80),
  legal_operator_name text check (legal_operator_name is null or char_length(btrim(legal_operator_name)) between 1 and 160),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.platform_identity_config enable row level security;
revoke all on public.platform_identity_config from public, anon, authenticated;
grant select, insert, update, delete on public.platform_identity_config to service_role;
grant all on public.platform_identity_config to postgres;
insert into public.platform_identity_config(singleton, site_name) values (true, 'EZComo') on conflict (singleton) do nothing;

create table if not exists public.platform_policy_versions (
  policy_version text primary key,
  effective_at timestamptz not null,
  site_name_snapshot text not null check (char_length(btrim(site_name_snapshot)) between 1 and 80),
  legal_operator_name_snapshot text not null check (char_length(btrim(legal_operator_name_snapshot)) between 1 and 160),
  acceptance_text text not null check (char_length(btrim(acceptance_text)) > 0),
  document_paths jsonb not null default '["/terms","/privacy","/billing-policy"]'::jsonb,
  status text not null check (status in ('binding','retired')),
  approved_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.platform_policy_versions enable row level security;
revoke all on public.platform_policy_versions from public, anon, authenticated;
grant select, insert, update, delete on public.platform_policy_versions to service_role;
grant all on public.platform_policy_versions to postgres;

alter table public.platform_policy_config
  add column if not exists site_name_snapshot text,
  add column if not exists legal_operator_name_snapshot text;

create or replace function public.set_platform_identity(p_site_name text, p_legal_operator_name text, p_updated_by uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_site_name text := btrim(coalesce(p_site_name, ''));
  v_legal_operator text := nullif(btrim(coalesce(p_legal_operator_name, '')), '');
  v_binding boolean;
  v_site_snapshot text;
  v_operator_snapshot text;
begin
  if char_length(v_site_name) < 1 or char_length(v_site_name) > 80 then raise exception 'site name must be between 1 and 80 characters'; end if;
  if v_legal_operator is not null and char_length(v_legal_operator) > 160 then raise exception 'legal operator name must be at most 160 characters'; end if;
  update public.platform_identity_config set site_name=v_site_name, legal_operator_name=v_legal_operator, updated_at=now(), updated_by=p_updated_by where singleton=true;
  select binding, site_name_snapshot, legal_operator_name_snapshot into v_binding, v_site_snapshot, v_operator_snapshot from public.platform_policy_config where singleton=true;
  return jsonb_build_object('site_name',v_site_name,'legal_operator_name',v_legal_operator,'legal_republish_required',coalesce(v_binding,false) and (v_site_snapshot is distinct from v_site_name or v_operator_snapshot is distinct from v_legal_operator));
end; $$;
revoke all on function public.set_platform_identity(text,text,uuid) from public, anon, authenticated;
grant execute on function public.set_platform_identity(text,text,uuid) to service_role, postgres;

create or replace function public.activate_platform_policy_version(p_policy_version text, p_effective_at timestamptz, p_approved_by uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_version text := btrim(coalesce(p_policy_version, ''));
  v_site_name text;
  v_legal_operator text;
  v_acceptance_text text;
  v_existing public.platform_policy_versions%rowtype;
begin
  if v_version = '' or char_length(v_version) > 120 then raise exception 'invalid policy version'; end if;
  if p_effective_at is null then raise exception 'effective_at is required'; end if;
  select site_name, legal_operator_name into v_site_name, v_legal_operator from public.platform_identity_config where singleton=true;
  if coalesce(btrim(v_site_name),'')='' then raise exception 'site name must be configured before policy activation'; end if;
  if coalesce(btrim(v_legal_operator),'')='' then raise exception 'legal operator name must be configured before policy activation'; end if;
  v_acceptance_text := format('I agree to the %s Terms of Service and Billing, Renewal, Cancellation & Refund Policy, and I acknowledge the %s Privacy Policy, version %s.',v_site_name,v_site_name,v_version);
  select * into v_existing from public.platform_policy_versions where policy_version=v_version;
  if found then
    if v_existing.site_name_snapshot is distinct from v_site_name or v_existing.legal_operator_name_snapshot is distinct from v_legal_operator or v_existing.acceptance_text is distinct from v_acceptance_text or v_existing.effective_at is distinct from p_effective_at then raise exception 'policy version already exists with a different immutable snapshot'; end if;
  else
    insert into public.platform_policy_versions(policy_version,effective_at,site_name_snapshot,legal_operator_name_snapshot,acceptance_text,document_paths,status,approved_at,approved_by)
    values(v_version,p_effective_at,v_site_name,v_legal_operator,v_acceptance_text,'["/terms","/privacy","/billing-policy"]'::jsonb,'binding',now(),p_approved_by);
  end if;
  update public.platform_policy_versions set status='retired' where status='binding' and policy_version<>v_version;
  update public.platform_policy_versions set status='binding' where policy_version=v_version;
  update public.platform_policy_config set policy_version=v_version,binding=true,acceptance_text=v_acceptance_text,effective_at=p_effective_at,site_name_snapshot=v_site_name,legal_operator_name_snapshot=v_legal_operator,updated_at=now() where singleton=true;
  return jsonb_build_object('policy_version',v_version,'effective_at',p_effective_at,'site_name_snapshot',v_site_name,'legal_operator_name_snapshot',v_legal_operator,'acceptance_text',v_acceptance_text);
end; $$;
revoke all on function public.activate_platform_policy_version(text,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.activate_platform_policy_version(text,timestamptz,uuid) to service_role, postgres;

create table if not exists public.platform_messaging_config (
  singleton boolean primary key default true check (singleton),
  active_sms_provider text not null default 'greenweb' check (active_sms_provider ~ '^[a-z0-9_]{2,40}$'),
  sms_enabled boolean not null default false,
  otp_enabled boolean not null default false,
  transactional_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.platform_messaging_config enable row level security;
revoke all on public.platform_messaging_config from public, anon, authenticated;
grant select, insert, update, delete on public.platform_messaging_config to service_role;
grant all on public.platform_messaging_config to postgres;
insert into public.platform_messaging_config(singleton,active_sms_provider) values(true,'greenweb') on conflict(singleton) do nothing;

create table if not exists public.platform_sms_provider_connections (
  provider text primary key check (provider ~ '^[a-z0-9_]{2,40}$'),
  status text not null default 'not_configured' check (status in ('not_configured','configured','revoked')),
  vault_secret_id uuid,
  public_metadata jsonb not null default '{}'::jsonb,
  verification_status text not null default 'not_checked' check (verification_status in ('not_checked','verified','failed')),
  last_verified_at timestamptz,
  verification_error text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.platform_sms_provider_connections enable row level security;
revoke all on public.platform_sms_provider_connections from public, anon, authenticated;
grant select, insert, update, delete on public.platform_sms_provider_connections to service_role;
grant all on public.platform_sms_provider_connections to postgres;
insert into public.platform_sms_provider_connections(provider) values('greenweb') on conflict(provider) do nothing;

create or replace function public.configure_platform_sms_provider(p_provider text,p_secret text,p_updated_by uuid default null)
returns jsonb language plpgsql security definer set search_path = public, vault as $$
declare
  v_provider text := lower(btrim(coalesce(p_provider,'')));
  v_secret text := btrim(coalesce(p_secret,''));
  v_secret_id uuid;
  v_secret_name text;
begin
  if v_provider !~ '^[a-z0-9_]{2,40}$' then raise exception 'invalid SMS provider'; end if;
  if char_length(v_secret)<8 or char_length(v_secret)>4096 then raise exception 'invalid provider credential'; end if;
  v_secret_name := 'platform_sms_provider_' || v_provider;
  select c.vault_secret_id into v_secret_id from public.platform_sms_provider_connections c where c.provider=v_provider;
  if v_secret_id is null then select s.id into v_secret_id from vault.secrets s where s.name=v_secret_name limit 1; end if;
  if v_secret_id is null then
    v_secret_id := vault.create_secret(v_secret,v_secret_name,'Platform SMS provider credential for '||v_provider,null);
  else
    perform vault.update_secret(v_secret_id,v_secret,v_secret_name,'Platform SMS provider credential for '||v_provider,null);
  end if;
  insert into public.platform_sms_provider_connections(provider,status,vault_secret_id,verification_status,last_verified_at,verification_error,updated_at,updated_by)
  values(v_provider,'configured',v_secret_id,'not_checked',null,null,now(),p_updated_by)
  on conflict(provider) do update set status=excluded.status,vault_secret_id=excluded.vault_secret_id,verification_status=excluded.verification_status,last_verified_at=excluded.last_verified_at,verification_error=excluded.verification_error,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
  return jsonb_build_object('provider',v_provider,'configured',true,'verification_status','not_checked');
end; $$;
revoke all on function public.configure_platform_sms_provider(text,text,uuid) from public, anon, authenticated;
grant execute on function public.configure_platform_sms_provider(text,text,uuid) to service_role, postgres;

create or replace function public.get_platform_sms_provider_secret(p_provider text)
returns text language plpgsql security definer set search_path = public, vault as $$
declare v_secret_id uuid; v_status text; v_secret text;
begin
  select c.vault_secret_id,c.status into v_secret_id,v_status from public.platform_sms_provider_connections c where c.provider=lower(btrim(coalesce(p_provider,'')));
  if v_status is distinct from 'configured' or v_secret_id is null then return null; end if;
  select d.decrypted_secret into v_secret from vault.decrypted_secrets d where d.id=v_secret_id;
  return v_secret;
end; $$;
revoke all on function public.get_platform_sms_provider_secret(text) from public, anon, authenticated;
grant execute on function public.get_platform_sms_provider_secret(text) to service_role, postgres;

create or replace function public.mark_platform_sms_provider_verification(p_provider text,p_success boolean,p_error text default null,p_public_metadata jsonb default '{}'::jsonb,p_updated_by uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_provider text := lower(btrim(coalesce(p_provider,'')));
begin
  update public.platform_sms_provider_connections c set verification_status=case when p_success then 'verified' else 'failed' end,last_verified_at=now(),verification_error=case when p_success then null else left(nullif(btrim(coalesce(p_error,'')),''),500) end,public_metadata=coalesce(p_public_metadata,'{}'::jsonb),updated_at=now(),updated_by=p_updated_by where c.provider=v_provider and c.status='configured';
  if not found then raise exception 'SMS provider is not configured'; end if;
  return jsonb_build_object('provider',v_provider,'verification_status',case when p_success then 'verified' else 'failed' end);
end; $$;
revoke all on function public.mark_platform_sms_provider_verification(text,boolean,text,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.mark_platform_sms_provider_verification(text,boolean,text,jsonb,uuid) to service_role, postgres;

create or replace function public.set_platform_messaging_config(p_provider text,p_sms_enabled boolean,p_otp_enabled boolean,p_transactional_enabled boolean,p_updated_by uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_provider text := lower(btrim(coalesce(p_provider,''))); v_status text; v_verification text;
begin
  if v_provider !~ '^[a-z0-9_]{2,40}$' then raise exception 'invalid SMS provider'; end if;
  if coalesce(p_sms_enabled,false) or coalesce(p_otp_enabled,false) or coalesce(p_transactional_enabled,false) then
    select c.status,c.verification_status into v_status,v_verification from public.platform_sms_provider_connections c where c.provider=v_provider;
    if v_status is distinct from 'configured' or v_verification is distinct from 'verified' then raise exception 'SMS provider must be configured and verified before it can be enabled'; end if;
  end if;
  update public.platform_messaging_config set active_sms_provider=v_provider,sms_enabled=coalesce(p_sms_enabled,false),otp_enabled=coalesce(p_otp_enabled,false),transactional_enabled=coalesce(p_transactional_enabled,false),updated_at=now(),updated_by=p_updated_by where singleton=true;
  return jsonb_build_object('active_sms_provider',v_provider,'sms_enabled',coalesce(p_sms_enabled,false),'otp_enabled',coalesce(p_otp_enabled,false),'transactional_enabled',coalesce(p_transactional_enabled,false));
end; $$;
revoke all on function public.set_platform_messaging_config(text,boolean,boolean,boolean,uuid) from public, anon, authenticated;
grant execute on function public.set_platform_messaging_config(text,boolean,boolean,boolean,uuid) to service_role, postgres;

create or replace function public.revoke_platform_sms_provider(p_provider text,p_updated_by uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_provider text := lower(btrim(coalesce(p_provider,'')));
begin
  update public.platform_sms_provider_connections c set status='revoked',verification_status='not_checked',last_verified_at=null,verification_error=null,updated_at=now(),updated_by=p_updated_by where c.provider=v_provider;
  update public.platform_messaging_config set sms_enabled=false,otp_enabled=false,transactional_enabled=false,updated_at=now(),updated_by=p_updated_by where singleton=true and active_sms_provider=v_provider;
  return jsonb_build_object('provider',v_provider,'configured',false,'revoked',true);
end; $$;
revoke all on function public.revoke_platform_sms_provider(text,uuid) from public, anon, authenticated;
grant execute on function public.revoke_platform_sms_provider(text,uuid) to service_role, postgres;
