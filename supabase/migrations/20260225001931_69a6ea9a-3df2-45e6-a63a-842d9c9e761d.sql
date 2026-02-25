
-- Categories table with parent_id for subcategories
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.product_categories FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Product types table
CREATE TABLE public.product_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view types" ON public.product_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage types" ON public.product_types FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Seed existing categories
INSERT INTO public.product_categories (name, sort_order) VALUES
  ('Essentials', 1),
  ('Premium', 2),
  ('Street', 3);

-- Seed existing types
INSERT INTO public.product_types (name, sort_order) VALUES
  ('T-Shirt', 1),
  ('Polo', 2),
  ('Shirt', 3),
  ('Drop Shoulder', 4),
  ('Undergarment', 5),
  ('Pants', 6);
