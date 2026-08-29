create or replace function public.delete_store_transactional(
  p_store_id uuid,
  p_actor_id uuid,
  p_actor_email text,
  p_actor_role text,
  p_admin_note text,
  p_ban_merchant boolean,
  p_is_platform_admin boolean,
  p_created_at timestamptz default now()
)
returns table(owner_user_id uuid, deleted_all_owned_stores boolean, banned boolean, deleted_store_id uuid)
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_store public.stores%rowtype;
  v_existing_can_create_store boolean;
  v_owner_can_create_store boolean;
  v_merchant_visible_reason text;
  v_remaining_count bigint;
begin
  if coalesce(p_ban_merchant, false) and not coalesce(p_is_platform_admin, false) then
    raise exception 'Merchant bans require platform admin authorization' using errcode = '42501';
  end if;

  select * into v_store
  from public.stores
  where id = p_store_id
  for update;

  if not found then
    raise exception 'Store % not found', p_store_id using errcode = 'P0002';
  end if;

  if p_is_platform_admin and coalesce(btrim(p_admin_note), '') = '' then
    raise exception 'Deletion note is required for platform admins' using errcode = '22023';
  end if;

  if v_store.owner_id is not null then
    select can_create_store into v_existing_can_create_store
    from public.merchant_account_statuses
    where user_id = v_store.owner_id;
  end if;

  v_owner_can_create_store := case
    when p_ban_merchant then false
    else coalesce(v_existing_can_create_store, true)
  end;

  v_merchant_visible_reason := case
    when p_is_platform_admin then btrim(p_admin_note)
    else coalesce(nullif(btrim(p_admin_note), ''), 'This site was removed from your workspace at your request.')
  end;

  insert into public.store_deletion_records (
    deleted_store_id, owner_user_id, store_name, store_slug, deletion_source,
    merchant_visible_reason, admin_note, deleted_by_user_id, owner_can_create_store, created_at
  ) values (
    v_store.id, v_store.owner_id, v_store.name, v_store.slug,
    case when p_is_platform_admin then 'platform_admin_delete' else 'merchant_self_delete' end,
    v_merchant_visible_reason, nullif(btrim(p_admin_note), ''), p_actor_id,
    v_owner_can_create_store, p_created_at
  );

  if v_store.owner_id is not null and p_ban_merchant then
    insert into public.merchant_account_statuses (
      user_id, can_create_store, status_note, banned_at, restored_at, updated_by, updated_at
    ) values (
      v_store.owner_id, false,
      coalesce(nullif(btrim(p_admin_note), ''), 'Store access was restricted by the platform team.'),
      p_created_at, null, p_actor_id, p_created_at
    )
    on conflict (user_id) do update
    set can_create_store = false,
        status_note = excluded.status_note,
        banned_at = excluded.banned_at,
        restored_at = null,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
  end if;

  delete from public.stores where id = v_store.id;

  insert into public.platform_audit_logs (
    actor_id, actor_email, actor_role, action, target_type, target_id, details, created_at
  ) values (
    p_actor_id, p_actor_email, coalesce(nullif(p_actor_role, ''), 'store_owner'),
    'delete_store', 'store', v_store.id::text,
    jsonb_build_object(
      'store_name', v_store.name,
      'store_slug', v_store.slug,
      'owner_id', v_store.owner_id,
      'banned_merchant', p_ban_merchant,
      'admin_note', nullif(btrim(p_admin_note), ''),
      'deletion_source', case when p_is_platform_admin then 'platform_admin_delete' else 'merchant_self_delete' end
    ),
    p_created_at
  );

  if v_store.owner_id is null then
    v_remaining_count := 0;
  else
    select count(*) into v_remaining_count
    from public.stores
    where owner_id = v_store.owner_id;
  end if;

  return query select
    v_store.owner_id,
    v_store.owner_id is not null and v_remaining_count = 0,
    p_ban_merchant,
    v_store.id;
end;
$function$;
