-- Restore explicit server-side billing writes after subscription hardening.
-- These grants are safe to re-apply and keep browser clients locked down
-- while allowing service-role routes to approve invoices and update plans.

grant select, insert, update, delete
  on table public.store_subscriptions
  to service_role;

grant select, update
  on table public.stores
  to service_role;

grant select, insert, update
  on table public.store_invoices
  to service_role;

grant select, insert
  on table public.platform_audit_logs
  to service_role;
