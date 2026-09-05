-- #262 + #261: reconstruct the intentional post-P6 public routine allow-list.
-- Restore only caller-bound RLS helpers and the store-scoped guest coupon helper;
-- remove browser access to the obsolete cross-store coupon overload.

GRANT EXECUTE ON FUNCTION public.can_manage_store(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, integer, uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, integer) FROM PUBLIC, anon, authenticated;
