-- #169: keep trigger helpers non-callable through the exposed API surface.
revoke all on function public.dispatch_storefront_search_sync() from public, anon, authenticated;
revoke all on function public.handle_order_notifications() from public, anon, authenticated;
revoke all on function public.handle_store_publish() from public, anon, authenticated;
revoke all on function public.handle_subscription_status_update() from public, anon, authenticated;

grant execute on function public.dispatch_storefront_search_sync() to service_role;
grant execute on function public.handle_order_notifications() to service_role;
grant execute on function public.handle_store_publish() to service_role;
grant execute on function public.handle_subscription_status_update() to service_role;
