-- Hardening Security Definer functions by revoking EXECUTE from public

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_store_lifecycle_update() FROM public;
GRANT EXECUTE ON FUNCTION public.handle_store_lifecycle_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_store_lifecycle_update() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_subscription_status_update() FROM public;
GRANT EXECUTE ON FUNCTION public.handle_subscription_status_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_subscription_status_update() TO service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, integer, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, integer, uuid) TO service_role;
