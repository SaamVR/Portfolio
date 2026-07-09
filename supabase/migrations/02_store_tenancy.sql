-- Tenant ownership and staff access.
-- Canonical sources:
-- - 20260702000000_cms_engine_multi_tenant.sql
-- - 20260702000001_store_staff_invites.sql

DO $$
BEGIN
  CREATE TYPE public.store_member_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  custom_domain text UNIQUE,
  currency_code text NOT NULL DEFAULT 'BDT',
  locale text NOT NULL DEFAULT 'en-BD',
  plan text NOT NULL DEFAULT 'free',
  store_type text NOT NULL DEFAULT 'clothing',
  logo_url text,
  favicon_url text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.store_member_role NOT NULL DEFAULT 'owner',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.store_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.cms_plans(id),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled')),
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  provider text,
  provider_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  email text,
  role public.store_member_role NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'revoked', 'expired')),
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.can_manage_store(_store_id uuid, _user_id uuid)
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
      AND role IN ('owner', 'admin', 'editor')
  )
  OR public.has_role(_user_id, 'admin');
$$;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_staff_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published stores" ON public.stores;
CREATE POLICY "Anyone can view published stores"
  ON public.stores FOR SELECT
  USING (is_published = true OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store owners can manage stores" ON public.stores;
CREATE POLICY "Store owners can manage stores"
  ON public.stores FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store members can view memberships" ON public.store_memberships;
CREATE POLICY "Store members can view memberships"
  ON public.store_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store owners can manage memberships" ON public.store_memberships;
CREATE POLICY "Store owners can manage memberships"
  ON public.store_memberships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.store_memberships owner_membership
      WHERE owner_membership.store_id = store_memberships.store_id
        AND owner_membership.user_id = auth.uid()
        AND owner_membership.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.store_memberships owner_membership
      WHERE owner_membership.store_id = store_memberships.store_id
        AND owner_membership.user_id = auth.uid()
        AND owner_membership.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Store members can view subscriptions" ON public.store_subscriptions;
CREATE POLICY "Store members can view subscriptions"
  ON public.store_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.store_memberships
      WHERE store_memberships.store_id = store_subscriptions.store_id
        AND store_memberships.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Platform admins can manage subscriptions" ON public.store_subscriptions;
CREATE POLICY "Platform admins can manage subscriptions"
  ON public.store_subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store staff can view invites" ON public.store_staff_invites;
CREATE POLICY "Store staff can view invites"
  ON public.store_staff_invites FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()) OR claimed_by = auth.uid());

DROP POLICY IF EXISTS "Store admins can manage invites" ON public.store_staff_invites;
CREATE POLICY "Store admins can manage invites"
  ON public.store_staff_invites FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.store_memberships
      WHERE store_memberships.store_id = store_staff_invites.store_id
        AND store_memberships.user_id = auth.uid()
        AND store_memberships.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.store_memberships
      WHERE store_memberships.store_id = store_staff_invites.store_id
        AND store_memberships.user_id = auth.uid()
        AND store_memberships.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  );
