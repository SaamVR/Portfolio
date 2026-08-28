-- Prevent stale multi-store UI state from pairing an order with another store.
-- orders(id, store_id) is already unique from the product-review tenant hardening migration.

ALTER TABLE public.store_return_requests
  ADD CONSTRAINT store_return_requests_order_store_fkey
  FOREIGN KEY (order_id, store_id)
  REFERENCES public.orders(id, store_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.store_return_requests
  VALIDATE CONSTRAINT store_return_requests_order_store_fkey;

ALTER TABLE public.store_cod_reconciliation_entries
  ADD CONSTRAINT store_cod_reconciliation_entries_order_store_fkey
  FOREIGN KEY (order_id, store_id)
  REFERENCES public.orders(id, store_id)
  ON DELETE SET NULL (order_id)
  NOT VALID;

ALTER TABLE public.store_cod_reconciliation_entries
  VALIDATE CONSTRAINT store_cod_reconciliation_entries_order_store_fkey;
