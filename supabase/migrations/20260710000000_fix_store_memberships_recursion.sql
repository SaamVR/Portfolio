-- Fix infinite recursion in store_memberships policies

-- 1. Create a SECURITY DEFINER function to safely check store admin status
CREATE OR REPLACE FUNCTION public.is_store_admin(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores
    WHERE id = _store_id
      AND owner_id = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.store_memberships
    WHERE store_id = _store_id
      AND user_id = _user_id
      AND role IN ('owner', 'admin')
  )
$$;

-- 2. Revoke execute from public
REVOKE EXECUTE ON FUNCTION public.is_store_admin(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_store_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_admin(uuid, uuid) TO service_role;

-- 3. Replace the offending FOR ALL policy on store_memberships
DROP POLICY IF EXISTS "Store owners can manage memberships" ON public.store_memberships;

CREATE POLICY "Store owners can insert memberships"
  ON public.store_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_store_admin(store_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Store owners can update memberships"
  ON public.store_memberships FOR UPDATE
  TO authenticated
  USING (
    public.is_store_admin(store_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_store_admin(store_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Store owners can delete memberships"
  ON public.store_memberships FOR DELETE
  TO authenticated
  USING (
    public.is_store_admin(store_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 4. Fix other policies that might be querying store_memberships directly in a recursive way
DROP POLICY IF EXISTS "Store owners can manage subscriptions" ON public.store_subscriptions;
CREATE POLICY "Store owners can manage subscriptions"
  ON public.store_subscriptions FOR ALL
  TO authenticated
  USING (
    public.is_store_admin(store_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_store_admin(store_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Store owners can manage staff invites" ON public.store_staff_invites;
CREATE POLICY "Store owners can manage staff invites"
  ON public.store_staff_invites FOR ALL
  TO authenticated
  USING (
    public.is_store_admin(store_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_store_admin(store_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
