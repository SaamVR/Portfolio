CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  order_id text,
  template_name text NOT NULL,
  recipient text,
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  status text NOT NULL CHECK (status IN ('sent', 'skipped', 'failed')),
  provider text,
  provider_message_id text,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_store_created_at
  ON public.email_events(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_status_created_at
  ON public.email_events(status, created_at DESC);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store managers can view email events" ON public.email_events;
CREATE POLICY "Store managers can view email events" ON public.email_events
FOR SELECT
TO authenticated
USING (
  store_id IS NOT NULL AND public.can_manage_store(store_id, auth.uid())
);

DROP POLICY IF EXISTS "Platform admins can view all email events" ON public.email_events;
CREATE POLICY "Platform admins can view all email events" ON public.email_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
