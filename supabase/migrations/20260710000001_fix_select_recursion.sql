-- Fix the infinite recursion caused by the SELECT policy on store_memberships
-- By avoiding the can_manage_store or is_store_admin helper, which queries store_memberships,
-- we break the cycle.

DROP POLICY IF EXISTS "Store members can view memberships" ON public.store_memberships;

CREATE POLICY "Store members can view memberships"
  ON public.store_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.stores 
      WHERE id = store_memberships.store_id 
        AND owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );
