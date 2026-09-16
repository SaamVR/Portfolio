-- Keep registry reads in one permissive policy per role/action so an operator
-- can inspect retired variants without doubling policy work for active rows.

DROP POLICY IF EXISTS "Anyone can read active block registry variants" ON public.block_registry_variants;

DROP POLICY IF EXISTS "Platform admins can manage block registry variants" ON public.block_registry_variants;

CREATE POLICY "Active variants or platform admins can read registry variants"
  ON public.block_registry_variants FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    OR (
      (select auth.uid()) IS NOT NULL
      AND public.has_role((select auth.uid()), 'admin'::public.app_role)
    )
  );

CREATE POLICY "Platform admins can create registry variants"
  ON public.block_registry_variants FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Platform admins can update registry variants"
  ON public.block_registry_variants FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Platform admins can delete registry variants"
  ON public.block_registry_variants FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));
