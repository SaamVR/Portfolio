ALTER TABLE public.cms_plans
  ADD COLUMN IF NOT EXISTS annual_price integer,
  ADD COLUMN IF NOT EXISTS annual_discount_percentage integer NOT NULL DEFAULT 0;

ALTER TABLE public.cms_plans
  DROP CONSTRAINT IF EXISTS cms_plans_annual_discount_percentage_range;

ALTER TABLE public.cms_plans
  ADD CONSTRAINT cms_plans_annual_discount_percentage_range
  CHECK (annual_discount_percentage >= 0 AND annual_discount_percentage <= 100);

ALTER TABLE public.store_invoices
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly';

ALTER TABLE public.store_invoices
  DROP CONSTRAINT IF EXISTS store_invoices_billing_interval_check;

ALTER TABLE public.store_invoices
  ADD CONSTRAINT store_invoices_billing_interval_check
  CHECK (billing_interval IN ('monthly', 'annual'));

UPDATE public.cms_plans
SET annual_price = CASE
  WHEN annual_price IS NOT NULL THEN annual_price
  WHEN monthly_price IS NULL THEN NULL
  ELSE monthly_price * 12
END,
annual_discount_percentage = COALESCE(annual_discount_percentage, 0);
