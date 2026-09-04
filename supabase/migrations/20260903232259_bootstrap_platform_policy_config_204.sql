CREATE TABLE IF NOT EXISTS public.platform_policy_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  policy_version text NOT NULL,
  binding boolean NOT NULL DEFAULT false,
  acceptance_text text NOT NULL DEFAULT '',
  effective_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  site_name_snapshot text,
  legal_operator_name_snapshot text
);
