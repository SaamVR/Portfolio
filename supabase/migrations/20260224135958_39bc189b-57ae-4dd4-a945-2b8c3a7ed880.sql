
-- Create storage bucket for hero media (images/videos)
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-media', 'hero-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view hero media
CREATE POLICY "Anyone can view hero media"
ON storage.objects FOR SELECT
USING (bucket_id = 'hero-media');

-- Admins can upload hero media
CREATE POLICY "Admins can upload hero media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hero-media' AND public.is_admin(auth.uid()));

-- Admins can update hero media
CREATE POLICY "Admins can update hero media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'hero-media' AND public.is_admin(auth.uid()));

-- Admins can delete hero media
CREATE POLICY "Admins can delete hero media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'hero-media' AND public.is_admin(auth.uid()));
