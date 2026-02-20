-- Re-create the view with SECURITY INVOKER to avoid security definer issue
DROP VIEW IF EXISTS public.public_product_reviews;

CREATE VIEW public.public_product_reviews
  WITH (security_invoker = true)
AS
  SELECT
    id,
    product_id,
    author_name,
    rating,
    review_text,
    size_purchased,
    admin_reply,
    created_at
  FROM public.product_reviews
  WHERE status = 'approved';

-- Grant read access on the view
GRANT SELECT ON public.public_product_reviews TO anon, authenticated;
