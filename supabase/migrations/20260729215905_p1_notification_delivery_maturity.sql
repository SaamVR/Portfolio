ALTER TABLE public.email_events
  DROP CONSTRAINT IF EXISTS email_events_status_check;

ALTER TABLE public.email_events
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS bounced_at timestamptz,
  ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz,
  ADD COLUMN IF NOT EXISTS operator_escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS operator_escalation_reason text;

ALTER TABLE public.email_events
  ADD CONSTRAINT email_events_status_check
  CHECK (
    status IN (
      'queued',
      'sent',
      'skipped',
      'failed',
      'retrying',
      'dead_letter',
      'delivered',
      'bounced'
    )
  );

ALTER TABLE public.email_events
  ADD CONSTRAINT email_events_delivery_status_check
  CHECK (
    delivery_status IS NULL
    OR delivery_status IN ('accepted', 'delivered', 'bounced', 'deferred', 'unknown')
  );

ALTER TABLE public.email_events
  ADD CONSTRAINT email_events_retry_count_check
  CHECK (retry_count >= 0);

CREATE INDEX IF NOT EXISTS idx_email_events_retry_queue
  ON public.email_events(store_id, status, next_retry_at)
  WHERE status IN ('retrying', 'dead_letter');

CREATE INDEX IF NOT EXISTS idx_email_events_provider_message_id
  ON public.email_events(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_events_operator_escalated_at
  ON public.email_events(store_id, operator_escalated_at DESC)
  WHERE operator_escalated_at IS NOT NULL;
