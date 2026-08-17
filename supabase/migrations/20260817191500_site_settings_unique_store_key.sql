-- Basic/advanced editor persistence upserts site settings with
-- ON CONFLICT (store_id, key). Repair any historical duplicates first, then
-- provide the unique index PostgreSQL/PostgREST needs to infer that conflict key.
WITH ranked_settings AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY store_id, key
      ORDER BY updated_at DESC NULLS LAST, id DESC
    ) AS row_number_for_key
  FROM public.site_settings
  WHERE store_id IS NOT NULL
)
DELETE FROM public.site_settings settings
USING ranked_settings ranked
WHERE settings.id = ranked.id
  AND ranked.row_number_for_key > 1;

CREATE UNIQUE INDEX IF NOT EXISTS site_settings_store_id_key_uidx
  ON public.site_settings (store_id, key);
