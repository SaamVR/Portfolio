-- A recovery lead may receive multiple touches over time, but one scheduled touch
-- must be queued at most once even when authorized queue requests race.

ALTER TABLE public.store_cart_recovery_messages
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

UPDATE public.store_cart_recovery_messages
SET scheduled_for = created_at
WHERE scheduled_for IS NULL;

DO $$
DECLARE
  duplicate_row record;
BEGIN
  SELECT store_id, lead_id, scheduled_for, count(*) AS row_count
  INTO duplicate_row
  FROM public.store_cart_recovery_messages
  GROUP BY store_id, lead_id, scheduled_for
  HAVING count(*) > 1
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'cannot enforce recovery touch idempotency: store %, lead %, scheduled % has % rows',
      duplicate_row.store_id,
      duplicate_row.lead_id,
      duplicate_row.scheduled_for,
      duplicate_row.row_count;
  END IF;
END;
$$;
ALTER TABLE public.store_cart_recovery_messages
  ALTER COLUMN scheduled_for SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_recovery_messages_scheduled_touch_unique
  ON public.store_cart_recovery_messages(store_id, lead_id, scheduled_for);

COMMENT ON COLUMN public.store_cart_recovery_messages.scheduled_for IS
  'Immutable scheduling identity for one recovery touch; used with store_id + lead_id to prevent concurrent duplicate queueing.';
