ALTER TABLE public.product_types
  ADD COLUMN IF NOT EXISTS metric_schema jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS metric_values jsonb NOT NULL DEFAULT '{}'::jsonb;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_types'
      AND column_name = 'metric_schema'
  ) THEN
    ALTER TABLE public.product_types
      DROP CONSTRAINT IF EXISTS product_types_metric_schema_is_array;

    ALTER TABLE public.product_types
      ADD CONSTRAINT product_types_metric_schema_is_array
      CHECK (jsonb_typeof(metric_schema) = 'array');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'metric_values'
  ) THEN
    ALTER TABLE public.products
      DROP CONSTRAINT IF EXISTS products_metric_values_is_object;

    ALTER TABLE public.products
      ADD CONSTRAINT products_metric_values_is_object
      CHECK (jsonb_typeof(metric_values) = 'object');
  END IF;
END $$;
UPDATE public.products
SET metric_values = jsonb_strip_nulls(
  jsonb_build_object(
    'size',
    CASE
      WHEN coalesce(array_length(sizes, 1), 0) > 0 THEN to_jsonb(sizes)
      ELSE NULL
    END,
    'color',
    CASE
      WHEN coalesce(array_length(colors, 1), 0) > 0 THEN to_jsonb(colors)
      ELSE NULL
    END
  )
)
WHERE metric_values = '{}'::jsonb;
