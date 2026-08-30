-- #169 recovery refinement: reselecting the same backup after a page refresh
-- reuses its durable preflight/staging/running operation instead of creating
-- a competing restore.

create or replace function public.create_store_restore_operation(
  p_target_store_id uuid,
  p_actor_id uuid,
  p_request_digest text,
  p_format text,
  p_source_store_id uuid,
  p_source_metadata jsonb,
  p_options jsonb,
  p_media_manifest jsonb
)
returns table(
  operation_id uuid,
  operation_status text,
  target_state_digest text
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_operation_id uuid := gen_random_uuid();
  v_digest text;
  v_include_operational boolean := coalesce((p_options->>'includeOperationalData')::boolean, false);
  v_access_mode text := coalesce(p_options->>'accessImportMode', 'none');
  v_replace_subscription boolean := coalesce((p_options->>'replaceSubscription')::boolean, false);
  v_replace_target_content boolean := coalesce((p_options->>'replaceTargetContent')::boolean, true);
  v_source_store_id uuid := null;
  v_media_count integer;
  v_media_bytes bigint;
  v_existing public.store_backup_events%rowtype;
begin
  perform 1 from public.stores s where s.id = p_target_store_id for update;
  if not found then
    raise exception 'Target store not found';
  end if;

  perform 1 from public.store_memberships sm
    where sm.store_id = p_target_store_id and sm.user_id = p_actor_id
    for update;
  perform 1 from public.user_roles ur
    where ur.user_id = p_actor_id
    for update;

  if not public.store_restore_actor_can_manage(p_target_store_id, p_actor_id) then
    raise exception 'Store owner or admin access required';
  end if;

  if p_format not in ('json','zip') then
    raise exception 'Invalid restore format';
  end if;
  if p_request_digest is null or p_request_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid restore request digest';
  end if;
  if v_access_mode not in ('none','invites_only','memberships_and_invites') then
    raise exception 'Invalid restore access mode';
  end if;
  if jsonb_typeof(coalesce(p_media_manifest, '[]'::jsonb)) <> 'array' then
    raise exception 'Restore media manifest must be an array';
  end if;

  select count(*), coalesce(sum((m->>'declaredBytes')::bigint), 0)
    into v_media_count, v_media_bytes
    from jsonb_array_elements(coalesce(p_media_manifest, '[]'::jsonb)) m;

  if v_media_count > 200 or v_media_bytes > 262144000 then
    raise exception 'Restore media exceeds aggregate limits';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_media_manifest, '[]'::jsonb)) m
    where coalesce(m->>'originalUrl','') = ''
       or coalesce((m->>'declaredBytes')::bigint, 0) <= 0
       or (m->>'resourceType' = 'image' and (m->>'declaredBytes')::bigint > 10485760)
       or (m->>'resourceType' = 'video' and (m->>'declaredBytes')::bigint > 52428800)
       or coalesce(m->>'resourceType','') not in ('image','video')
  ) then
    raise exception 'Restore media manifest contains an invalid item';
  end if;
  if exists (
    select 1
    from (
      select m->>'originalUrl' as original_url, count(*) as n
      from jsonb_array_elements(coalesce(p_media_manifest, '[]'::jsonb)) m
      group by m->>'originalUrl'
      having count(*) > 1
    ) d
  ) then
    raise exception 'Restore media manifest contains duplicate source URLs';
  end if;

  -- Recovery path: after a reload, the same actor can reselect the exact same
  -- backup/options digest and continue the same non-terminal operation. A
  -- different backup remains blocked by the one-active-restore invariant.
  select * into v_existing
  from public.store_backup_events e
  where e.target_store_id = p_target_store_id
    and e.lifecycle_managed
    and e.action = 'import'
    and e.actor_user_id = p_actor_id
    and e.request_digest = p_request_digest
    and e.status in ('preflight','staging','running')
  order by e.created_at desc
  limit 1
  for update;

  if found then
    return query select v_existing.id, v_existing.status, v_existing.target_state_digest;
    return;
  end if;

  update public.store_backup_events
  set status = 'failed',
      error_summary = 'Superseded by a newer restore preflight.',
      updated_at = now(),
      completed_at = now()
  where target_store_id = p_target_store_id
    and lifecycle_managed
    and action = 'import'
    and status = 'preflight'
    and jsonb_array_length(coalesce(metadata->'staged_media','[]'::jsonb)) = 0;

  if exists (
    select 1
    from public.store_backup_events e
    where e.target_store_id = p_target_store_id
      and e.lifecycle_managed
      and e.action = 'import'
      and e.status in ('staging','running','committed','reconciliation_required')
  ) then
    raise exception 'Another restore operation is already active for this store';
  end if;

  if p_source_store_id is not null
     and exists (select 1 from public.stores s where s.id = p_source_store_id)
     and public.store_restore_actor_can_manage(p_source_store_id, p_actor_id)
  then
    v_source_store_id := p_source_store_id;
  end if;

  v_digest := public.store_restore_target_state_digest(
    p_target_store_id,
    v_include_operational,
    v_access_mode,
    v_replace_subscription,
    v_replace_target_content
  );

  insert into public.store_backup_events (
    id, store_id, actor_user_id, action, format,
    source_store_id, target_store_id, metadata, created_at,
    status, lifecycle_managed, updated_at, request_digest, target_state_digest
  )
  values (
    v_operation_id, p_target_store_id, p_actor_id, 'import', p_format,
    v_source_store_id, p_target_store_id,
    jsonb_build_object(
      'source', coalesce(p_source_metadata, '{}'::jsonb),
      'options', p_options,
      'media_manifest', coalesce(p_media_manifest, '[]'::jsonb),
      'staged_media', '[]'::jsonb
    ),
    now(), 'preflight', true, now(), p_request_digest, v_digest
  );

  return query select v_operation_id, 'preflight'::text, v_digest;
end;
$$;

revoke all on function public.create_store_restore_operation(uuid,uuid,text,text,uuid,jsonb,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.create_store_restore_operation(uuid,uuid,text,text,uuid,jsonb,jsonb,jsonb)
  to service_role;
