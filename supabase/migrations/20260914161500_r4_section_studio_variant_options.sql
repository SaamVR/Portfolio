-- R4 Section Studio v0: bounded per-section presentation options.
ALTER TABLE public.store_page_blocks
  ADD COLUMN IF NOT EXISTS variant_options jsonb NULL;

ALTER TABLE public.store_page_blocks
  DROP CONSTRAINT IF EXISTS store_page_blocks_variant_options_object_check;
ALTER TABLE public.store_page_blocks
  ADD CONSTRAINT store_page_blocks_variant_options_object_check
  CHECK (variant_options IS NULL OR jsonb_typeof(variant_options) = 'object');

-- Keep atomic backup restore lossless for the new canonical block field.
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
      hover_effect,effect_override,layout_variant,variant_options,custom_html,custom_css,responsive_config
    )
    select x.id,x.page_id,x.store_id,x.block_type,x.props,x.sort_order,x.is_visible,x.created_at,x.updated_at,
           x.entrance_animation,x.hover_effect,x.effect_override,x.layout_variant,x.variant_options,x.custom_html,x.custom_css,
           x.responsive_config
    from jsonb_to_recordset(p_plan->'store_page_blocks') as x(
      id uuid,page_id uuid,store_id uuid,block_type text,props jsonb,sort_order integer,is_visible boolean,
      created_at timestamptz,updated_at timestamptz,entrance_animation text,hover_effect text,
      effect_override boolean,layout_variant text,variant_options jsonb,custom_html text,custom_css text,responsive_config jsonb
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
