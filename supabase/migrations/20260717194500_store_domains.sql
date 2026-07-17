DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.store_domains (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    hostname text NOT NULL,
    status text NOT NULL DEFAULT 'pending_verification'
      CHECK (status IN (
        'pending_vercel',
        'pending_verification',
        'pending_dns',
        'active',
        'misconfigured',
        'removing',
        'failed'
      )),
    is_primary boolean NOT NULL DEFAULT false,
    is_www_domain boolean NOT NULL DEFAULT false,
    vercel_verified boolean NOT NULL DEFAULT false,
    vercel_misconfigured boolean NOT NULL DEFAULT true,
    configured_by text,
    verification_records jsonb NOT NULL DEFAULT '[]'::jsonb,
    dns_records jsonb NOT NULL DEFAULT '[]'::jsonb,
    last_vercel_error jsonb,
    last_checked_at timestamptz,
    activated_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.store_domains
  ALTER COLUMN hostname TYPE text;

CREATE UNIQUE INDEX IF NOT EXISTS store_domains_hostname_unique
  ON public.store_domains (lower(hostname));

CREATE UNIQUE INDEX IF NOT EXISTS store_domains_one_primary_per_store
  ON public.store_domains (store_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS store_domains_store_id_idx
  ON public.store_domains (store_id);

CREATE INDEX IF NOT EXISTS store_domains_status_idx
  ON public.store_domains (status);

CREATE OR REPLACE FUNCTION public.normalize_store_domain_hostname()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.hostname := lower(trim(both '.' from NEW.hostname));
  NEW.updated_at := now();

  IF NEW.status = 'active' AND NEW.activated_at IS NULL THEN
    NEW.activated_at := now();
  ELSIF NEW.status <> 'active' THEN
    NEW.activated_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_store_domain_hostname_trigger ON public.store_domains;
CREATE TRIGGER normalize_store_domain_hostname_trigger
  BEFORE INSERT OR UPDATE ON public.store_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_store_domain_hostname();

CREATE OR REPLACE FUNCTION public.sync_store_custom_domain_from_domains(_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_domain text;
BEGIN
  SELECT d.hostname
  INTO next_domain
  FROM public.store_domains d
  WHERE d.store_id = _store_id
    AND d.status = 'active'
    AND d.is_primary = true
  ORDER BY d.updated_at DESC
  LIMIT 1;

  IF next_domain IS NULL THEN
    SELECT d.hostname
    INTO next_domain
    FROM public.store_domains d
    WHERE d.store_id = _store_id
      AND d.status = 'active'
    ORDER BY d.is_primary DESC, d.updated_at DESC
    LIMIT 1;
  END IF;

  UPDATE public.stores
  SET custom_domain = next_domain,
      updated_at = now()
  WHERE id = _store_id
    AND custom_domain IS DISTINCT FROM next_domain;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_store_domain_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_store_custom_domain_from_domains(COALESCE(NEW.store_id, OLD.store_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_store_custom_domain_trigger ON public.store_domains;
CREATE TRIGGER sync_store_custom_domain_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.store_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_store_domain_sync();

ALTER TABLE public.store_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active store domains" ON public.store_domains;
CREATE POLICY "Public can view active store domains"
  ON public.store_domains FOR SELECT
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_domains.store_id
        AND stores.is_published = true
    )
  );

DROP POLICY IF EXISTS "Store managers can view store domains" ON public.store_domains;
CREATE POLICY "Store managers can view store domains"
  ON public.store_domains FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store managers can manage store domains" ON public.store_domains;
CREATE POLICY "Store managers can manage store domains"
  ON public.store_domains FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Backfill any already-active custom domains into the new table.
INSERT INTO public.store_domains (
  store_id,
  hostname,
  status,
  is_primary,
  is_www_domain,
  vercel_verified,
  vercel_misconfigured,
  activated_at,
  created_at,
  updated_at
)
SELECT
  s.id,
  lower(s.custom_domain),
  'active',
  true,
  lower(s.custom_domain) LIKE 'www.%',
  true,
  false,
  now(),
  now(),
  now()
FROM public.stores s
WHERE s.custom_domain IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.store_domains d
    WHERE lower(d.hostname) = lower(s.custom_domain)
  );

UPDATE public.store_domains
SET is_primary = true
WHERE id IN (
  SELECT DISTINCT ON (store_id) id
  FROM public.store_domains
  WHERE status = 'active'
  ORDER BY store_id, is_primary DESC, updated_at DESC
);

DO $$
DECLARE
  store_row record;
BEGIN
  FOR store_row IN
    SELECT id FROM public.stores
  LOOP
    PERFORM public.sync_store_custom_domain_from_domains(store_row.id);
  END LOOP;
END $$;
