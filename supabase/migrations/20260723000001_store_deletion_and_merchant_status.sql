-- Store deletion audit trail and merchant account recovery controls.

CREATE TABLE IF NOT EXISTS public.merchant_account_statuses (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  can_create_store boolean NOT NULL DEFAULT true,
  status_note text,
  banned_at timestamptz,
  restored_at timestamptz,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_deletion_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_store_id uuid NOT NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_name text NOT NULL,
  store_slug text NOT NULL,
  deletion_source text NOT NULL CHECK (deletion_source IN ('merchant_self_delete', 'platform_admin_delete')),
  merchant_visible_reason text NOT NULL,
  admin_note text,
  deleted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_can_create_store boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_account_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_deletion_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own merchant account status" ON public.merchant_account_statuses;
CREATE POLICY "Users can view own merchant account status"
  ON public.merchant_account_statuses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Platform admins can manage merchant account statuses" ON public.merchant_account_statuses;
CREATE POLICY "Platform admins can manage merchant account statuses"
  ON public.merchant_account_statuses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own store deletion records" ON public.store_deletion_records;
CREATE POLICY "Users can view own store deletion records"
  ON public.store_deletion_records FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Platform admins can manage store deletion records" ON public.store_deletion_records;
CREATE POLICY "Platform admins can manage store deletion records"
  ON public.store_deletion_records FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_merchant_account_statuses_updated_at ON public.merchant_account_statuses;
CREATE TRIGGER update_merchant_account_statuses_updated_at
  BEFORE UPDATE ON public.merchant_account_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_store_deletion_records_owner_user_id
  ON public.store_deletion_records(owner_user_id, created_at DESC);
