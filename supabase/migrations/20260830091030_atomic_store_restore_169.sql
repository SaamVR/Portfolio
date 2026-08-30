-- #169: atomic, recoverable merchant store restore boundary.

alter table public.store_backup_events
  add column if not exists status text not null default 'succeeded',
  add column if not exists lifecycle_managed boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists committed_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists error_summary text,
  add column if not exists request_digest text,
  add column if not exists target_state_digest text,
  add column if not exists attempt_token uuid,
  add column if not exists attempt_started_at timestamptz;

update public.store_backup_events
set updated_at = created_at,
    completed_at = coalesce(completed_at, created_at),
    status = coalesce(status, 'succeeded'),
    lifecycle_managed = coalesce(lifecycle_managed, false)
where updated_at is distinct from created_at
   or completed_at is null
   or status is null
   or lifecycle_managed is null;

alter table public.store_backup_events
  drop constraint if exists store_backup_events_status_check,
  drop constraint if exists store_backup_events_error_summary_length_check,
  drop constraint if exists store_backup_events_request_digest_check;

alter table public.store_backup_events
  add constraint store_backup_events_status_check
    check (status in ('preflight','staging','running','committed','succeeded','failed','cleanup_required','reconciliation_required')),
  add constraint store_backup_events_error_summary_length_check
    check (error_summary is null or char_length(error_summary) <= 500),
  add constraint store_backup_events_request_digest_check
    check (request_digest is null or request_digest ~ '^[0-9a-f]{64}$');

create index if not exists store_backup_events_restore_recovery_idx
  on public.store_backup_events (store_id, lifecycle_managed, status, updated_at desc);

create unique index if not exists store_backup_events_one_active_restore_per_target
  on public.store_backup_events (target_store_id)
  where lifecycle_managed
    and action = 'import'
    and status in ('preflight','staging','running','committed','reconciliation_required');

drop policy if exists "Store managers can create backup events" on public.store_backup_events;
create policy "Store managers can create backup events"
on public.store_backup_events
for insert
to authenticated
with check (
  public.can_manage_store(store_id, auth.uid())
  and lifecycle_managed = false
  and status = 'succeeded'
  and request_digest is null
  and target_state_digest is null
  and attempt_token is null
  and attempt_started_at is null
);

create or replace function public.store_restore_actor_is_full_platform_admin(
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p_actor_id
      and ur.role::text = 'admin'
  );
$$;

create or replace function public.store_restore_actor_can_manage(
  p_store_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.stores s
    where s.id = p_store_id
      and s.owner_id = p_actor_id
  )
  or exists (
    select 1
    from public.store_memberships sm
    where sm.store_id = p_store_id
      and sm.user_id = p_actor_id
      and sm.role::text in ('owner','admin')
  )
  or public.store_restore_actor_is_full_platform_admin(p_actor_id);
$$;

create or replace function public.store_restore_target_state_digest(
  p_store_id uuid,
  p_include_operational boolean,
  p_access_mode text,
  p_replace_subscription boolean,
  p_replace_target_content boolean
)
returns text
language plpgsql
stable
security definer
set search_path = public, auth, extensions
as $$
declare
  v_versions text;
begin
  if p_access_mode not in ('none','invites_only','memberships_and_invites') then
    raise exception 'Invalid restore access mode';
  end if;

  select string_agg(v.kind || ':' || v.row_id || ':' || v.version, '|' order by v.kind, v.row_id)
  into v_versions
  from (
    select 'stores'::text as kind, s.id::text as row_id, s.xmin::text as version
      from public.stores s where s.id = p_store_id
    union all
    select 'store_domains', d.id::text, d.xmin::text
      from public.store_domains d where d.store_id = p_store_id
    union all
    select 'store_business_profiles', p.store_id::text, p.xmin::text
      from public.store_business_profiles p where p.store_id = p_store_id
    union all
    select 'store_themes', t.id::text, t.xmin::text
      from public.store_themes t where t.store_id = p_store_id
    union all
    select 'store_pages', p.id::text, p.xmin::text
      from public.store_pages p where p.store_id = p_store_id
    union all
    select 'store_page_blocks', b.id::text, b.xmin::text
      from public.store_page_blocks b where b.store_id = p_store_id
    union all
    select 'store_page_revisions', r.id::text, r.xmin::text
      from public.store_page_revisions r where r.store_id = p_store_id
    union all
    select 'blog_posts', b.id::text, b.xmin::text
      from public.blog_posts b where b.store_id = p_store_id
    union all
    select 'products', p.id::text, p.xmin::text
      from public.products p where p.store_id = p_store_id
    union all
    select 'product_categories', c.id::text, c.xmin::text
      from public.product_categories c where c.store_id = p_store_id
    union all
    select 'product_types', t.id::text, t.xmin::text
      from public.product_types t where t.store_id = p_store_id
    union all
    select 'coupon_codes', c.id::text, c.xmin::text
      from public.coupon_codes c where c.store_id = p_store_id
    union all
    select 'site_settings', s.id::text, s.xmin::text
      from public.site_settings s where s.store_id = p_store_id
    union all
    select 'product_reviews', r.id::text, r.xmin::text
      from public.product_reviews r
      where r.store_id = p_store_id and p_replace_target_content
    union all
    select 'orders', o.id::text, o.xmin::text
      from public.orders o
      where o.store_id = p_store_id and p_include_operational
    union all
    select 'contact_messages', m.id::text, m.xmin::text
      from public.contact_messages m
      where m.store_id = p_store_id and p_include_operational
    union all
    select 'customer_addresses', a.id::text, a.xmin::text
      from public.customer_addresses a
      where a.store_id = p_store_id and p_include_operational
    union all
    select 'store_customer_profiles', p.id::text, p.xmin::text
      from public.store_customer_profiles p
      where p.store_id = p_store_id and p_include_operational
    union all
    select 'store_analytics_events', e.id::text, e.xmin::text
      from public.store_analytics_events e
      where e.store_id = p_store_id and p_include_operational
    union all
    select 'store_staff_invites', i.id::text, i.xmin::text
      from public.store_staff_invites i
      where i.store_id = p_store_id
        and i.status = 'pending'
        and p_access_mode <> 'none'
    union all
    select 'store_memberships', m.id::text, m.xmin::text
      from public.store_memberships m
      where m.store_id = p_store_id
        and p_access_mode = 'memberships_and_invites'
    union all
    select 'store_subscriptions', s.id::text, s.xmin::text
      from public.store_subscriptions s
      where s.store_id = p_store_id and p_replace_subscription
  ) v;

  return encode(extensions.digest(coalesce(v_versions, '')::text, 'sha256'), 'hex');
