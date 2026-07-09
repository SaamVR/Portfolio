-- Platform-level CMS tables.
-- Canonical sources:
-- - 20260218123954_70d6a7c0-68a0-4844-a600-2672596860ea.sql
-- - 20260702000000_cms_engine_multi_tenant.sql

CREATE TABLE IF NOT EXISTS public.cms_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  monthly_price integer,
  currency_code text NOT NULL DEFAULT 'BDT',
  store_limit integer,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cms_signup_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  phone text,
  business_type text,
  desired_plan text REFERENCES public.cms_plans(id),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_signup_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view CMS plans" ON public.cms_plans;
CREATE POLICY "Anyone can view CMS plans"
  ON public.cms_plans FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Platform admins can manage CMS plans" ON public.cms_plans;
CREATE POLICY "Platform admins can manage CMS plans"
  ON public.cms_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Platform admins can manage CMS signup leads" ON public.cms_signup_leads;
CREATE POLICY "Platform admins can manage CMS signup leads"
  ON public.cms_signup_leads FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
