
-- Add images array to products table for multi-image gallery (up to 5)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';
