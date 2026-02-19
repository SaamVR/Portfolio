
-- Create coupon_codes table
CREATE TABLE public.coupon_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value integer NOT NULL DEFAULT 0,
  min_order integer NOT NULL DEFAULT 0,
  max_uses integer NULL,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read active coupons (needed for checkout validation)
CREATE POLICY "Anyone can view active coupons"
ON public.coupon_codes
FOR SELECT
USING (is_active = true);

-- Admins can manage all coupons
CREATE POLICY "Admins can manage coupons"
ON public.coupon_codes
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_coupon_codes_updated_at
BEFORE UPDATE ON public.coupon_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default delivery_settings into site_settings
INSERT INTO public.site_settings (key, value)
VALUES ('delivery_settings', '{"enabled": true, "free_threshold": 2000, "delivery_fee": 80}'::jsonb)
ON CONFLICT (key) DO NOTHING;
