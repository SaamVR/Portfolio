-- Public-schema default privileges can expose more table operations than the
-- editor needs. Replace inherited grants with the exact Data API surface.

REVOKE ALL ON public.block_registry_variants FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.block_registry_variants TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.block_registry_variants TO authenticated;

GRANT ALL ON public.block_registry_variants TO service_role;

REVOKE ALL ON public.storefront_drafts FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.storefront_drafts TO authenticated;

GRANT ALL ON public.storefront_drafts TO service_role;

REVOKE ALL ON public.storefront_releases FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT ON public.storefront_releases TO authenticated;

GRANT ALL ON public.storefront_releases TO service_role;

-- Production already had this relation when the historical migration ran, while
-- the reconstructed repository creates it later in 20260820084000. Preserve the
-- historical grants when the relation exists without breaking a clean bootstrap.
DO $$
BEGIN
  IF to_regclass('public.store_preview_tokens') IS NOT NULL THEN
    REVOKE ALL ON public.store_preview_tokens FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, DELETE ON public.store_preview_tokens TO authenticated;
    GRANT ALL ON public.store_preview_tokens TO service_role;
  END IF;
END
$$;
