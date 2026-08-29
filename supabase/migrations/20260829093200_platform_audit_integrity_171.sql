-- #171: platform audit-log integrity and direct-write hardening.
-- Browser clients must not author canonical audit identity or mutate audit history.

alter table public.platform_audit_logs enable row level security;

drop policy if exists "Platform admins can insert audit logs" on public.platform_audit_logs;

revoke insert, update, delete, truncate, references, trigger
  on table public.platform_audit_logs
  from anon, authenticated;

revoke select on table public.platform_audit_logs from anon;
grant select on table public.platform_audit_logs to authenticated;

comment on table public.platform_audit_logs is
  'Append-only platform operator audit history. Canonical writes are service/server authored; browser roles are read-only through RLS.';
