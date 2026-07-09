CREATE TABLE IF NOT EXISTS public.store_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.cms_plans(id),
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'BDT',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  provider text,
  provider_invoice_id text,
  payment_method text,
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_invoices ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Store managers can view invoices" ON public.store_invoices
FOR SELECT
TO authenticated
USING (
  can_manage_store(store_id, auth.uid())
);
