create or replace function public.activate_platform_policy_version(
  p_policy_version text,
  p_effective_at timestamptz,
  p_approved_by uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_version text := btrim(coalesce(p_policy_version, ''));
  v_site_name text;
  v_legal_operator text;
  v_acceptance_text text;
  v_jurisdiction_enforcement boolean;
  v_existing public.platform_policy_versions%rowtype;
begin
  if v_version = '' or char_length(v_version) > 120 then raise exception 'invalid policy version'; end if;
  if p_effective_at is null then raise exception 'effective_at is required'; end if;
  select country_enforcement_enabled into v_jurisdiction_enforcement
    from public.platform_jurisdiction_enforcement_config where singleton=true;
  if coalesce(v_jurisdiction_enforcement,false)=false then
    raise exception 'jurisdiction enforcement must be enabled before policy activation';
  end if;
  select site_name, legal_operator_name into v_site_name, v_legal_operator
    from public.platform_identity_config where singleton=true;
  if coalesce(btrim(v_site_name),'')='' then raise exception 'site name must be configured before policy activation'; end if;
  if coalesce(btrim(v_legal_operator),'')='' then raise exception 'legal operator name must be configured before policy activation'; end if;
  v_acceptance_text := format('I agree to the %s Terms of Service and Billing, Renewal, Cancellation & Refund Policy, and I acknowledge the %s Privacy Policy, version %s.',v_site_name,v_site_name,v_version);
  select * into v_existing from public.platform_policy_versions where policy_version=v_version;
  if found then
    if v_existing.site_name_snapshot is distinct from v_site_name
       or v_existing.legal_operator_name_snapshot is distinct from v_legal_operator
       or v_existing.acceptance_text is distinct from v_acceptance_text
       or v_existing.effective_at is distinct from p_effective_at then
      raise exception 'policy version already exists with a different immutable snapshot';
    end if;
  else
    insert into public.platform_policy_versions(
      policy_version,effective_at,site_name_snapshot,legal_operator_name_snapshot,
      acceptance_text,document_paths,status,approved_at,approved_by
    ) values(
      v_version,p_effective_at,v_site_name,v_legal_operator,v_acceptance_text,
      '["/terms","/privacy","/billing-policy"]'::jsonb,'binding',now(),p_approved_by
    );
  end if;
  update public.platform_policy_versions set status='retired'
    where status='binding' and policy_version<>v_version;
  update public.platform_policy_versions set status='binding' where policy_version=v_version;
  update public.platform_policy_config set policy_version=v_version,binding=true,
    acceptance_text=v_acceptance_text,effective_at=p_effective_at,
    site_name_snapshot=v_site_name,legal_operator_name_snapshot=v_legal_operator,updated_at=now()
    where singleton=true;
  return jsonb_build_object(
    'policy_version',v_version,'effective_at',p_effective_at,
    'site_name_snapshot',v_site_name,'legal_operator_name_snapshot',v_legal_operator,
    'acceptance_text',v_acceptance_text
  );
end; $$;
revoke all on function public.activate_platform_policy_version(text,timestamptz,uuid)
  from public, anon, authenticated;
grant execute on function public.activate_platform_policy_version(text,timestamptz,uuid)
  to service_role, postgres;
