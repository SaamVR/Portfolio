ALTER TABLE public.store_business_profiles
  ADD COLUMN IF NOT EXISTS blueprint_version integer;
