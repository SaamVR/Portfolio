CREATE TABLE IF NOT EXISTS public.store_customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'active',
  marketing_opt_in boolean NOT NULL DEFAULT false,
  notes text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);
ALTER TABLE public.store_customer_profiles ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_store_customer_profiles_updated_at ON public.store_customer_profiles;
CREATE TRIGGER update_store_customer_profiles_updated_at
  BEFORE UPDATE ON public.store_customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_store_customer_profiles_store_id
  ON public.store_customer_profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_store_customer_profiles_user_id
  ON public.store_customer_profiles(user_id);
DROP POLICY IF EXISTS "Customers can manage own store customer profiles" ON public.store_customer_profiles;
CREATE POLICY "Customers can manage own store customer profiles"
  ON public.store_customer_profiles FOR ALL
  TO authenticated
  USING (user_id = auth.uid() AND store_id IS NOT NULL)
  WITH CHECK (user_id = auth.uid() AND store_id IS NOT NULL);
DROP POLICY IF EXISTS "Store staff can view store customer profiles" ON public.store_customer_profiles;
CREATE POLICY "Store staff can view store customer profiles"
  ON public.store_customer_profiles FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));
WITH customer_pairs AS (
  SELECT DISTINCT store_id, user_id
  FROM (
    SELECT store_id, user_id
    FROM public.orders
    WHERE store_id IS NOT NULL AND user_id IS NOT NULL
    UNION ALL
    SELECT store_id, user_id
    FROM public.customer_addresses
    WHERE store_id IS NOT NULL AND user_id IS NOT NULL
    UNION ALL
    SELECT store_id, user_id
    FROM public.cart_items
    WHERE store_id IS NOT NULL AND user_id IS NOT NULL
    UNION ALL
    SELECT store_id, user_id
    FROM public.product_reviews
    WHERE store_id IS NOT NULL AND user_id IS NOT NULL
  ) scoped_customers
)
INSERT INTO public.store_customer_profiles (
  store_id,
  user_id,
  display_name,
  avatar_url,
  phone,
  email,
  status,
  marketing_opt_in,
  notes,
  tags
)
SELECT
  customer_pairs.store_id,
  customer_pairs.user_id,
  COALESCE(
    addr.name,
    ord.customer_name,
    rev.author_name,
    NULLIF(BTRIM(COALESCE(auth_users.raw_user_meta_data ->> 'full_name', auth_users.raw_user_meta_data ->> 'name', '')), ''),
    CASE
      WHEN auth_users.email IS NOT NULL THEN split_part(auth_users.email, '@', 1)
      ELSE 'Customer'
    END
  ) AS display_name,
  COALESCE(
    NULLIF(BTRIM(auth_users.raw_user_meta_data ->> 'avatar_url'), ''),
    NULLIF(BTRIM(auth_users.raw_user_meta_data ->> 'picture'), '')
  ) AS avatar_url,
  COALESCE(
    NULLIF(BTRIM(addr.phone), ''),
    NULLIF(BTRIM(ord.customer_phone), ''),
    NULLIF(BTRIM(auth_users.phone), ''),
    NULLIF(BTRIM(auth_users.raw_user_meta_data ->> 'phone_number'), '')
  ) AS phone,
  COALESCE(
    NULLIF(BTRIM(ord.customer_email), ''),
    NULLIF(BTRIM(auth_users.email), '')
  ) AS email,
  'active' AS status,
  false AS marketing_opt_in,
  NULL AS notes,
  '{}'::text[] AS tags
FROM customer_pairs
LEFT JOIN auth.users AS auth_users
  ON auth_users.id = customer_pairs.user_id
LEFT JOIN LATERAL (
  SELECT name, phone
  FROM public.customer_addresses
  WHERE customer_addresses.store_id = customer_pairs.store_id
    AND customer_addresses.user_id = customer_pairs.user_id
  ORDER BY customer_addresses.is_default DESC, customer_addresses.created_at ASC
  LIMIT 1
) AS addr ON TRUE
LEFT JOIN LATERAL (
  SELECT customer_name, customer_phone, customer_email
  FROM public.orders
  WHERE orders.store_id = customer_pairs.store_id
    AND orders.user_id = customer_pairs.user_id
  ORDER BY orders.created_at DESC
  LIMIT 1
) AS ord ON TRUE
LEFT JOIN LATERAL (
  SELECT author_name
  FROM public.product_reviews
  WHERE product_reviews.store_id = customer_pairs.store_id
    AND product_reviews.user_id = customer_pairs.user_id
  ORDER BY product_reviews.created_at DESC
  LIMIT 1
) AS rev ON TRUE
ON CONFLICT (store_id, user_id) DO NOTHING;
