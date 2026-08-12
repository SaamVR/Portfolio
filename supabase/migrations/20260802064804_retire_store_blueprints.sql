create schema if not exists app_archive;
do $$
begin
  if to_regclass('public.store_blueprints') is not null then
    execute $archive$
      create table if not exists app_archive.store_blueprints_retired as
      select
        now()::timestamptz as retired_at,
        store_blueprints.*
      from public.store_blueprints
      where false
    $archive$;

    execute $archive$
      insert into app_archive.store_blueprints_retired
      select
        now()::timestamptz as retired_at,
        store_blueprints.*
      from public.store_blueprints
    $archive$;
  end if;
end $$;
drop table if exists public.store_blueprints cascade;
