-- Create a public view for product reviews that excludes sensitive identifiers
-- This prevents user_id and order_id from being exposed in public queries
CREATE OR REPLACE VIEW public.public_product_reviews AS
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

-- Grant read access on the view to anon and authenticated roles
GRANT SELECT ON public.public_product_reviews TO anon, authenticated;
