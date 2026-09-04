create table if not exists public.platform_policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_version text not null,
  acceptance_text text not null,
  acceptance_context text not null check (
    acceptance_context in ('merchant_signup', 'billing', 'policy_update')
  ),
  document_paths jsonb not null default '["/terms","/privacy","/billing-policy"]'::jsonb,
  accepted_at timestamptz not null default now(),
  unique (user_id, policy_version)
);

create index if not exists platform_policy_acceptances_version_idx
  on public.platform_policy_acceptances(policy_version, accepted_at desc);

alter table public.platform_policy_acceptances enable row level security;
revoke all on public.platform_policy_acceptances from public, anon, authenticated, service_role;
grant select, insert on public.platform_policy_acceptances to service_role;
grant all on public.platform_policy_acceptances to postgres;
