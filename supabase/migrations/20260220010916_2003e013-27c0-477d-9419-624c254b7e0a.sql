
-- 1. Server-side length constraints on review_text to enforce data integrity
ALTER TABLE public.product_reviews
  ADD CONSTRAINT review_text_max_length CHECK (char_length(review_text) <= 500),
  ADD CONSTRAINT review_text_min_length CHECK (review_text IS NULL OR char_length(trim(review_text)) >= 0),
  ADD CONSTRAINT author_name_max_length CHECK (char_length(author_name) <= 100);

-- 2. Server-side length constraints on contact_messages to prevent abuse
ALTER TABLE public.contact_messages
  ADD CONSTRAINT contact_name_max_length CHECK (char_length(name) <= 100),
  ADD CONSTRAINT contact_email_max_length CHECK (char_length(email) <= 255),
  ADD CONSTRAINT contact_message_max_length CHECK (char_length(message) <= 2000),
  ADD CONSTRAINT contact_message_min_length CHECK (char_length(trim(message)) >= 10);

-- 3. Rate limiting function for contact form submissions (per email, 5 per hour)
CREATE OR REPLACE FUNCTION public.check_contact_rate_limit(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < 5
  FROM public.contact_messages
  WHERE email = lower(trim(_email))
    AND created_at > now() - INTERVAL '1 hour';
$$;
