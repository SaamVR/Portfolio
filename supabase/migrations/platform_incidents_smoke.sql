-- Rollback-only smoke for the centralized operator incident store.
begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not condition then raise exception '%', message; end if;
end;
$$;

create or replace function pg_temp.assert_authenticated_cannot_read_incidents()
returns void language plpgsql as $$
begin
  begin
    perform 1 from public.platform_incidents limit 1;
    raise exception 'authenticated role unexpectedly read platform_incidents';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

set local role service_role;

select public.record_platform_incident(
  'smoke.billing.timeout',
  'warning',
  'billing',
  'Smoke billing timeout',
  'first occurrence',
  '/api/billing/test',
  null,
  'request-1',
  '{"attempt":1}'::jsonb
);

select public.record_platform_incident(
  'smoke.billing.timeout',
  'critical',
  'billing',
  'Smoke billing timeout',
  'second occurrence',
  '/api/billing/test',
  null,
  'request-2',
  '{"attempt":2}'::jsonb
);

select pg_temp.assert_true(
  (select count(*) from public.platform_incidents where fingerprint = 'smoke.billing.timeout') = 1,
  'incident fingerprint must deduplicate into one row'
);
select pg_temp.assert_true(
  (select occurrence_count from public.platform_incidents where fingerprint = 'smoke.billing.timeout') = 2,
  'deduplicated incident must increment occurrence_count'
);
select pg_temp.assert_true(
  (select severity from public.platform_incidents where fingerprint = 'smoke.billing.timeout') = 'critical',
  'latest incident severity must be retained'
);

update public.platform_incidents
set status = 'resolved', resolved_at = now()
where fingerprint = 'smoke.billing.timeout';

select public.record_platform_incident(
  'smoke.billing.timeout',
  'warning',
  'billing',
  'Smoke billing timeout',
  'third occurrence after resolution',
  '/api/billing/test',
  null,
  'request-3',
  '{}'::jsonb
);

select pg_temp.assert_true(
  (select status from public.platform_incidents where fingerprint = 'smoke.billing.timeout') = 'open',
  'new recurrence must reopen a resolved incident'
);
select pg_temp.assert_true(
  (select occurrence_count from public.platform_incidents where fingerprint = 'smoke.billing.timeout') = 3,
  'recurrence after resolution must keep incrementing occurrence_count'
);

reset role;
set local role authenticated;
select pg_temp.assert_authenticated_cannot_read_incidents();

rollback;
