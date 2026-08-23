-- Customer-submitted return requests must not create concurrent duplicate cases
-- for the same order. Closed/rejected cases do not block a later request.
create unique index if not exists idx_store_return_requests_one_open_per_order
  on public.store_return_requests(order_id)
  where status in ('requested', 'approved', 'received', 'refunded');
