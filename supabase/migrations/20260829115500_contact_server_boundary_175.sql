-- #175 completion: move public contact submission behind the server-authoritative route.
-- The earlier trigger was a safe transitional write-boundary guard while the browser still wrote directly.

-- Browser roles must not be able to bypass server validation/rate limiting with direct PostgREST inserts.
drop policy if exists "Anyone can create store contact messages" on public.contact_messages;
revoke insert on table public.contact_messages from anon, authenticated;

-- The server route owns rate limiting after this migration. Remove the transitional trigger so
-- a service-role insert does not consume the same logical contact attempt twice.
drop trigger if exists enforce_contact_message_rate_limit_trigger on public.contact_messages;
drop function if exists public.enforce_contact_message_rate_limit();

-- Retire the browser-facing legacy COUNT(*) preflight RPC. Service role may retain EXECUTE for
-- compatibility/inspection, but public browser roles can no longer use it as an authoritative gate.
revoke execute on function public.check_contact_rate_limit(text) from public, anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'contact_messages'
      and cmd = 'INSERT'
      and ('public' = any(roles) or 'anon' = any(roles) or 'authenticated' = any(roles))
  ) then
    raise exception 'Public contact_messages INSERT policy still exists';
  end if;

  if has_table_privilege('anon', 'public.contact_messages', 'INSERT')
     or has_table_privilege('authenticated', 'public.contact_messages', 'INSERT') then
    raise exception 'Browser role still has direct contact_messages INSERT privilege';
  end if;
end
$$;

comment on table public.contact_messages is
  'Store contact inquiries. Public submissions are accepted only through the server-authoritative contact API.';
