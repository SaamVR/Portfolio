-- New stores may only self-select active catalog plans that are not support/contact-only.
create or replace function public.reject_inactive_new_store_plan_205()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id text := nullif(btrim(coalesce(new.plan, '')), '');
  v_plan_is_active boolean := false;
  v_plan_contact_only boolean := true;
begin
  if v_plan_id is null then
    raise exception 'A valid plan is required before a store can be created'
      using errcode = '23514';
  end if;

  select
    coalesce(plan.is_active, false),
    coalesce(plan.contact_only, false)
    into v_plan_is_active, v_plan_contact_only
    from public.cms_plans as plan
   where plan.id = v_plan_id
   limit 1;

  if not coalesce(v_plan_is_active, false) then
    raise exception 'Plan "%" is not active for new stores', v_plan_id
      using errcode = '23514';
  end if;

  if coalesce(v_plan_contact_only, true) then
    raise exception 'Plan "%" must be activated through support before a store can be created', v_plan_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_inactive_new_store_plan_205() from public, anon, authenticated;
