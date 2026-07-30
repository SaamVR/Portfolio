create or replace function public.scrub_payment_setting_secrets()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.key = 'payment_settings' then
    new.value := (
      coalesce(new.value, '{}'::jsonb)
      - 'bkash_app_key'
      - 'bkash_app_secret'
      - 'bkash_username'
      - 'bkash_password'
      - 'bkash_is_live'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists scrub_payment_setting_secrets_trigger on public.site_settings;

create trigger scrub_payment_setting_secrets_trigger
  before insert or update on public.site_settings
  for each row
  execute function public.scrub_payment_setting_secrets();
