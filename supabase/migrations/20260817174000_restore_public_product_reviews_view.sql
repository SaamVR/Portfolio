-- Restore the storefront-facing review projection that intentionally omits
-- customer/order identifiers while preserving product_reviews RLS semantics.

create or replace view public.public_product_reviews
with (security_invoker = true)
as
select
  id,
  product_id,
  author_name,
  rating,
  review_text,
  size_purchased,
  admin_reply,
  image_url,
  created_at
from public.product_reviews
where status = 'approved';

revoke all on table public.public_product_reviews from public, anon, authenticated, service_role;
grant select on table public.public_product_reviews to anon, authenticated, service_role;
