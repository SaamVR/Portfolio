begin;

update public.store_payment_connections_secure
set status = 'configured'
where status = 'connected';

update public.platform_payment_connections_secure
set status = 'configured'
where status = 'connected';

update public.store_courier_connections
set status = 'configured'
where status = 'connected';

alter table public.store_payment_connections_secure
  drop constraint if exists store_payment_connections_secure_status_check;

alter table public.store_payment_connections_secure
  add constraint store_payment_connections_secure_status_check
    check (status in ('draft', 'configured', 'revoked'));

alter table public.platform_payment_connections_secure
  drop constraint if exists platform_payment_connections_secure_status_check;

alter table public.platform_payment_connections_secure
  add constraint platform_payment_connections_secure_status_check
    check (status in ('draft', 'configured', 'revoked'));

alter table public.store_courier_connections
  drop constraint if exists store_courier_connections_status_check;

alter table public.store_courier_connections
  add constraint store_courier_connections_status_check
    check (status in ('draft', 'configured', 'disabled'));

commit;
