-- WhatsApp is a first-class notification channel for merchant order alerts.
-- Older environments only allow email/sms in email_events, which makes the
-- existing WhatsApp observability insert fail even when delivery itself runs.

ALTER TABLE public.email_events
  DROP CONSTRAINT IF EXISTS email_events_channel_check;

ALTER TABLE public.email_events
  ADD CONSTRAINT email_events_channel_check
  CHECK (channel IN ('email', 'sms', 'whatsapp'));