end;
$$;

create or replace function public.resolve_store_restore_users(
  p_user_ids uuid[]
)
returns table(user_id uuid)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id
  from auth.users u
  where u.id = any(coalesce(p_user_ids, array[]::uuid[]));
$$;

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

create or replace function public.allocate_store_restore_media(
  p_operation_id uuid,
  p_actor_id uuid,
  p_original_url text,
  p_object_path text,
  p_declared_bytes bigint,
  p_asset jsonb
)
returns table(
  object_path text,
  declared_bytes bigint,
  asset jsonb,
  operation_status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_event public.store_backup_events%rowtype;
  v_expected jsonb;
  v_existing jsonb;
  v_staged jsonb;
  v_prefix text;
begin
  select * into v_event
  from public.store_backup_events
  where id = p_operation_id and lifecycle_managed and action = 'import'
  for update;

  if not found then
    raise exception 'Restore operation not found';
  end if;
  if v_event.actor_user_id is distinct from p_actor_id then
    raise exception 'Restore actor mismatch';
  end if;
  if v_event.status not in ('preflight','staging') then
    raise exception 'Restore operation is not accepting media';
  end if;
  if not public.store_restore_actor_can_manage(v_event.target_store_id, p_actor_id) then
    raise exception 'Store owner or admin access required';
  end if;

  select m into v_expected
  from jsonb_array_elements(coalesce(v_event.metadata->'media_manifest','[]'::jsonb)) m
  where m->>'originalUrl' = p_original_url
  limit 1;

  if v_expected is null then
    raise exception 'Media item was not declared during preflight';
  end if;
  if (v_expected->>'declaredBytes')::bigint <> p_declared_bytes then
    raise exception 'Restore media size changed after preflight';
  end if;

  select m into v_existing
  from jsonb_array_elements(coalesce(v_event.metadata->'staged_media','[]'::jsonb)) m
  where m->>'originalUrl' = p_original_url
  limit 1;

  if v_existing is not null then
    return query select
      v_existing->>'path',
      (v_existing->>'declaredBytes')::bigint,
      v_existing->'asset',
      v_event.status;
    return;
  end if;

  v_prefix := 'stores/' || v_event.target_store_id::text || '/restore/' || p_operation_id::text || '/';
  if p_object_path is null or left(p_object_path, char_length(v_prefix)) <> v_prefix then
    raise exception 'Restore media path is outside the operation namespace';
  end if;
  if coalesce(p_asset->>'publicId','') <> p_object_path then
    raise exception 'Restore media asset identity does not match its object path';
  end if;

  v_staged := coalesce(v_event.metadata->'staged_media','[]'::jsonb)
    || jsonb_build_array(jsonb_build_object(
      'originalUrl', p_original_url,
      'path', p_object_path,
      'declaredBytes', p_declared_bytes,
      'asset', p_asset
    ));

  if jsonb_array_length(v_staged) > 200 then
    raise exception 'Restore media allocation exceeds the file-count limit';
  end if;
  if (
    select coalesce(sum((m->>'declaredBytes')::bigint), 0)
    from jsonb_array_elements(v_staged) m
  ) > 262144000 then
    raise exception 'Restore media allocation exceeds the aggregate-byte limit';
  end if;

  update public.store_backup_events
  set metadata = jsonb_set(metadata, '{staged_media}', v_staged, true),
      status = 'staging',
      updated_at = now()
  where id = p_operation_id;

  return query select p_object_path, p_declared_bytes, p_asset, 'staging'::text;
end;
$$;

create or replace function public.claim_store_restore_operation(
  p_operation_id uuid,
  p_actor_id uuid,
  p_request_digest text
)
returns table(
  operation_status text,
  attempt_token uuid,
  error_summary text
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_event public.store_backup_events%rowtype;
  v_include_operational boolean;
  v_access_mode text;
  v_replace_subscription boolean;
  v_replace_target_content boolean;
  v_current_digest text;
  v_token uuid;
begin
  select * into v_event
  from public.store_backup_events
  where id = p_operation_id and lifecycle_managed and action = 'import'
  for update;

  if not found then
    raise exception 'Restore operation not found';
  end if;
  if v_event.actor_user_id is distinct from p_actor_id then
    raise exception 'Restore actor mismatch';
  end if;
  if v_event.request_digest is distinct from p_request_digest then
    raise exception 'Restore request changed after preflight';
  end if;

  if v_event.status in ('committed','succeeded','reconciliation_required') then
    return query select v_event.status, v_event.attempt_token, v_event.error_summary;
    return;
  end if;
  if v_event.status in ('failed','cleanup_required') then
    return query select v_event.status, v_event.attempt_token, v_event.error_summary;
    return;
  end if;
  if v_event.status = 'running' then
    return query select v_event.status, v_event.attempt_token, v_event.error_summary;
    return;
  end if;
  if v_event.status not in ('preflight','staging') then
    raise exception 'Restore operation is not claimable';
  end if;

  perform 1 from public.stores s where s.id = v_event.target_store_id for update;
  if not found then
    raise exception 'Target store not found';
  end if;
  perform 1 from public.store_memberships sm
    where sm.store_id = v_event.target_store_id and sm.user_id = p_actor_id
    for update;
  perform 1 from public.user_roles ur where ur.user_id = p_actor_id for update;

  if not public.store_restore_actor_can_manage(v_event.target_store_id, p_actor_id) then
    raise exception 'Store owner or admin access required';
  end if;

  if jsonb_array_length(coalesce(v_event.metadata->'media_manifest','[]'::jsonb))
     <> jsonb_array_length(coalesce(v_event.metadata->'staged_media','[]'::jsonb))
  then
    raise exception 'Restore media staging is incomplete';
  end if;

  v_include_operational := coalesce((v_event.metadata->'options'->>'includeOperationalData')::boolean, false);
  v_access_mode := coalesce(v_event.metadata->'options'->>'accessImportMode', 'none');
  v_replace_subscription := coalesce((v_event.metadata->'options'->>'replaceSubscription')::boolean, false);
  v_replace_target_content := coalesce((v_event.metadata->'options'->>'replaceTargetContent')::boolean, true);

  v_current_digest := public.store_restore_target_state_digest(
    v_event.target_store_id,
    v_include_operational,
    v_access_mode,
    v_replace_subscription,
    v_replace_target_content
  );

  if v_current_digest is distinct from v_event.target_state_digest then
    update public.store_backup_events
    set status = 'failed',
        error_summary = 'Target store changed after restore preflight. Run preflight again.',
        updated_at = now(),
        completed_at = now()
    where id = p_operation_id;

    return query select
      'failed'::text,
      null::uuid,
      'Target store changed after restore preflight. Run preflight again.'::text;
    return;
  end if;

  v_token := coalesce(v_event.attempt_token, gen_random_uuid());

  update public.store_backup_events
  set status = 'running',
      attempt_token = v_token,
      attempt_started_at = coalesce(attempt_started_at, now()),
      updated_at = now(),
      error_summary = null
  where id = p_operation_id;

  return query select 'running'::text, v_token, null::text;
end;
$$;

create or replace function public.restore_store_backup_transactional(
  p_operation_id uuid,
  p_actor_id uuid,
  p_attempt_token uuid,
  p_request_digest text,
  p_plan jsonb
)
returns table(
  committed boolean,
  operation_status text,
  error_summary text,
  replayed boolean
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_event public.store_backup_events%rowtype;
  v_store public.stores%rowtype;
  v_options jsonb;
  v_include_operational boolean;
  v_access_mode text;
  v_replace_subscription boolean;
  v_replace_target_content boolean;
  v_preserve_slug boolean;
  v_keep_draft boolean;
  v_current_digest text;
  v_sqlstate text;
  v_message text;
  v_plan_store_id uuid;
  v_plan_slug text;
  v_plan_custom_domain text;
  v_plan_published boolean;
  v_plan_plan_id text;
  v_subscription_plan_id text;
  v_existing_provider text;
  v_existing_provider_subscription_id text;
begin
  select * into v_event
  from public.store_backup_events
  where id = p_operation_id and lifecycle_managed and action = 'import'
  for update;

  if not found then
    raise exception 'Restore operation not found';
  end if;
  if v_event.actor_user_id is distinct from p_actor_id then
    raise exception 'Restore actor mismatch';
  end if;
  if v_event.request_digest is distinct from p_request_digest then
    raise exception 'Restore request changed after preflight';
  end if;

  if v_event.status in ('committed','succeeded','reconciliation_required') then
    return query select true, v_event.status, v_event.error_summary, true;
    return;
  end if;
  if v_event.status in ('failed','cleanup_required') then
    return query select false, v_event.status, v_event.error_summary, true;
    return;
  end if;
  if v_event.status <> 'running'
     or v_event.attempt_token is distinct from p_attempt_token
  then
    raise exception 'Restore attempt token is not active';
  end if;

  select * into v_store
  from public.stores s
  where s.id = v_event.target_store_id
  for update;

  if not found then
    raise exception 'Target store not found';
  end if;

  perform 1 from public.store_memberships sm
    where sm.store_id = v_event.target_store_id and sm.user_id = p_actor_id
    for update;
  perform 1 from public.user_roles ur where ur.user_id = p_actor_id for update;

  if not public.store_restore_actor_can_manage(v_event.target_store_id, p_actor_id) then
    raise exception 'Store owner or admin access required';
  end if;

  v_options := coalesce(v_event.metadata->'options', '{}'::jsonb);
  v_include_operational := coalesce((v_options->>'includeOperationalData')::boolean, false);
  v_access_mode := coalesce(v_options->>'accessImportMode', 'none');
  v_replace_subscription := coalesce((v_options->>'replaceSubscription')::boolean, false);
  v_replace_target_content := coalesce((v_options->>'replaceTargetContent')::boolean, true);
  v_preserve_slug := coalesce((v_options->>'preserveTargetSlug')::boolean, true);
  v_keep_draft := coalesce((v_options->>'keepImportedStoreDraft')::boolean, true);

  perform 1 from public.store_domains x where x.store_id = v_event.target_store_id for update;
  perform 1 from public.store_business_profiles x where x.store_id = v_event.target_store_id for update;
  perform 1 from public.store_themes x where x.store_id = v_event.target_store_id for update;
  perform 1 from public.store_pages x where x.store_id = v_event.target_store_id for update;
  perform 1 from public.store_page_blocks x where x.store_id = v_event.target_store_id for update;
  perform 1 from public.store_page_revisions x where x.store_id = v_event.target_store_id for update;
  perform 1 from public.blog_posts x where x.store_id = v_event.target_store_id for update;
  perform 1 from public.products x where x.store_id = v_event.target_store_id for update;
  perform 1 from public.product_categories x where x.store_id = v_event.target_store_id for update;
  perform 1 from public.product_types x where x.store_id = v_event.target_store_id for update;
  perform 1 from public.coupon_codes x where x.store_id = v_event.target_store_id for update;
  perform 1 from public.site_settings x where x.store_id = v_event.target_store_id for update;

  if v_replace_target_content then
    perform 1 from public.product_reviews x where x.store_id = v_event.target_store_id for update;
  end if;
  if v_include_operational then
    perform 1 from public.orders x where x.store_id = v_event.target_store_id for update;
    perform 1 from public.contact_messages x where x.store_id = v_event.target_store_id for update;
    perform 1 from public.customer_addresses x where x.store_id = v_event.target_store_id for update;
    perform 1 from public.store_customer_profiles x where x.store_id = v_event.target_store_id for update;
    perform 1 from public.store_analytics_events x where x.store_id = v_event.target_store_id for update;
  end if;
  if v_access_mode <> 'none' then
    perform 1 from public.store_staff_invites x
      where x.store_id = v_event.target_store_id and x.status = 'pending'
      for update;
  end if;
  if v_access_mode = 'memberships_and_invites' then
    perform 1 from public.store_memberships x where x.store_id = v_event.target_store_id for update;
  end if;
  if v_replace_subscription then
    perform 1 from public.store_subscriptions x where x.store_id = v_event.target_store_id for update;
  end if;

  v_current_digest := public.store_restore_target_state_digest(
    v_event.target_store_id,
    v_include_operational,
    v_access_mode,
    v_replace_subscription,
    v_replace_target_content
  );

  if v_current_digest is distinct from v_event.target_state_digest then
    update public.store_backup_events
    set status = 'failed',
        error_summary = 'Target store changed after restore preflight. Run preflight again.',
        updated_at = now(),
        completed_at = now()
    where id = p_operation_id;

    return query select
      false,
      'failed'::text,
      'Target store changed after restore preflight. Run preflight again.'::text,
      false;
    return;
  end if;

  begin
    if jsonb_typeof(p_plan) <> 'object'
       or octet_length(p_plan::text) > 5242880
    then
      raise exception 'Normalized restore plan is invalid or exceeds 5 MiB';
    end if;

    foreach v_message in array array[
      'store_business_profiles','store_themes','product_categories','product_types','products',
      'coupon_codes','blog_posts','orders','product_reviews','contact_messages','customer_addresses',
      'store_customer_profiles','store_analytics_events','store_pages','store_page_blocks',
      'store_page_revisions','site_settings','store_staff_invites','store_memberships','store_subscriptions'
    ]
    loop
      if jsonb_typeof(p_plan->v_message) <> 'array' then
        raise exception 'Normalized restore plan key % must be an array', v_message;
      end if;
    end loop;

    if jsonb_typeof(p_plan->'store') <> 'object' then
      raise exception 'Normalized restore plan store must be an object';
    end if;

    foreach v_message in array array[
      'store_business_profiles','store_themes','product_categories','product_types','products',
      'coupon_codes','blog_posts','orders','product_reviews','contact_messages','customer_addresses',
      'store_customer_profiles','store_analytics_events','store_pages','store_page_blocks',
      'store_page_revisions','site_settings','store_staff_invites','store_memberships','store_subscriptions'
    ]
    loop
      if exists (
        select 1
        from jsonb_array_elements(p_plan->v_message) r
        where r->>'store_id' is distinct from v_event.target_store_id::text
      ) then
        raise exception 'Normalized restore plan key % contains a foreign store_id', v_message;
      end if;
    end loop;

    v_plan_store_id := (p_plan->'store'->>'id')::uuid;
    if v_plan_store_id is distinct from v_event.target_store_id then
      raise exception 'Normalized restore plan targets a different store';
    end if;

    if exists (
      select 1
      from jsonb_to_recordset(p_plan->'customer_addresses') as x(user_id uuid)
      left join auth.users u on u.id = x.user_id
      where u.id is null
    ) or exists (
      select 1
      from jsonb_to_recordset(p_plan->'store_customer_profiles') as x(user_id uuid)
      left join auth.users u on u.id = x.user_id
      where u.id is null
    ) or exists (
      select 1
      from jsonb_to_recordset(p_plan->'store_memberships') as x(user_id uuid)
      left join auth.users u on u.id = x.user_id
      where u.id is null
    ) or exists (
      select 1
      from jsonb_to_recordset(p_plan->'orders') as x(user_id uuid)
      left join auth.users u on u.id = x.user_id
      where x.user_id is not null and u.id is null
    ) then
      raise exception 'Normalized restore plan contains a destination user that does not exist';
    end if;

    v_plan_slug := p_plan->'store'->>'slug';
    v_plan_custom_domain := nullif(p_plan->'store'->>'custom_domain','');
    v_plan_published := coalesce((p_plan->'store'->>'is_published')::boolean, false);
    v_plan_plan_id := nullif(p_plan->'store'->>'plan','');

    if v_plan_custom_domain is distinct from v_store.custom_domain then
      raise exception 'Restore cannot transfer or clear custom-domain ownership';
    end if;
    if v_preserve_slug and v_plan_slug is distinct from v_store.slug then
      raise exception 'Restore plan does not preserve the target slug';
    end if;
    if not v_preserve_slug then
      if exists (
        select 1
        from public.store_domains d
        where d.store_id = v_event.target_store_id
          and (
            d.status = 'active'
            or d.vercel_verified
            or (d.cloudflare_hostname_status = 'active' and d.cloudflare_ssl_status = 'active')
          )
      ) then
        raise exception 'Active custom domains must be detached before restoring a different slug';
      end if;
      if exists (
        select 1 from public.stores s
        where s.slug = v_plan_slug and s.id <> v_event.target_store_id
      ) then
        raise exception 'Restore slug is already in use';
      end if;
    end if;
    if v_keep_draft and v_plan_published then
      raise exception 'Draft restore option cannot publish the target store';
    end if;

    if not v_replace_subscription then
      if jsonb_array_length(p_plan->'store_subscriptions') <> 0 then
        raise exception 'Ordinary restore cannot replace subscription rows';
      end if;
      if v_plan_plan_id is distinct from v_store.plan then
        raise exception 'Ordinary restore cannot change the target plan';
      end if;
    else
      if not public.store_restore_actor_is_full_platform_admin(p_actor_id) then
        raise exception 'Subscription restore requires full platform backup authority';
      end if;
      if jsonb_array_length(p_plan->'store_subscriptions') <> 1 then
        raise exception 'Subscription replacement requires exactly one normalized subscription row';
      end if;

      select x.plan_id into v_subscription_plan_id
      from jsonb_to_recordset(p_plan->'store_subscriptions') as x(plan_id text)
      limit 1;

      if v_subscription_plan_id is null
         or not exists (select 1 from public.cms_plans p where p.id = v_subscription_plan_id)
      then
        raise exception 'Restore subscription plan does not exist';
      end if;
      if v_plan_plan_id is distinct from v_subscription_plan_id then
        raise exception 'Store plan and subscription plan must remain one billing projection';
      end if;

      select s.provider, s.provider_subscription_id
      into v_existing_provider, v_existing_provider_subscription_id
      from public.store_subscriptions s
      where s.store_id = v_event.target_store_id;
    end if;

    perform set_config('app.store_restore_mode', 'on', true);

    if v_replace_target_content then
      delete from public.store_page_revisions where store_id = v_event.target_store_id;
      delete from public.store_page_blocks where store_id = v_event.target_store_id;
      delete from public.store_pages where store_id = v_event.target_store_id;
      delete from public.blog_posts where store_id = v_event.target_store_id;
      delete from public.store_business_profiles where store_id = v_event.target_store_id;

      if v_include_operational then
        delete from public.store_analytics_events where store_id = v_event.target_store_id;
        delete from public.product_reviews where store_id = v_event.target_store_id;
        delete from public.orders where store_id = v_event.target_store_id;
        delete from public.contact_messages where store_id = v_event.target_store_id;
        delete from public.customer_addresses where store_id = v_event.target_store_id;
        delete from public.store_customer_profiles where store_id = v_event.target_store_id;
      end if;

      delete from public.coupon_codes where store_id = v_event.target_store_id;
      delete from public.products where store_id = v_event.target_store_id;
      delete from public.product_categories where store_id = v_event.target_store_id;
      delete from public.product_types where store_id = v_event.target_store_id;
      delete from public.site_settings where store_id = v_event.target_store_id;
      delete from public.store_themes where store_id = v_event.target_store_id;

      if v_access_mode <> 'none' then
        delete from public.store_staff_invites
        where store_id = v_event.target_store_id and status = 'pending';
      end if;
    end if;

    update public.stores
    set slug = v_plan_slug,
        custom_domain = v_store.custom_domain,
        description = nullif(p_plan->'store'->>'description',''),
        currency_code = coalesce(nullif(p_plan->'store'->>'currency_code',''), currency_code),
        locale = coalesce(nullif(p_plan->'store'->>'locale',''), locale),
        plan = case when v_replace_subscription then v_subscription_plan_id else plan end,
        store_type = coalesce(nullif(p_plan->'store'->>'store_type',''), store_type),
        logo_url = nullif(p_plan->'store'->>'logo_url',''),
        is_published = v_plan_published
    where id = v_event.target_store_id;

    insert into public.store_business_profiles (
      store_id,business_family,catalog_mode,enabled_modules,created_at,updated_at,template_id
    )
    select x.store_id,x.business_family,x.catalog_mode,x.enabled_modules,x.created_at,x.updated_at,x.template_id
    from jsonb_to_recordset(p_plan->'store_business_profiles') as x(
      store_id uuid,business_family text,catalog_mode text,enabled_modules jsonb,
      created_at timestamptz,updated_at timestamptz,template_id text
    )
    on conflict (store_id) do update set
      business_family = excluded.business_family,
      catalog_mode = excluded.catalog_mode,
      enabled_modules = excluded.enabled_modules,
      template_id = excluded.template_id,
      updated_at = excluded.updated_at;

    insert into public.store_themes (
      id,store_id,preset_id,mode,colors,typography,components,custom_css,created_at,updated_at,
      theme_package_id,theme_package_version,overrides,resolved_tokens,aesthetic,radius_scale,
      density_scale,effects,palette_source,palette_seed,schema_version
    )
    select x.id,x.store_id,x.preset_id,x.mode,x.colors,x.typography,x.components,x.custom_css,x.created_at,x.updated_at,
           x.theme_package_id,x.theme_package_version,x.overrides,x.resolved_tokens,x.aesthetic,x.radius_scale,
           x.density_scale,x.effects,x.palette_source,x.palette_seed,x.schema_version
    from jsonb_to_recordset(p_plan->'store_themes') as x(
      id uuid,store_id uuid,preset_id text,mode text,colors jsonb,typography jsonb,components jsonb,
      custom_css text,created_at timestamptz,updated_at timestamptz,theme_package_id uuid,
      theme_package_version integer,overrides jsonb,resolved_tokens jsonb,aesthetic text,
      radius_scale numeric,density_scale numeric,effects jsonb,palette_source text,palette_seed text,
      schema_version integer
    )
    on conflict (store_id) do update set
      preset_id=excluded.preset_id,mode=excluded.mode,colors=excluded.colors,typography=excluded.typography,
      components=excluded.components,custom_css=excluded.custom_css,updated_at=excluded.updated_at,
      theme_package_id=excluded.theme_package_id,theme_package_version=excluded.theme_package_version,
      overrides=excluded.overrides,resolved_tokens=excluded.resolved_tokens,aesthetic=excluded.aesthetic,
      radius_scale=excluded.radius_scale,density_scale=excluded.density_scale,effects=excluded.effects,
      palette_source=excluded.palette_source,palette_seed=excluded.palette_seed,schema_version=excluded.schema_version;

    insert into public.product_categories (id,name,parent_id,sort_order,created_at,store_id)
    select x.id,x.name,x.parent_id,x.sort_order,x.created_at,x.store_id
    from jsonb_to_recordset(p_plan->'product_categories') as x(
      id uuid,name text,parent_id uuid,sort_order integer,created_at timestamptz,store_id uuid
    );

    insert into public.product_types (id,name,sort_order,created_at,store_id,metric_schema)
    select x.id,x.name,x.sort_order,x.created_at,x.store_id,x.metric_schema
    from jsonb_to_recordset(p_plan->'product_types') as x(
      id uuid,name text,sort_order integer,created_at timestamptz,store_id uuid,metric_schema jsonb
    );

    insert into public.products (
      id,name,price,original_price,image_url,description,sizes,colors,category,type,featured,badge,
      stock,is_available,created_at,updated_at,images,store_id,metric_values
    )
    select x.id,x.name,x.price,x.original_price,x.image_url,x.description,x.sizes,x.colors,x.category,x.type,
           x.featured,x.badge,x.stock,x.is_available,x.created_at,x.updated_at,x.images,x.store_id,x.metric_values
    from jsonb_to_recordset(p_plan->'products') as x(
      id uuid,name text,price integer,original_price integer,image_url text,description text,
      sizes text[],colors text[],category text,type text,featured boolean,badge text,stock integer,
      is_available boolean,created_at timestamptz,updated_at timestamptz,images text[],store_id uuid,
      metric_values jsonb
    );

    insert into public.coupon_codes (
      id,code,discount_type,discount_value,min_order,max_uses,uses_count,expires_at,is_active,
      created_at,updated_at,store_id
    )
    select x.id,x.code,x.discount_type,x.discount_value,x.min_order,x.max_uses,x.uses_count,x.expires_at,
           x.is_active,x.created_at,x.updated_at,x.store_id
    from jsonb_to_recordset(p_plan->'coupon_codes') as x(
      id uuid,code text,discount_type text,discount_value integer,min_order integer,max_uses integer,
      uses_count integer,expires_at timestamptz,is_active boolean,created_at timestamptz,
      updated_at timestamptz,store_id uuid
    );

    insert into public.blog_posts (
      id,store_id,title,slug,excerpt,content,featured_image,status,seo_title,seo_description,published_at,
      created_at,updated_at,category,tags,author_name,featured_image_alt,is_featured,embedded_product_ids,
      product_embed_title,product_embed_position,canonical_url,og_image,seo_keywords,noindex
    )
    select x.id,x.store_id,x.title,x.slug,x.excerpt,x.content,x.featured_image,x.status,x.seo_title,
           x.seo_description,x.published_at,x.created_at,x.updated_at,x.category,x.tags,x.author_name,
           x.featured_image_alt,x.is_featured,x.embedded_product_ids,x.product_embed_title,
           x.product_embed_position,x.canonical_url,x.og_image,x.seo_keywords,x.noindex
    from jsonb_to_recordset(p_plan->'blog_posts') as x(
      id uuid,store_id uuid,title text,slug text,excerpt text,content text,featured_image text,status text,
      seo_title text,seo_description text,published_at timestamptz,created_at timestamptz,updated_at timestamptz,
      category text,tags text[],author_name text,featured_image_alt text,is_featured boolean,
      embedded_product_ids uuid[],product_embed_title text,product_embed_position text,canonical_url text,
      og_image text,seo_keywords text[],noindex boolean
    );

    insert into public.orders (
      id,user_id,order_number,status,items,subtotal,delivery_fee,total,customer_name,customer_phone,
      customer_email,shipping_address,shipping_city,payment_method,notes,created_at,updated_at,store_id,
      client_request_id
    )
    select x.id,x.user_id,x.order_number,x.status,x.items,x.subtotal,x.delivery_fee,x.total,x.customer_name,
           x.customer_phone,x.customer_email,x.shipping_address,x.shipping_city,x.payment_method,x.notes,
           x.created_at,x.updated_at,x.store_id,null
    from jsonb_to_recordset(p_plan->'orders') as x(
      id uuid,user_id uuid,order_number text,status text,items jsonb,subtotal integer,delivery_fee integer,
      total integer,customer_name text,customer_phone text,customer_email text,shipping_address text,
      shipping_city text,payment_method text,notes text,created_at timestamptz,updated_at timestamptz,
      store_id uuid
    );

    insert into public.product_reviews (
      id,product_id,user_id,order_id,author_name,rating,review_text,size_purchased,status,admin_reply,
      created_at,updated_at,image_url,store_id
    )
    select x.id,x.product_id,x.user_id,x.order_id,x.author_name,x.rating,x.review_text,x.size_purchased,
           x.status,x.admin_reply,x.created_at,x.updated_at,x.image_url,x.store_id
    from jsonb_to_recordset(p_plan->'product_reviews') as x(
      id uuid,product_id uuid,user_id uuid,order_id uuid,author_name text,rating integer,review_text text,
      size_purchased text,status text,admin_reply text,created_at timestamptz,updated_at timestamptz,
      image_url text,store_id uuid
    );

    insert into public.contact_messages (id,name,email,message,is_read,created_at,store_id)
    select x.id,x.name,x.email,x.message,x.is_read,x.created_at,x.store_id
    from jsonb_to_recordset(p_plan->'contact_messages') as x(
      id uuid,name text,email text,message text,is_read boolean,created_at timestamptz,store_id uuid
    );

    insert into public.customer_addresses (id,user_id,label,name,phone,address,city,is_default,created_at,store_id)
    select x.id,x.user_id,x.label,x.name,x.phone,x.address,x.city,x.is_default,x.created_at,x.store_id
    from jsonb_to_recordset(p_plan->'customer_addresses') as x(
      id uuid,user_id uuid,label text,name text,phone text,address text,city text,is_default boolean,
      created_at timestamptz,store_id uuid
    );

    insert into public.store_customer_profiles (
      id,store_id,user_id,display_name,avatar_url,phone,email,status,marketing_opt_in,notes,tags,created_at,updated_at
    )
    select x.id,x.store_id,x.user_id,x.display_name,x.avatar_url,x.phone,x.email,x.status,x.marketing_opt_in,
           x.notes,x.tags,x.created_at,x.updated_at
    from jsonb_to_recordset(p_plan->'store_customer_profiles') as x(
      id uuid,store_id uuid,user_id uuid,display_name text,avatar_url text,phone text,email text,status text,
      marketing_opt_in boolean,notes text,tags text[],created_at timestamptz,updated_at timestamptz
    )
    on conflict (store_id,user_id) do update set
      display_name=excluded.display_name,avatar_url=excluded.avatar_url,phone=excluded.phone,email=excluded.email,
      status=excluded.status,marketing_opt_in=excluded.marketing_opt_in,notes=excluded.notes,tags=excluded.tags,
      updated_at=excluded.updated_at;

    insert into public.store_analytics_events (
      id,store_id,customer_id,order_id,product_id,visitor_id,session_id,event_name,event_category,page_path,
      page_type,referrer,traffic_source,traffic_medium,traffic_campaign,traffic_term,traffic_content,
      search_query,order_number,quantity,value,currency_code,metadata,user_agent,event_timestamp,created_at
    )
    select x.id,x.store_id,null,x.order_id,x.product_id,x.visitor_id,x.session_id,x.event_name,x.event_category,
           x.page_path,x.page_type,x.referrer,x.traffic_source,x.traffic_medium,x.traffic_campaign,x.traffic_term,
           x.traffic_content,x.search_query,x.order_number,x.quantity,x.value,x.currency_code,x.metadata,
           x.user_agent,x.event_timestamp,x.created_at
    from jsonb_to_recordset(p_plan->'store_analytics_events') as x(
      id uuid,store_id uuid,order_id uuid,product_id uuid,visitor_id text,session_id text,event_name text,
      event_category text,page_path text,page_type text,referrer text,traffic_source text,traffic_medium text,
      traffic_campaign text,traffic_term text,traffic_content text,search_query text,order_number text,
      quantity integer,value integer,currency_code text,metadata jsonb,user_agent text,event_timestamp timestamptz,
      created_at timestamptz
    );

    insert into public.store_pages (id,store_id,slug,title,seo_title,seo_description,is_homepage,created_at,updated_at)
    select x.id,x.store_id,x.slug,x.title,x.seo_title,x.seo_description,x.is_homepage,x.created_at,x.updated_at
    from jsonb_to_recordset(p_plan->'store_pages') as x(
      id uuid,store_id uuid,slug text,title text,seo_title text,seo_description text,is_homepage boolean,
      created_at timestamptz,updated_at timestamptz
    );

    insert into public.store_page_blocks (
      id,page_id,store_id,block_type,props,sort_order,is_visible,created_at,updated_at,entrance_animation,
      hover_effect,effect_override,layout_variant,custom_html,custom_css,responsive_config
    )
    select x.id,x.page_id,x.store_id,x.block_type,x.props,x.sort_order,x.is_visible,x.created_at,x.updated_at,
           x.entrance_animation,x.hover_effect,x.effect_override,x.layout_variant,x.custom_html,x.custom_css,
           x.responsive_config
    from jsonb_to_recordset(p_plan->'store_page_blocks') as x(
      id uuid,page_id uuid,store_id uuid,block_type text,props jsonb,sort_order integer,is_visible boolean,
      created_at timestamptz,updated_at timestamptz,entrance_animation text,hover_effect text,
      effect_override boolean,layout_variant text,custom_html text,custom_css text,responsive_config jsonb
    );

    insert into public.store_page_revisions (
      id,page_id,store_id,blocks_snapshot,revision_label,changed_by,created_at
    )
    select x.id,x.page_id,x.store_id,x.blocks_snapshot,x.revision_label,null,x.created_at
    from jsonb_to_recordset(p_plan->'store_page_revisions') as x(
      id uuid,page_id uuid,store_id uuid,blocks_snapshot jsonb,revision_label text,created_at timestamptz
    );

    insert into public.site_settings (id,key,value,updated_at,updated_by,store_id)
    select x.id,x.key,x.value,x.updated_at,null,x.store_id
    from jsonb_to_recordset(p_plan->'site_settings') as x(
      id uuid,key text,value jsonb,updated_at timestamptz,store_id uuid
    )
    on conflict (store_id,key) do update set
      value=excluded.value,updated_at=excluded.updated_at,updated_by=null;

    insert into public.store_staff_invites (
      id,store_id,invite_code,email,role,status,claimed_by,claimed_at,expires_at,metadata,
      created_by,created_at,updated_at
    )
    select x.id,x.store_id,x.invite_code,x.email,
           case when x.role::text = 'owner' then 'admin'::public.store_member_role else x.role end,
           'pending',null,null,null,x.metadata,null,x.created_at,x.updated_at
    from jsonb_to_recordset(p_plan->'store_staff_invites') as x(
      id uuid,store_id uuid,invite_code text,email text,role public.store_member_role,status text,
      metadata jsonb,created_at timestamptz,updated_at timestamptz
    );

    insert into public.store_memberships (id,store_id,user_id,role,invited_by,created_at,updated_at)
    select x.id,x.store_id,x.user_id,
           case
             when x.user_id = v_store.owner_id then 'owner'::public.store_member_role
             when x.role::text = 'owner' then 'admin'::public.store_member_role
             else x.role
           end,
           null,x.created_at,x.updated_at
    from jsonb_to_recordset(p_plan->'store_memberships') as x(
      id uuid,store_id uuid,user_id uuid,role public.store_member_role,created_at timestamptz,updated_at timestamptz
    )
    on conflict (store_id,user_id) do update set
      role = case
        when public.store_memberships.user_id = v_store.owner_id then 'owner'::public.store_member_role
        when public.store_memberships.role::text = 'owner' then 'owner'::public.store_member_role
        when public.store_memberships.role::text = 'admin'
             and excluded.role::text in ('editor','viewer') then 'admin'::public.store_member_role
        when public.store_memberships.role::text = 'editor'
             and excluded.role::text = 'viewer' then 'editor'::public.store_member_role
        else excluded.role
      end,
      updated_at = excluded.updated_at;

    if v_replace_subscription then
      insert into public.store_subscriptions (
        id,store_id,plan_id,status,trial_ends_at,current_period_ends_at,provider,provider_subscription_id,
        created_at,updated_at
      )
      select x.id,x.store_id,x.plan_id,x.status,x.trial_ends_at,x.current_period_ends_at,
             v_existing_provider,v_existing_provider_subscription_id,x.created_at,x.updated_at
      from jsonb_to_recordset(p_plan->'store_subscriptions') as x(
        id uuid,store_id uuid,plan_id text,status text,trial_ends_at timestamptz,current_period_ends_at timestamptz,
        created_at timestamptz,updated_at timestamptz
      )
      on conflict (store_id) do update set
        plan_id=excluded.plan_id,status=excluded.status,trial_ends_at=excluded.trial_ends_at,
        current_period_ends_at=excluded.current_period_ends_at,updated_at=excluded.updated_at;
    end if;

    update public.store_memberships
    set role = 'owner'::public.store_member_role,
        updated_at = now()
    where store_id = v_event.target_store_id
      and user_id = v_store.owner_id
      and role::text <> 'owner';

    update public.store_backup_events
    set status = 'committed',
        committed_at = now(),
        updated_at = now(),
        completed_at = null,
        error_summary = null
    where id = p_operation_id;

  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate,
      v_message = message_text;

    update public.store_backup_events
    set status = 'failed',
        error_summary = left('[' || coalesce(v_sqlstate,'error') || '] ' || coalesce(v_message,'Restore transaction failed'), 500),
        updated_at = now(),
        completed_at = now()
    where id = p_operation_id;

    return query select
      false,
      'failed'::text,
      left('[' || coalesce(v_sqlstate,'error') || '] ' || coalesce(v_message,'Restore transaction failed'), 500),
      false;
    return;
  end;

  return query select true, 'committed'::text, null::text, false;
end;
$$;

create or replace function public.handle_order_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
  v_template text;
begin
  if current_setting('app.store_restore_mode', true) = 'on' then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    v_template := 'order-receipt';
    v_payload := jsonb_build_object(
      'templateName', v_template,
      'order_id', NEW.order_number,
      'store_id', NEW.store_id,
      'customer_email', NEW.customer_email,
      'customer_phone', NEW.customer_phone,
      'customer_name', NEW.customer_name,
      'total', NEW.total,
      'status', NEW.status
    );
  elsif TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status and NEW.status in ('shipped', 'delivered', 'cancelled') then
    v_template := 'order-' || NEW.status;
    v_payload := jsonb_build_object(
      'templateName', v_template,
      'order_id', NEW.order_number,
      'store_id', NEW.store_id,
      'customer_email', NEW.customer_email,
      'customer_phone', NEW.customer_phone,
      'customer_name', NEW.customer_name,
      'total', NEW.total,
      'status', NEW.status
    );
  end if;

  if v_payload is not null then
    perform public.enqueue_trigger_email_event(
      NEW.store_id, NEW.order_number, v_template, NEW.customer_email, v_payload, 'email'
    );
  end if;

  return NEW;
end;
$$;

create or replace function public.handle_store_publish()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner_email text;
  v_payload jsonb;
begin
  if current_setting('app.store_restore_mode', true) = 'on' then
    return new;
  end if;

  if (OLD.is_published is false or OLD.is_published is null) and NEW.is_published is true then
    select email into v_owner_email from auth.users where id = NEW.owner_id;
    if v_owner_email is not null then
      v_payload := jsonb_build_object(
        'to', v_owner_email,
        'templateName', 'store-published',
        'storeName', NEW.name,
        'storeSlug', NEW.slug
      );
      perform public.enqueue_trigger_email_event(
        NEW.id, null, 'store-published', v_owner_email, v_payload, 'email'
      );
    end if;
  end if;
  return NEW;
end;
$$;

create or replace function public.handle_subscription_status_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner_email text;
  v_store_name text;
  v_store_slug text;
  v_payload jsonb;
begin
  if current_setting('app.store_restore_mode', true) = 'on' then
    return new;
  end if;

  if OLD.status is distinct from NEW.status then
    select s.name, s.slug, u.email
      into v_store_name, v_store_slug, v_owner_email
    from public.stores s
    join auth.users u on s.owner_id = u.id
    where s.id = NEW.store_id;

    if v_owner_email is not null and NEW.status = 'past_due' then
      v_payload := jsonb_build_object(
        'to', v_owner_email,
        'templateName', 'payment-reminder',
        'storeName', v_store_name,
        'storeSlug', v_store_slug
      );
      perform public.enqueue_trigger_email_event(
        NEW.store_id, null, 'payment-reminder', v_owner_email, v_payload, 'email'
      );
    end if;
  end if;
  return NEW;
end;
$$;

create or replace function public.dispatch_storefront_search_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_product_id uuid;
  v_action text;
  v_payload jsonb;
  v_sync_url text;
  v_sync_secret text;
begin
  if current_setting('app.store_restore_mode', true) = 'on' then
    return coalesce(NEW, OLD);
  end if;

  if TG_OP = 'DELETE' then
    v_store_id := OLD.store_id;
    v_product_id := OLD.id;
    v_action := 'delete';
  else
    v_store_id := NEW.store_id;
    v_product_id := NEW.id;
    v_action := 'upsert';
  end if;

  v_sync_url := current_setting('app.settings.storefront_search_sync_url', true);
  v_sync_secret := current_setting('app.settings.storefront_search_webhook_secret', true);

  if coalesce(v_sync_url, '') = '' or coalesce(v_sync_secret, '') = '' then
    return coalesce(NEW, OLD);
  end if;

  v_payload := jsonb_build_object(
    'action', v_action,
    'storeId', v_store_id,
    'productIds', jsonb_build_array(v_product_id)
  );

  perform net.http_post(
    url := v_sync_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-commerce-webhook-secret', v_sync_secret
    ),
    body := v_payload
  );

  return coalesce(NEW, OLD);
end;
$$;

revoke all on function public.store_restore_actor_is_full_platform_admin(uuid) from public, anon, authenticated;
revoke all on function public.store_restore_actor_can_manage(uuid,uuid) from public, anon, authenticated;
revoke all on function public.store_restore_target_state_digest(uuid,boolean,text,boolean,boolean) from public, anon, authenticated;
revoke all on function public.resolve_store_restore_users(uuid[]) from public, anon, authenticated;
revoke all on function public.create_store_restore_operation(uuid,uuid,text,text,uuid,jsonb,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.allocate_store_restore_media(uuid,uuid,text,text,bigint,jsonb) from public, anon, authenticated;
revoke all on function public.claim_store_restore_operation(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.restore_store_backup_transactional(uuid,uuid,uuid,text,jsonb) from public, anon, authenticated;

grant execute on function public.store_restore_actor_is_full_platform_admin(uuid) to service_role;
grant execute on function public.store_restore_actor_can_manage(uuid,uuid) to service_role;
grant execute on function public.store_restore_target_state_digest(uuid,boolean,text,boolean,boolean) to service_role;
grant execute on function public.resolve_store_restore_users(uuid[]) to service_role;
grant execute on function public.create_store_restore_operation(uuid,uuid,text,text,uuid,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.allocate_store_restore_media(uuid,uuid,text,text,bigint,jsonb) to service_role;
grant execute on function public.claim_store_restore_operation(uuid,uuid,text) to service_role;
grant execute on function public.restore_store_backup_transactional(uuid,uuid,uuid,text,jsonb) to service_role;
