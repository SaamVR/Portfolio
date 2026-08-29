begin;

alter table public.order_shipments
  add column if not exists booking_request_id text,
  add column if not exists booking_attempt_token uuid,
  add column if not exists booking_started_at timestamptz,
  add column if not exists booking_error text;

alter table public.order_shipments
  drop constraint if exists order_shipments_status_check;

alter table public.order_shipments
  add constraint order_shipments_status_check
  check (status in (
    'pending', 'prepared', 'booking', 'booked', 'picked_up', 'in_transit',
    'delivered', 'failed', 'reconciliation_required', 'returned', 'cancelled'
  ));

create unique index if not exists order_shipments_booking_request_idx
  on public.order_shipments (store_id, booking_request_id)
  where booking_request_id is not null;

create unique index if not exists order_shipments_one_connection_booking_idx
  on public.order_shipments (store_id, order_id, courier_connection_id)
  where courier_connection_id is not null;

create or replace function public.claim_courier_booking(
  p_store_id uuid,
  p_order_id uuid,
  p_connection_id uuid,
  p_provider text,
  p_booking_request_id text,
  p_actor_id uuid,
  p_now timestamptz default now()
)
returns table(
  shipment_id uuid,
  status text,
  claimed boolean,
  attempt_token uuid,
  tracking_number text,
  consignment_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.order_shipments%rowtype;
  v_attempt uuid := gen_random_uuid();
begin
  if p_store_id is null or p_order_id is null or p_connection_id is null
     or coalesce(btrim(p_provider), '') = ''
     or coalesce(btrim(p_booking_request_id), '') = '' then
    raise exception 'Invalid courier booking claim' using errcode = '22023';
  end if;

  select * into v_row
  from public.order_shipments
  where store_id = p_store_id
    and order_id = p_order_id
    and courier_connection_id = p_connection_id
  for update;

  if found then
    return query select v_row.id, v_row.status, false, v_row.booking_attempt_token, v_row.tracking_number, v_row.consignment_id;
    return;
  end if;

  begin
    insert into public.order_shipments (
      order_id, store_id, courier_connection_id, provider, status,
      booking_request_id, booking_attempt_token, booking_started_at,
      created_by, created_at, updated_at
    ) values (
      p_order_id, p_store_id, p_connection_id, btrim(p_provider), 'booking',
      btrim(p_booking_request_id), v_attempt, p_now, p_actor_id, p_now, p_now
    ) returning * into v_row;
  exception when unique_violation then
    select * into v_row
    from public.order_shipments
    where store_id = p_store_id
      and order_id = p_order_id
      and courier_connection_id = p_connection_id;
    return query select v_row.id, v_row.status, false, v_row.booking_attempt_token, v_row.tracking_number, v_row.consignment_id;
    return;
  end;

  return query select v_row.id, v_row.status, true, v_attempt, v_row.tracking_number, v_row.consignment_id;
end;
$$;

create or replace function public.finalize_courier_booking(
  p_shipment_id uuid,
  p_attempt_token uuid,
  p_tracking_number text,
  p_consignment_id text,
  p_recipient_name text,
  p_recipient_phone text,
  p_destination_city text,
  p_destination_address text,
  p_cash_collection_amount numeric,
  p_shipping_fee numeric,
  p_booking_payload jsonb,
  p_provider_payload jsonb,
  p_now timestamptz default now()
)
returns public.order_shipments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.order_shipments%rowtype;
begin
  update public.order_shipments
  set status = 'booked',
      tracking_number = p_tracking_number,
      consignment_id = p_consignment_id,
      recipient_name = p_recipient_name,
      recipient_phone = p_recipient_phone,
      destination_city = p_destination_city,
      destination_address = p_destination_address,
      cash_collection_amount = coalesce(p_cash_collection_amount, 0),
      shipping_fee = coalesce(p_shipping_fee, 0),
      booking_payload = coalesce(p_booking_payload, '{}'::jsonb),
      latest_provider_payload = coalesce(p_provider_payload, '{}'::jsonb),
      booked_at = p_now,
      booking_error = null,
      updated_at = p_now
  where id = p_shipment_id
    and status = 'booking'
    and booking_attempt_token = p_attempt_token
  returning * into v_row;

  if not found then
    raise exception 'Courier booking claim is stale or no longer bookable' using errcode = '40001';
  end if;

  return v_row;
end;
$$;

create or replace function public.fail_courier_booking(
  p_shipment_id uuid,
  p_attempt_token uuid,
  p_error text,
  p_reconciliation_required boolean default false,
  p_now timestamptz default now()
)
returns public.order_shipments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.order_shipments%rowtype;
begin
  update public.order_shipments
  set status = case when p_reconciliation_required then 'reconciliation_required' else 'failed' end,
      booking_error = left(coalesce(p_error, 'Courier booking failed'), 1000),
      updated_at = p_now
  where id = p_shipment_id
    and status = 'booking'
    and booking_attempt_token = p_attempt_token
  returning * into v_row;

  if not found then
    raise exception 'Courier booking claim is stale or no longer active' using errcode = '40001';
  end if;

  return v_row;
end;
$$;

revoke all on function public.claim_courier_booking(uuid, uuid, uuid, text, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.finalize_courier_booking(uuid, uuid, text, text, text, text, text, text, numeric, numeric, jsonb, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.fail_courier_booking(uuid, uuid, text, boolean, timestamptz) from public, anon, authenticated;

grant execute on function public.claim_courier_booking(uuid, uuid, uuid, text, text, uuid, timestamptz) to service_role;
grant execute on function public.finalize_courier_booking(uuid, uuid, text, text, text, text, text, text, numeric, numeric, jsonb, jsonb, timestamptz) to service_role;
grant execute on function public.fail_courier_booking(uuid, uuid, text, boolean, timestamptz) to service_role;

commit;
