-- Read-only rollout preflight for P1 #324.
-- This does not apply the capability migration or mutate production data.

select
  role,
  count(*) as membership_count
from public.store_memberships
group by role
order by role;

select
  count(*) filter (where sm.role = 'owner' and s.owner_id is distinct from sm.user_id) as delegated_owner_memberships,
  count(*) filter (where sm.role = 'admin') as admin_memberships,
  count(*) filter (where sm.role = 'editor') as editor_memberships,
  count(*) filter (where sm.role = 'viewer') as viewer_memberships
from public.store_memberships sm
join public.stores s on s.id = sm.store_id;

select
  count(*) filter (where role = 'owner' and status = 'pending' and claimed_by is null) as pending_owner_invites,
  count(*) filter (where role in ('admin', 'editor', 'viewer') and status = 'pending' and claimed_by is null) as pending_nonowner_invites
from public.store_staff_invites;

-- Delegated owner memberships are not part of the launch role contract. They must
-- be reconciled before rollout because owner/admin authority intentionally remains
-- privileged after #324 and #323 forbids new staff-owner grants.
do $$
begin
  if exists (
    select 1
    from public.store_memberships sm
    join public.stores s on s.id = sm.store_id
    where sm.role = 'owner'
      and s.owner_id is distinct from sm.user_id
  ) then
    raise exception 'store_role_capability_preflight: delegated owner membership requires reconciliation';
  end if;
end;
$$;
