-- Runtime-7 final convergence: Firebase phone authentication is retired.
--
-- Preserve the historical migration chain, but remove the abandoned runtime
-- surfaces if they exist in any environment where that experiment was applied.
-- This migration is deliberately idempotent so production can apply it even
-- when external_auth_identity_binding_334 was correctly kept non-production.

DROP TABLE IF EXISTS public.external_auth_identities;
DROP FUNCTION IF EXISTS public.get_user_id_by_email(text);
