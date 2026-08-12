CREATE OR REPLACE FUNCTION public.search_storefront_products(
  p_store_id uuid,
  p_query text,
  p_category text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_sale_only boolean DEFAULT false,
  p_limit integer DEFAULT 48
)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  name text,
  price numeric,
  original_price numeric,
  image_url text,
  images text[],
  description text,
  sizes text[],
  colors text[],
  category text,
  type text,
  featured boolean,
  badge text,
  stock integer,
  is_available boolean,
  metric_values jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  similarity_score real,
  text_rank real
)
LANGUAGE sql
STABLE
AS $$
  WITH query_input AS (
    SELECT
      trim(coalesce(p_query, '')) AS q,
      websearch_to_tsquery('simple', trim(coalesce(p_query, ''))) AS tsq
  ),
  ranked AS (
    SELECT
      p.*,
      GREATEST(
        similarity(lower(coalesce(p.name, '')), lower(query_input.q)),
        similarity(lower(coalesce(p.description, '')), lower(query_input.q))
      ) AS similarity_score,
      ts_rank_cd(
        to_tsvector(
          'simple',
          coalesce(p.name, '') || ' ' ||
          coalesce(p.description, '') || ' ' ||
          coalesce(p.category, '') || ' ' ||
          coalesce(p.type, '')
        ),
        query_input.tsq
      ) AS text_rank
    FROM public.products p
    CROSS JOIN query_input
    WHERE p.store_id = p_store_id
      AND p.is_available = true
      AND query_input.q <> ''
      AND (p_category IS NULL OR p_category = '' OR p_category = 'All' OR p.category = p_category)
      AND (p_type IS NULL OR p_type = '' OR p_type = 'All' OR p.type = p_type)
      AND (p_min_price IS NULL OR p.price >= p_min_price)
      AND (p_max_price IS NULL OR p.price <= p_max_price)
      AND (p_sale_only = false OR p.original_price IS NOT NULL)
      AND (
        to_tsvector(
          'simple',
          coalesce(p.name, '') || ' ' ||
          coalesce(p.description, '') || ' ' ||
          coalesce(p.category, '') || ' ' ||
          coalesce(p.type, '')
        ) @@ query_input.tsq
        OR similarity(lower(coalesce(p.name, '')), lower(query_input.q)) > 0.18
        OR similarity(lower(coalesce(p.description, '')), lower(query_input.q)) > 0.08
      )
  ),
  deduped AS (
    SELECT
      ranked.*,
      row_number() OVER (
        PARTITION BY
          lower(coalesce(ranked.name, '')),
          lower(coalesce(ranked.category, '')),
          lower(coalesce(ranked.type, '')),
          coalesce(ranked.price, 0),
          coalesce(ranked.original_price, 0)
        ORDER BY
          ranked.text_rank DESC,
          ranked.similarity_score DESC,
          ranked.featured DESC,
          ranked.updated_at DESC,
          ranked.id
      ) AS duplicate_rank
    FROM ranked
  )
  SELECT
    deduped.id,
    deduped.store_id,
    deduped.name,
    deduped.price,
    deduped.original_price,
    deduped.image_url,
    deduped.images,
    deduped.description,
    deduped.sizes,
    deduped.colors,
    deduped.category,
    deduped.type,
    deduped.featured,
    deduped.badge,
    deduped.stock,
    deduped.is_available,
    deduped.metric_values,
    deduped.created_at,
    deduped.updated_at,
    deduped.similarity_score,
    deduped.text_rank
  FROM deduped
  WHERE deduped.duplicate_rank = 1
  ORDER BY
    deduped.text_rank DESC,
    deduped.similarity_score DESC,
    deduped.featured DESC,
    deduped.updated_at DESC
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 48), 100));
$$;
