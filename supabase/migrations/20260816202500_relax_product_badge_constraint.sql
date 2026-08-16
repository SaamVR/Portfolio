-- Product badges are merchant/template-defined display labels (for example
-- "Bestseller" or "Top Rated"), not a two-value enum. The legacy check
-- constraint predates the current template seed contract and rejects valid
-- catalog data during merchant signup.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_badge_check;
