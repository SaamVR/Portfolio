-- Prevent merchant signup or any other new-store path from assigning an unavailable plan.
create or replace function public.reject_inactive_new_store_plan_205()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id text := nullif(btrim(coalesce(new.plan, '')), '');
  v_plan_is_active boolean := false;
begin
  if v_plan_id is null then
    raise exception 'A valid plan is required before a store can be created'
      using errcode = '23514';
  end if;

  select coalesce(plan.is_active, false)
    into v_plan_is_active
    from public.cms_plans as plan
   where plan.id = v_plan_id
   limit 1;

  if not coalesce(v_plan_is_active, false) then
    raise exception 'Plan "%" is not active for new stores', v_plan_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_inactive_new_store_plan_205() from public, anon, authenticated;

drop trigger if exists reject_inactive_new_store_plan_205 on public.stores;
create trigger reject_inactive_new_store_plan_205
before insert on public.stores
for each row
execute function public.reject_inactive_new_store_plan_205();
