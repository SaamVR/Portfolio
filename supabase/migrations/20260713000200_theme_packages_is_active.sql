ALTER TABLE public.theme_packages
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Shared or owned theme packages are readable" ON public.theme_packages;
CREATE POLICY "Shared or owned theme packages are readable"
  ON public.theme_packages FOR SELECT
  USING (
    (
      source_type IN ('system', 'admin_shared')
      AND is_active = true
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.can_manage_store(owner_store_id, auth.uid())
  );
