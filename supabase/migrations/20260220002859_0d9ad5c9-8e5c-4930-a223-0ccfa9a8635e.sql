
-- Create product_reviews table
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  size_purchased text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id, order_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON public.product_reviews FOR SELECT
  USING (status = 'approved');

-- Authenticated users can insert their own reviews
CREATE POLICY "Authenticated users can insert own reviews"
  ON public.product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can read ALL reviews (pending, approved, rejected)
CREATE POLICY "Admins can view all reviews"
  ON public.product_reviews FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update any review (approve, reject, reply)
CREATE POLICY "Admins can update reviews"
  ON public.product_reviews FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Admins can delete reviews
CREATE POLICY "Admins can delete reviews"
  ON public.product_reviews FOR DELETE
  USING (public.is_admin(auth.uid()));
