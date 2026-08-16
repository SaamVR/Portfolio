-- Make invoice settlement and subscription entitlements one database transaction.
-- Any failure while activating the subscription or updating the legacy store plan
-- aborts the invoice status change as well.
CREATE OR REPLACE FUNCTION public.sync_paid_invoice_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.store_subscriptions (
      store_id,
      plan_id,
      status,
      provider,
      provider_subscription_id,
      current_period_ends_at,
      trial_ends_at,
      updated_at
    )
    VALUES (
      NEW.store_id,
      NEW.plan_id,
      'active',
      NEW.provider,
      NEW.provider_invoice_id,
      NEW.billing_period_end,
      NULL,
      now()
    )
    ON CONFLICT (store_id) DO UPDATE
    SET
      plan_id = EXCLUDED.plan_id,
      status = 'active',
      provider = EXCLUDED.provider,
      provider_subscription_id = EXCLUDED.provider_subscription_id,
      current_period_ends_at = EXCLUDED.current_period_ends_at,
      trial_ends_at = NULL,
      updated_at = now();

    UPDATE public.stores
    SET plan = NEW.plan_id,
        updated_at = now()
    WHERE id = NEW.store_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot settle invoice %, store % does not exist', NEW.id, NEW.store_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_paid_invoice_entitlements_trigger ON public.store_invoices;
CREATE TRIGGER sync_paid_invoice_entitlements_trigger
  AFTER UPDATE OF status ON public.store_invoices
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.sync_paid_invoice_entitlements();

REVOKE ALL ON FUNCTION public.sync_paid_invoice_entitlements() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_paid_invoice_entitlements() TO service_role;
