-- #175: make contact-message throttling authoritative at the database write boundary.
-- The storefront's existing preflight check remains UX-only; this trigger is the security control.

create or replace function public.enforce_contact_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  forwarded text;
  client_identity text;
  ip_allowed boolean;
  email_allowed boolean;
begin
  new.name := btrim(new.name);
  new.email := lower(btrim(new.email));
  new.message := btrim(new.message);

  if new.store_id is null then
    raise exception 'Contact message store is required' using errcode = '23514';
  end if;

  if length(new.name) < 1 or length(new.name) > 100
     or length(new.email) > 255
     or new.email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or length(new.message) < 10 or length(new.message) > 2000 then
    raise exception 'Invalid contact message' using errcode = '22023';
  end if;

  perform 1 from public.stores s where s.id = new.store_id and s.is_published = true;
  if not found then
    raise exception 'Published store not found' using errcode = '23503';
  end if;

  forwarded := coalesce(
    headers ->> 'x-vercel-forwarded-for',
    headers ->> 'x-forwarded-for',
    headers ->> 'x-real-ip',
    ''
  );
  client_identity := nullif(btrim(split_part(forwarded, ',', 1)), '');

  -- Missing forwarding metadata fails to the normalized email instead of disabling throttling.
  client_identity := coalesce(client_identity, 'email:' || new.email);

  select allowed into ip_allowed
  from public.check_request_rate_limit(
    'contact:client:' || new.store_id::text || ':' || md5(client_identity),
    3600000,
    12
  );

  select allowed into email_allowed
  from public.check_request_rate_limit(
    'contact:email:' || new.store_id::text || ':' || md5(new.email),
    3600000,
    5
  );

  if not coalesce(ip_allowed, false) or not coalesce(email_allowed, false) then
    raise exception 'Contact message rate limit exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_contact_message_rate_limit() from public, anon, authenticated;
grant execute on function public.enforce_contact_message_rate_limit() to service_role;

drop trigger if exists enforce_contact_message_rate_limit_trigger on public.contact_messages;
create trigger enforce_contact_message_rate_limit_trigger
before insert on public.contact_messages
for each row execute function public.enforce_contact_message_rate_limit();

comment on function public.enforce_contact_message_rate_limit() is
  'Authoritative contact-message validation and atomic per-store client/email throttling for #175.';
