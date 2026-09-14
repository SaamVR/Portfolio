-- P1 #334: bind Firebase external subjects to Supabase users durably.
--
-- The legacy bridge rediscovered users from mutable email/phone claims and then
-- reset the matched Supabase password. That is not an acceptable account-linking
-- authority. This table makes provider project + immutable subject the identity.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE nullif(raw_user_meta_data->>'firebase_uid', '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'external_auth_identity_reconciliation_required: legacy Firebase-linked auth users must be reconciled before migration';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.external_auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_project_id text NOT NULL,
  provider_subject text NOT NULL,
  supabase_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_email text,
  verified_phone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT external_auth_identities_provider_nonblank
    CHECK (btrim(provider) <> ''),
  CONSTRAINT external_auth_identities_project_nonblank
    CHECK (btrim(provider_project_id) <> ''),
  CONSTRAINT external_auth_identities_subject_nonblank
    CHECK (btrim(provider_subject) <> ''),
  CONSTRAINT external_auth_identities_provider_subject_unique
    UNIQUE (provider, provider_project_id, provider_subject),
  CONSTRAINT external_auth_identities_provider_user_unique
    UNIQUE (provider, provider_project_id, supabase_user_id)
);

ALTER TABLE public.external_auth_identities ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.external_auth_identities FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.external_auth_identities TO service_role;

CREATE INDEX IF NOT EXISTS idx_external_auth_identities_user
  ON public.external_auth_identities (supabase_user_id);

COMMENT ON TABLE public.external_auth_identities IS
  'Durable server-only binding from immutable external auth subject to one Supabase auth user.';
COMMENT ON COLUMN public.external_auth_identities.provider_subject IS
  'Immutable external provider subject (Firebase localId for provider=firebase), never email or phone.';
