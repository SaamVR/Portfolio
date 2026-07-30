-- Signup leads are created by the merchant-signup Edge Function with the
-- service role. Browser clients do not need a direct INSERT policy.
DROP POLICY IF EXISTS "Anyone can create CMS signup leads"
  ON public.cms_signup_leads;

-- Public buckets serve individual object URLs without a SELECT policy.
-- Keep authenticated platform admins able to browse the bucket in the CMS,
-- while preventing anonymous enumeration of every stored object.
DROP POLICY IF EXISTS "Anyone can view hero media"
  ON storage.objects;

DROP POLICY IF EXISTS "Admins can view hero media"
  ON storage.objects;

CREATE POLICY "Admins can view hero media"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'hero-media'
    AND public.is_admin((SELECT auth.uid()))
  );
