-- Align internal notification auth with current Supabase machine-to-machine guidance
-- and clean up noisy RLS advisor findings without changing storefront behavior.

CREATE OR REPLACE FUNCTION public.handle_order_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
  v_url text;
  v_machine_api_key text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_payload := jsonb_build_object(
      'templateName', 'order-receipt',
      'order_id', NEW.order_number,
      'store_id', NEW.store_id,
      'customer_email', NEW.customer_email,
      'customer_phone', NEW.customer_phone,
      'customer_name', NEW.customer_name,
      'total', NEW.total,
      'status', NEW.status
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('shipped', 'delivered', 'cancelled') THEN
      v_payload := jsonb_build_object(
        'templateName', 'order-' || NEW.status,
        'order_id', NEW.order_number,
        'store_id', NEW.store_id,
        'customer_email', NEW.customer_email,
        'customer_phone', NEW.customer_phone,
        'customer_name', NEW.customer_name,
        'total', NEW.total,
        'status', NEW.status
      );
    END IF;
  END IF;

  IF v_payload IS NULL THEN
    RETURN NEW;
  END IF;

  v_url := current_setting('app.settings.edge_function_url', true);
  v_machine_api_key := current_setting('app.settings.service_role_key', true);

  IF coalesce(v_url, '') <> '' AND coalesce(v_machine_api_key, '') <> '' THEN
    PERFORM net.http_post(
      url := rtrim(v_url, '/') || '/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', v_machine_api_key
      ),
      body := v_payload
    );
  ELSE
    INSERT INTO public.email_events (
      store_id,
      order_id,
      template_name,
      recipient,
      channel,
      status,
      provider,
      error,
      metadata
    )
    VALUES (
      NEW.store_id,
      NEW.order_number,
      v_payload->>'templateName',
      NEW.customer_email,
      'email',
      'failed',
      'supabase-edge',
      'Notification dispatch is not configured',
      jsonb_build_object(
        'source', 'database_trigger',
        'missingEdgeFunctionUrl', coalesce(v_url, '') = '',
        'missingServiceRoleKey', coalesce(v_machine_api_key, '') = ''
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_store_lifecycle_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_owner_email text;
  v_payload jsonb;
  v_store_owner_id uuid;
  v_store_name text;
  v_store_slug text;
  v_url text;
  v_machine_api_key text;
BEGIN
  IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status THEN
    SELECT owner_id, name, slug INTO v_store_owner_id, v_store_name, v_store_slug
    FROM public.stores
    WHERE id = NEW.store_id;

    IF v_store_owner_id IS NOT NULL THEN
      SELECT email INTO v_owner_email
      FROM auth.users
      WHERE id = v_store_owner_id;

      IF v_owner_email IS NOT NULL THEN
        IF NEW.lifecycle_status = 'reminded' THEN
          v_payload := json_build_object(
            'to', v_owner_email,
            'templateName', 'inactivity-warning',
            'storeName', v_store_name,
            'storeSlug', v_store_slug
          );
        ELSIF NEW.lifecycle_status = 'pending_delete' THEN
          v_payload := json_build_object(
            'to', v_owner_email,
            'templateName', 'deletion-notice',
            'storeName', v_store_name,
            'storeSlug', v_store_slug
          );
        END IF;

        IF v_payload IS NOT NULL THEN
          v_url := current_setting('app.settings.edge_function_url', true);
          v_machine_api_key := current_setting('app.settings.service_role_key', true);
          IF coalesce(v_url, '') <> '' AND coalesce(v_machine_api_key, '') <> '' THEN
            PERFORM net.http_post(
              url := rtrim(v_url, '/') || '/send-email',
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'apikey', v_machine_api_key
              ),
              body := v_payload
            );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_store_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_owner_email text;
  v_payload jsonb;
  v_url text;
  v_machine_api_key text;
BEGIN
  IF (OLD.is_published IS FALSE OR OLD.is_published IS NULL) AND NEW.is_published IS TRUE THEN
    SELECT email INTO v_owner_email
    FROM auth.users
    WHERE id = NEW.owner_id;

    IF v_owner_email IS NOT NULL THEN
      v_payload := json_build_object(
        'to', v_owner_email,
        'templateName', 'store-published',
        'storeName', NEW.name,
        'storeSlug', NEW.slug
      );

      v_url := current_setting('app.settings.edge_function_url', true);
      v_machine_api_key := current_setting('app.settings.service_role_key', true);
      IF coalesce(v_url, '') <> '' AND coalesce(v_machine_api_key, '') <> '' THEN
        PERFORM net.http_post(
          url := rtrim(v_url, '/') || '/send-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', v_machine_api_key
          ),
          body := v_payload
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Platform admins can manage CMS features" ON public.cms_features;
CREATE POLICY "Platform admins can manage CMS features"
  ON public.cms_features FOR ALL
  TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

DROP POLICY IF EXISTS "Platform admins can manage CMS plan features" ON public.cms_plan_features;
CREATE POLICY "Platform admins can manage CMS plan features"
  ON public.cms_plan_features FOR ALL
  TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

-- invite_codes was removed from the canonical schema before this hardening
-- migration. Do not reference a relation that does not exist on a clean reset.

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Public can view published store products" ON public.products;
DROP POLICY IF EXISTS "Public can view store products" ON public.products;
CREATE POLICY "Public and store managers can view store products"
  ON public.products FOR SELECT
  TO public
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = products.store_id
        AND (
          stores.is_published = true
          OR public.can_manage_store(stores.id, (SELECT auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS "Public can view published store categories" ON public.product_categories;
DROP POLICY IF EXISTS "Public can view store categories" ON public.product_categories;
CREATE POLICY "Public and store managers can view store categories"
  ON public.product_categories FOR SELECT
  TO public
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = product_categories.store_id
        AND (
          stores.is_published = true
          OR public.can_manage_store(stores.id, (SELECT auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS "Public can view published store types" ON public.product_types;
DROP POLICY IF EXISTS "Public can view store types" ON public.product_types;
CREATE POLICY "Public and store managers can view store types"
  ON public.product_types FOR SELECT
  TO public
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = product_types.store_id
        AND (
          stores.is_published = true
          OR public.can_manage_store(stores.id, (SELECT auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS "Public can view active published store coupons" ON public.coupon_codes;
DROP POLICY IF EXISTS "Public can view active store coupons" ON public.coupon_codes;
CREATE POLICY "Public and store managers can view active store coupons"
  ON public.coupon_codes FOR SELECT
  TO public
  USING (
    is_active = true
    AND store_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = coupon_codes.store_id
        AND (
          stores.is_published = true
          OR public.can_manage_store(stores.id, (SELECT auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS "Public can view approved published store reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Public can view approved store reviews" ON public.product_reviews;
CREATE POLICY "Public and store managers can view approved store reviews"
  ON public.product_reviews FOR SELECT
  TO public
  USING (
    status = 'approved'
    AND store_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = product_reviews.store_id
        AND (
          stores.is_published = true
          OR public.can_manage_store(stores.id, (SELECT auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS "Public can view published store product QAs" ON public.product_qa;
DROP POLICY IF EXISTS "Public can view store product QAs" ON public.product_qa;
CREATE POLICY "Public and store managers can view store product QAs"
  ON public.product_qa FOR SELECT
  TO public
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = product_qa.store_id
        AND (
          stores.is_published = true
          OR public.can_manage_store(stores.id, (SELECT auth.uid()))
        )
    )
  );
