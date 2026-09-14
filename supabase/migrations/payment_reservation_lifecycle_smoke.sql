-- Transactional post-migration smoke for #317/#327. Safe for staging: always rolls back fixtures.
-- Run only after 20260914203000_payment_reservation_lifecycle_317_327.sql is applied.
BEGIN;

DO $$
DECLARE
  _store uuid := gen_random_uuid();
  _product uuid;
  _coupon uuid;
  _order record;
  _order2 record;
  _replay record;
  _prepare record;
  _prepare2 record;
  _release record;
  _claim record;
  _claim2 record;
  _finalize record;
  _finalize2 record;
  _stock integer;
  _uses integer;
  _available boolean;
  _status text;
  _reservation text;
  _attempt_state text;
  _blocked boolean;
  _slug text := 'payment-lifecycle-smoke-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  _coupon_code text;
BEGIN
  INSERT INTO public.stores (id, name, slug, is_published)
  VALUES (_store, 'Payment lifecycle smoke', _slug, false);

  -- 1) Abandoned redirect reservation: replay is idempotent, expiry restores final item + coupon exactly once.
  _product := gen_random_uuid();
  _coupon := gen_random_uuid();
  _coupon_code := 'SMOKE-' || upper(substr(replace(_coupon::text, '-', ''), 1, 12));
  INSERT INTO public.products (id, store_id, name, price, image_url, stock, is_available)
  VALUES (_product, _store, 'Expiry product', 1000, 'https://example.invalid/product.png', 1, true);
  INSERT INTO public.coupon_codes (id, store_id, code, discount_type, discount_value, max_uses, uses_count)
  VALUES (_coupon, _store, _coupon_code, 'percentage', 10, 1, 0);

  SELECT * INTO _order
  FROM public.create_store_order_with_payment_lifecycle(
    _store, 'smoke-expiry', NULL,
    jsonb_build_array(jsonb_build_object('productId', _product::text, 'size', 'M', 'quantity', 1)),
    0, 100, 'Smoke Buyer', '01700000000', NULL, 'Smoke Road', 'Dhaka', 'bkash', 'smoke expiry', _coupon_code
  );
  IF _order.replayed OR _order.reservation_state <> 'reserved' OR _order.reservation_expires_at IS NULL THEN
    RAISE EXCEPTION 'fresh bKash order did not establish a finite reservation';
  END IF;

  SELECT stock, is_available INTO _stock, _available FROM public.products WHERE id = _product;
  SELECT uses_count INTO _uses FROM public.coupon_codes WHERE id = _coupon;
  IF _stock <> 0 OR _available IS DISTINCT FROM false OR _uses <> 1 THEN
    RAISE EXCEPTION 'reservation did not consume final-item stock/coupon capacity';
  END IF;

  SELECT * INTO _replay
  FROM public.create_store_order_with_payment_lifecycle(
    _store, 'smoke-expiry', NULL,
    jsonb_build_array(jsonb_build_object('productId', _product::text, 'size', 'M', 'quantity', 1)),
    0, 100, 'Smoke Buyer', '01700000000', NULL, 'Smoke Road', 'Dhaka', 'bkash', 'smoke expiry', _coupon_code
  );
  SELECT stock INTO _stock FROM public.products WHERE id = _product;
  SELECT uses_count INTO _uses FROM public.coupon_codes WHERE id = _coupon;
  IF NOT _replay.replayed OR _replay.id <> _order.id OR _stock <> 0 OR _uses <> 1 THEN
    RAISE EXCEPTION 'same checkout retry double-reserved stock/coupon';
  END IF;

  UPDATE public.orders SET reservation_expires_at = now() - interval '1 second' WHERE id = _order.id;
  PERFORM public.expire_storefront_payment_reservations();
  SELECT status, reservation_state INTO _status, _reservation FROM public.orders WHERE id = _order.id;
  SELECT stock, is_available INTO _stock, _available FROM public.products WHERE id = _product;
  SELECT uses_count INTO _uses FROM public.coupon_codes WHERE id = _coupon;
  IF _status <> 'cancelled' OR _reservation <> 'released' OR _stock <> 1 OR _available IS DISTINCT FROM true OR _uses <> 0 THEN
    RAISE EXCEPTION 'expiry did not atomically restore stock/coupon capacity';
  END IF;

  PERFORM public.expire_storefront_payment_reservations();
  SELECT stock INTO _stock FROM public.products WHERE id = _product;
  SELECT uses_count INTO _uses FROM public.coupon_codes WHERE id = _coupon;
  IF _stock <> 1 OR _uses <> 0 THEN
    RAISE EXCEPTION 'repeat expiry restored resources more than once';
  END IF;

  -- 2) Provider cancellation: exact bound session releases; late callback cannot execute.
  _product := gen_random_uuid();
  _coupon := gen_random_uuid();
  _coupon_code := 'SMOKE-' || upper(substr(replace(_coupon::text, '-', ''), 1, 12));
  INSERT INTO public.products (id, store_id, name, price, image_url, stock, is_available)
  VALUES (_product, _store, 'Cancel product', 1000, 'https://example.invalid/product.png', 1, true);
  INSERT INTO public.coupon_codes (id, store_id, code, discount_type, discount_value, max_uses, uses_count)
  VALUES (_coupon, _store, _coupon_code, 'percentage', 10, 1, 0);
  SELECT * INTO _order FROM public.create_store_order_with_payment_lifecycle(
    _store, 'smoke-cancel', NULL,
    jsonb_build_array(jsonb_build_object('productId', _product::text, 'size', 'M', 'quantity', 1)),
    0, 100, 'Smoke Buyer', '01700000000', NULL, 'Smoke Road', 'Dhaka', 'bkash', 'smoke cancel', _coupon_code
  );
  SELECT * INTO _prepare FROM public.prepare_storefront_payment_attempt(_store, _order.order_number, 'bkash');
  IF NOT _prepare.claimed THEN RAISE EXCEPTION 'provider-create claim was not acquired'; END IF;
  IF NOT public.bind_storefront_payment_attempt(_prepare.attempt_id, 'PAY-CANCEL', 'https://example.invalid/bkash', '{}'::jsonb) THEN
    RAISE EXCEPTION 'payment session did not bind';
  END IF;
  SELECT * INTO _release FROM public.release_storefront_payment_session(_store, _order.order_number, 'bkash', 'PAY-CANCEL', 'provider_cancelled');
  IF NOT _release.released THEN RAISE EXCEPTION 'provider cancellation did not release reservation'; END IF;
  SELECT * INTO _claim FROM public.claim_storefront_payment_execution(_store, _order.order_number, 'bkash', 'PAY-CANCEL');
  IF _claim.claimed OR _claim.attempt_state <> 'cancelled' THEN
    RAISE EXCEPTION 'late callback could reclaim a cancelled provider session';
  END IF;
  SELECT stock INTO _stock FROM public.products WHERE id = _product;
  SELECT uses_count INTO _uses FROM public.coupon_codes WHERE id = _coupon;
  IF _stock <> 1 OR _uses <> 0 THEN RAISE EXCEPTION 'provider cancellation did not restore resources'; END IF;

  -- Durable release markers prevent a later status transition from restoring again.
  UPDATE public.orders SET status = 'pending' WHERE id = _order.id;
  UPDATE public.orders SET status = 'cancelled' WHERE id = _order.id;
  SELECT stock INTO _stock FROM public.products WHERE id = _product;
  SELECT uses_count INTO _uses FROM public.coupon_codes WHERE id = _coupon;
  IF _stock <> 1 OR _uses <> 0 THEN RAISE EXCEPTION 'released reservation restored resources more than once'; END IF;

  -- 3) One-winner execute claim + second paymentID rejection + final-failure release.
  _product := gen_random_uuid();
  _coupon := gen_random_uuid();
  _coupon_code := 'SMOKE-' || upper(substr(replace(_coupon::text, '-', ''), 1, 12));
  INSERT INTO public.products (id, store_id, name, price, image_url, stock, is_available)
  VALUES (_product, _store, 'Execute product', 1000, 'https://example.invalid/product.png', 1, true);
  INSERT INTO public.coupon_codes (id, store_id, code, discount_type, discount_value, max_uses, uses_count)
  VALUES (_coupon, _store, _coupon_code, 'percentage', 10, 1, 0);
  SELECT * INTO _order FROM public.create_store_order_with_payment_lifecycle(
    _store, 'smoke-execute', NULL,
    jsonb_build_array(jsonb_build_object('productId', _product::text, 'size', 'M', 'quantity', 1)),
    0, 100, 'Smoke Buyer', '01700000000', NULL, 'Smoke Road', 'Dhaka', 'bkash', 'smoke execute', _coupon_code
  );
  SELECT * INTO _prepare FROM public.prepare_storefront_payment_attempt(_store, _order.order_number, 'bkash');
  PERFORM public.bind_storefront_payment_attempt(_prepare.attempt_id, 'PAY-EXECUTE', 'https://example.invalid/bkash', '{}'::jsonb);
  SELECT * INTO _claim FROM public.claim_storefront_payment_execution(_store, _order.order_number, 'bkash', 'PAY-EXECUTE');
  SELECT * INTO _claim2 FROM public.claim_storefront_payment_execution(_store, _order.order_number, 'bkash', 'PAY-EXECUTE');
  IF NOT _claim.claimed OR _claim2.claimed OR _claim2.attempt_state <> 'executing' THEN
    RAISE EXCEPTION 'execute claim did not enforce one winner';
  END IF;
  SELECT * INTO _claim2 FROM public.claim_storefront_payment_execution(_store, _order.order_number, 'bkash', 'PAY-OTHER');
  IF _claim2.claimed OR _claim2.attempt_state <> 'unbound' THEN
    RAISE EXCEPTION 'second paymentID was allowed to execute the same obligation';
  END IF;
  IF NOT public.fail_storefront_payment_execution(_claim.attempt_id, 'provider_final_failure', '{"transactionStatus":"Failed"}'::jsonb) THEN
    RAISE EXCEPTION 'terminal provider failure did not release order';
  END IF;
  SELECT stock INTO _stock FROM public.products WHERE id = _product;
  SELECT uses_count INTO _uses FROM public.coupon_codes WHERE id = _coupon;
  IF _stock <> 1 OR _uses <> 0 THEN RAISE EXCEPTION 'final failure did not restore resources'; END IF;

  -- 4) Uncertain provider outcome is quarantined; reconciliation success is idempotent and consumes reservation.
  _product := gen_random_uuid();
  _coupon := gen_random_uuid();
  _coupon_code := 'SMOKE-' || upper(substr(replace(_coupon::text, '-', ''), 1, 12));
  INSERT INTO public.products (id, store_id, name, price, image_url, stock, is_available)
  VALUES (_product, _store, 'Reconcile product', 1000, 'https://example.invalid/product.png', 1, true);
  INSERT INTO public.coupon_codes (id, store_id, code, discount_type, discount_value, max_uses, uses_count)
  VALUES (_coupon, _store, _coupon_code, 'percentage', 10, 1, 0);
  SELECT * INTO _order FROM public.create_store_order_with_payment_lifecycle(
    _store, 'smoke-reconcile', NULL,
    jsonb_build_array(jsonb_build_object('productId', _product::text, 'size', 'M', 'quantity', 1)),
    0, 100, 'Smoke Buyer', '01700000000', NULL, 'Smoke Road', 'Dhaka', 'bkash', 'smoke reconcile', _coupon_code
  );
  SELECT * INTO _prepare FROM public.prepare_storefront_payment_attempt(_store, _order.order_number, 'bkash');
  PERFORM public.bind_storefront_payment_attempt(_prepare.attempt_id, 'PAY-RECON', 'https://example.invalid/bkash', '{}'::jsonb);
  SELECT * INTO _claim FROM public.claim_storefront_payment_execution(_store, _order.order_number, 'bkash', 'PAY-RECON');

  _blocked := false;
  BEGIN
    UPDATE public.orders SET status = 'cancelled' WHERE id = _order.id;
  EXCEPTION WHEN OTHERS THEN
    _blocked := position('cannot cancel order while payment execution outcome is unresolved' in SQLERRM) > 0;
    IF NOT _blocked THEN RAISE; END IF;
  END;
  IF NOT _blocked THEN RAISE EXCEPTION 'executing provider attempt allowed order cancellation'; END IF;

  PERFORM public.mark_storefront_payment_reconciliation_required(_claim.attempt_id, 'execute_transport_unknown', '{}'::jsonb);

  _blocked := false;
  BEGIN
    UPDATE public.orders SET status = 'cancelled' WHERE id = _order.id;
  EXCEPTION WHEN OTHERS THEN
    _blocked := position('cannot cancel order while payment execution outcome is unresolved' in SQLERRM) > 0;
    IF NOT _blocked THEN RAISE; END IF;
  END;
  IF NOT _blocked THEN RAISE EXCEPTION 'reconciliation-required attempt allowed order cancellation'; END IF;

  PERFORM public.expire_storefront_payment_reservations();
  SELECT status, reservation_state INTO _status, _reservation FROM public.orders WHERE id = _order.id;
  SELECT stock INTO _stock FROM public.products WHERE id = _product;
  SELECT uses_count INTO _uses FROM public.coupon_codes WHERE id = _coupon;
  IF _status <> 'pending' OR _reservation <> 'reconciliation_required' OR _stock <> 0 OR _uses <> 1 THEN
    RAISE EXCEPTION 'uncertain provider outcome was incorrectly released';
  END IF;

  SELECT * INTO _finalize FROM public.finalize_storefront_payment_success(
    _claim.attempt_id, 'PAY-RECON', 'TRX-RECON', '{"transactionStatus":"Completed"}'::jsonb
  );
  SELECT * INTO _finalize2 FROM public.finalize_storefront_payment_success(
    _claim.attempt_id, 'PAY-RECON', 'TRX-RECON', '{"transactionStatus":"Completed"}'::jsonb
  );
  IF NOT _finalize.finalized OR NOT _finalize2.finalized OR _finalize.provider_transaction_id <> 'TRX-RECON' THEN
    RAISE EXCEPTION 'successful reconciliation/duplicate callback was not idempotent';
  END IF;
  SELECT status, reservation_state INTO _status, _reservation FROM public.orders WHERE id = _order.id;
  IF _status <> 'confirmed' OR _reservation <> 'consumed' THEN
    RAISE EXCEPTION 'reconciled provider success did not consume reservation';
  END IF;

  -- 5) Provider identities are global replay barriers, not tenant-local labels.
  _product := gen_random_uuid();
  INSERT INTO public.products (id, store_id, name, price, image_url, stock, is_available)
  VALUES (_product, _store, 'Identity product A', 1000, 'https://example.invalid/product.png', 1, true);
  SELECT * INTO _order FROM public.create_store_order_with_payment_lifecycle(
    _store, 'smoke-identity-a', NULL,
    jsonb_build_array(jsonb_build_object('productId', _product::text, 'size', 'M', 'quantity', 1)),
    0, 0, 'Smoke Buyer', '01700000000', NULL, 'Smoke Road', 'Dhaka', 'bkash', 'identity A', NULL
  );
  SELECT * INTO _prepare FROM public.prepare_storefront_payment_attempt(_store, _order.order_number, 'bkash');
  IF NOT public.bind_storefront_payment_attempt(_prepare.attempt_id, 'PAY-GLOBAL-DUP', 'https://example.invalid/a', '{}'::jsonb) THEN
    RAISE EXCEPTION 'first provider payment identity did not bind';
  END IF;

  _product := gen_random_uuid();
  INSERT INTO public.products (id, store_id, name, price, image_url, stock, is_available)
  VALUES (_product, _store, 'Identity product B', 1000, 'https://example.invalid/product.png', 1, true);
  SELECT * INTO _order2 FROM public.create_store_order_with_payment_lifecycle(
    _store, 'smoke-identity-b', NULL,
    jsonb_build_array(jsonb_build_object('productId', _product::text, 'size', 'M', 'quantity', 1)),
    0, 0, 'Smoke Buyer', '01700000000', NULL, 'Smoke Road', 'Dhaka', 'bkash', 'identity B', NULL
  );
  SELECT * INTO _prepare2 FROM public.prepare_storefront_payment_attempt(_store, _order2.order_number, 'bkash');
  IF public.bind_storefront_payment_attempt(_prepare2.attempt_id, 'PAY-GLOBAL-DUP', 'https://example.invalid/b-duplicate', '{}'::jsonb) THEN
    RAISE EXCEPTION 'duplicate provider payment identity bound to a second obligation';
  END IF;
  SELECT state INTO _attempt_state FROM public.storefront_payment_attempts WHERE id = _prepare2.attempt_id;
  IF _attempt_state <> 'failed' THEN RAISE EXCEPTION 'duplicate provider payment identity was not quarantined'; END IF;

  SELECT * INTO _prepare2 FROM public.prepare_storefront_payment_attempt(_store, _order2.order_number, 'bkash');
  IF NOT _prepare2.claimed THEN RAISE EXCEPTION 'failed duplicate identity did not allow a fresh safe provider session'; END IF;
  IF NOT public.bind_storefront_payment_attempt(_prepare2.attempt_id, 'PAY-GLOBAL-B', 'https://example.invalid/b', '{}'::jsonb) THEN
    RAISE EXCEPTION 'fresh provider payment identity did not bind';
  END IF;
  SELECT * INTO _claim FROM public.claim_storefront_payment_execution(_store, _order.order_number, 'bkash', 'PAY-GLOBAL-DUP');
  SELECT * INTO _claim2 FROM public.claim_storefront_payment_execution(_store, _order2.order_number, 'bkash', 'PAY-GLOBAL-B');
  IF NOT _claim.claimed OR NOT _claim2.claimed THEN RAISE EXCEPTION 'identity replay fixtures did not acquire execute claims'; END IF;

  SELECT * INTO _finalize FROM public.finalize_storefront_payment_success(
    _claim.attempt_id, 'PAY-GLOBAL-DUP', 'TRX-GLOBAL-DUP', '{"transactionStatus":"Completed"}'::jsonb
  );
  SELECT * INTO _finalize2 FROM public.finalize_storefront_payment_success(
    _claim2.attempt_id, 'PAY-GLOBAL-B', 'TRX-GLOBAL-DUP', '{"transactionStatus":"Completed"}'::jsonb
  );
  IF NOT _finalize.finalized OR _finalize2.finalized OR _finalize2.attempt_state <> 'reconciliation_required' THEN
    RAISE EXCEPTION 'duplicate provider transaction identity was not quarantined';
  END IF;
  SELECT status, reservation_state INTO _status, _reservation FROM public.orders WHERE id = _order2.id;
  IF _status <> 'pending' OR _reservation <> 'reconciliation_required' THEN
    RAISE EXCEPTION 'duplicate provider transaction identity changed order settlement truth';
  END IF;

  -- 6) A durable succeeded attempt bars creation of another provider obligation.
  _product := gen_random_uuid();
  INSERT INTO public.products (id, store_id, name, price, image_url, stock, is_available)
  VALUES (_product, _store, 'Succeeded attempt product', 1000, 'https://example.invalid/product.png', 1, true);
  SELECT * INTO _order FROM public.create_store_order_with_payment_lifecycle(
    _store, 'smoke-succeeded-attempt', NULL,
    jsonb_build_array(jsonb_build_object('productId', _product::text, 'size', 'M', 'quantity', 1)),
    0, 0, 'Smoke Buyer', '01700000000', NULL, 'Smoke Road', 'Dhaka', 'bkash', 'succeeded attempt', NULL
  );
  SELECT * INTO _prepare FROM public.prepare_storefront_payment_attempt(_store, _order.order_number, 'bkash');
  UPDATE public.storefront_payment_attempts SET state = 'succeeded' WHERE id = _prepare.attempt_id;
  _blocked := false;
  BEGIN
    PERFORM public.prepare_storefront_payment_attempt(_store, _order.order_number, 'bkash');
  EXCEPTION WHEN OTHERS THEN
    _blocked := position('payment obligation already succeeded' in SQLERRM) > 0;
    IF NOT _blocked THEN RAISE; END IF;
  END;
  IF NOT _blocked THEN RAISE EXCEPTION 'succeeded payment attempt allowed a second provider attempt'; END IF;

  -- 7) COD is accepted immediately and is outside redirect auto-expiry semantics.
  _product := gen_random_uuid();
  INSERT INTO public.products (id, store_id, name, price, image_url, stock, is_available)
  VALUES (_product, _store, 'COD product', 1000, 'https://example.invalid/product.png', 1, true);
  SELECT * INTO _order FROM public.create_store_order_with_payment_lifecycle(
    _store, 'smoke-cod', NULL,
    jsonb_build_array(jsonb_build_object('productId', _product::text, 'size', 'M', 'quantity', 1)),
    0, 0, 'Smoke Buyer', '01700000000', NULL, 'Smoke Road', 'Dhaka', 'cod', 'smoke cod', NULL
  );
  IF _order.reservation_state <> 'accepted' OR _order.reservation_expires_at IS NOT NULL THEN
    RAISE EXCEPTION 'COD was incorrectly given redirect-payment expiry semantics';
  END IF;
END $$;

ROLLBACK;
