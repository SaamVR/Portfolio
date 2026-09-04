revoke all on function public.activate_platform_availability_monitoring() from public, anon, authenticated;
grant execute on function public.activate_platform_availability_monitoring() to service_role, postgres;
