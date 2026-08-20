-- Provider integrations are code plugins. The database should validate the
-- provider identifier shape, not enumerate provider brands. This lets a new
-- reviewed adapter be installed without another schema migration.

ALTER TABLE IF EXISTS public.store_payment_connections_secure
  DROP CONSTRAINT IF EXISTS store_payment_connections_secure_provider_check;
ALTER TABLE IF EXISTS public.store_payment_connections_secure
  ADD CONSTRAINT store_payment_connections_secure_provider_check
  CHECK (provider ~ '^[a-z][a-z0-9_-]{0,63}$');

ALTER TABLE IF EXISTS public.platform_payment_connections_secure
  DROP CONSTRAINT IF EXISTS platform_payment_connections_secure_provider_check;
ALTER TABLE IF EXISTS public.platform_payment_connections_secure
  ADD CONSTRAINT platform_payment_connections_secure_provider_check
  CHECK (provider ~ '^[a-z][a-z0-9_-]{0,63}$');

ALTER TABLE IF EXISTS public.store_courier_connections
  DROP CONSTRAINT IF EXISTS store_courier_connections_provider_check;
ALTER TABLE IF EXISTS public.store_courier_connections
  ADD CONSTRAINT store_courier_connections_provider_check
  CHECK (provider ~ '^[a-z][a-z0-9_-]{0,63}$');

ALTER TABLE IF EXISTS public.store_courier_credentials_secure
  DROP CONSTRAINT IF EXISTS store_courier_credentials_secure_provider_check;
ALTER TABLE IF EXISTS public.store_courier_credentials_secure
  ADD CONSTRAINT store_courier_credentials_secure_provider_check
  CHECK (provider ~ '^[a-z][a-z0-9_-]{0,63}$');

ALTER TABLE IF EXISTS public.order_shipments
  DROP CONSTRAINT IF EXISTS order_shipments_provider_check;
ALTER TABLE IF EXISTS public.order_shipments
  ADD CONSTRAINT order_shipments_provider_check
  CHECK (provider ~ '^[a-z][a-z0-9_-]{0,63}$');
