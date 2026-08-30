-- Prevent new stores from being created on an inactive or unknown catalog plan.
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
  ) then
    raise exception 'Store plan is not available for direct signup'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_new_store_plan_active on public.stores;
create trigger enforce_new_store_plan_active
before insert on public.stores
for each row
execute function public.enforce_new_store_plan_active();
