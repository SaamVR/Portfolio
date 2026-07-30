-- P6 hardening: reduce anonymous visibility on existing internal objects
-- while keeping storefront-facing tables under their current explicit access model.

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

revoke all on table public.cms_signup_leads from anon;
revoke all on table public.email_events from anon;
revoke all on table public.store_domains from anon;
revoke all on table public.store_feature_overrides from anon;
revoke all on table public.store_invoices from anon;
revoke all on table public.store_lifecycle_events from anon;
revoke all on table public.store_memberships from anon;
revoke all on table public.store_staff_invites from anon;
revoke all on table public.store_subscriptions from anon;
revoke all on table public.user_email_feature_overrides from anon;
revoke all on table public.user_roles from anon;
