ALTER TABLE public.store_domains
  ADD COLUMN IF NOT EXISTS domain_type text NOT NULL DEFAULT 'custom'
    CHECK (domain_type IN ('custom', 'platform')),
  ADD COLUMN IF NOT EXISTS cloudflare_hostname_id text,
  ADD COLUMN IF NOT EXISTS cloudflare_hostname_status text,
  ADD COLUMN IF NOT EXISTS cloudflare_ssl_status text,
  ADD COLUMN IF NOT EXISTS last_cloudflare_error jsonb;

CREATE INDEX IF NOT EXISTS store_domains_cloudflare_hostname_id_idx
  ON public.store_domains (cloudflare_hostname_id)
  WHERE cloudflare_hostname_id IS NOT NULL;

UPDATE public.store_domains
SET domain_type = 'custom'
WHERE domain_type IS NULL;
