-- Secure unpublished-store preview tokens.
-- Tokens are created only through the authenticated server route. The raw bearer
-- token is the UUID primary key, scoped to one store and limited to 24 hours.

create table if not exists public.store_preview_tokens (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_by uuid null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz null
);

-- Make the migration safe if an earlier/manual version of the table exists.
alter table public.store_preview_tokens
  add column if not exists created_by uuid null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists revoked_at timestamptz null;

create index if not exists store_preview_tokens_store_id_idx
  on public.store_preview_tokens (store_id);

create index if not exists store_preview_tokens_expires_at_idx
  on public.store_preview_tokens (expires_at);

create index if not exists store_preview_tokens_active_store_idx
  on public.store_preview_tokens (store_id, expires_at)
  where revoked_at is null;

alter table public.store_preview_tokens enable row level security;

-- Preview-token creation and inspection must stay server-side. Service-role
-- requests bypass RLS; browser anon/authenticated clients receive no privileges.
revoke all on table public.store_preview_tokens from anon, authenticated;
grant all on table public.store_preview_tokens to service_role;

comment on table public.store_preview_tokens is
  'Short-lived bearer tokens for previewing unpublished storefronts. Created by authenticated server routes only.';
