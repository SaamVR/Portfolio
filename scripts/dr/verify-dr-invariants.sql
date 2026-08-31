\set ON_ERROR_STOP on
with checks as (
  select
    (select count(*) from public.stores) as stores,
    (select count(*) from public.products) as products,
    (select count(*) from public.orders) as orders,
    (select count(*) from public.store_pages) as store_pages,
    (select count(*) from public.store_page_blocks) as store_page_blocks,
    (select count(*) from public.store_page_revisions) as store_page_revisions,
    (select count(*) from public.store_subscriptions) as subscriptions,
    (select count(*) from auth.users) as auth_users,
    (select count(*) from storage.objects) as storage_objects,
    (select count(*) from public.stores s left join auth.users u on u.id=s.owner_id where s.owner_id is not null and u.id is null) as orphan_store_owners,
    (select count(*) from public.store_memberships m left join public.stores s on s.id=m.store_id left join auth.users u on u.id=m.user_id where s.id is null or u.id is null) as orphan_memberships,
    (select count(*) from public.orders o left join public.stores s on s.id=o.store_id where o.store_id is not null and s.id is null) as orphan_orders,
    (select count(*) from public.store_page_blocks b join public.store_pages p on p.id=b.page_id where b.store_id is distinct from p.store_id) as cross_store_page_blocks,
    (select count(*) from public.product_reviews r join public.products p on p.id=r.product_id where r.store_id is distinct from p.store_id) as cross_store_reviews,
    (select count(*) from public.product_reviews r join public.orders o on o.id=r.order_id where r.order_id is not null and r.store_id is distinct from o.store_id) as cross_store_review_orders,
    (select count(*) from public.store_subscriptions ss join public.stores s on s.id=ss.store_id where ss.plan_id is distinct from s.plan) as plan_projection_mismatches,
    (select count(*) from (select store_id from public.store_pages where is_homepage group by store_id having count(*)>1) x) as multiple_homepages
)
select jsonb_pretty(jsonb_build_object(
  'counts', jsonb_build_object(
    'stores',stores,'products',products,'orders',orders,'store_pages',store_pages,
    'store_page_blocks',store_page_blocks,'store_page_revisions',store_page_revisions,
    'subscriptions',subscriptions,'auth_users',auth_users,'storage_objects',storage_objects),
  'violations', jsonb_build_object(
    'orphan_store_owners',orphan_store_owners,'orphan_memberships',orphan_memberships,
    'orphan_orders',orphan_orders,'cross_store_page_blocks',cross_store_page_blocks,
    'cross_store_reviews',cross_store_reviews,'cross_store_review_orders',cross_store_review_orders,
    'plan_projection_mismatches',plan_projection_mismatches,'multiple_homepages',multiple_homepages),
  'ok', (orphan_store_owners+orphan_memberships+orphan_orders+cross_store_page_blocks+cross_store_reviews+cross_store_review_orders+plan_projection_mismatches+multiple_homepages)=0
)) from checks;
