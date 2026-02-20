
-- Fix contact_messages RLS: restrict SELECT and UPDATE policies to authenticated role only
-- This prevents any theoretical anonymous access to customer PII

-- Drop the existing broad policies (assigned to public role)
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;

-- Re-create SELECT policy scoped to authenticated role only
CREATE POLICY "Admins can view contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Re-create UPDATE policy scoped to authenticated role only
CREATE POLICY "Admins can update contact messages"
ON public.contact_messages
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));
