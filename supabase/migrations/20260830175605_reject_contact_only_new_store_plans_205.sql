-- New stores may only self-select active plans that are not contact/support-only.
create or replace function public.enforce_new_store_plan_active()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not exists (
    select 1
    from public.cms_plans as plan
    where plan.id = new.plan
      and plan.is_active = true
      and coalesce(plan.contact_only, false) = false
  ) then
    raise exception 'Store plan is not available for direct signup'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;
