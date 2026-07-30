CREATE TABLE IF NOT EXISTS public.store_backup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  actor_user_id uuid NULL,
  action text NOT NULL CHECK (action IN ('export', 'import')),
  format text NOT NULL CHECK (format IN ('json', 'zip')),
  source_store_id uuid NULL REFERENCES public.stores(id) ON DELETE SET NULL,
  target_store_id uuid NULL REFERENCES public.stores(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_backup_events_store_created_at
  ON public.store_backup_events(store_id, created_at DESC);

ALTER TABLE public.store_backup_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store managers can view backup events" ON public.store_backup_events;
CREATE POLICY "Store managers can view backup events"
  ON public.store_backup_events
  FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store managers can create backup events" ON public.store_backup_events;
CREATE POLICY "Store managers can create backup events"
  ON public.store_backup_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Platform admins can view all backup events" ON public.store_backup_events;
CREATE POLICY "Platform admins can view all backup events"
  ON public.store_backup_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
