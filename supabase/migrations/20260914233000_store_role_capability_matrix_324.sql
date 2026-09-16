-- P1 #324: preserve distinct merchant owner/admin/editor/viewer capabilities.
--
-- Canonical launch matrix:
--   owner/admin: tenant administration, integrations, finance/reconciliation,
--                team authority, business identity/settings and publication.
--   editor:      content/catalog/marketing plus day-to-day fulfillment/moderation.
--   viewer:      read-only operational/catalog/reporting data where explicitly granted.
--
-- `can_manage_store` remains the legacy editor-capable content/commerce predicate.
-- Sensitive authority below uses `can_administer_store`; read-only team surfaces use
-- `can_view_store` where appropriate.

CREATE OR REPLACE FUNCTION public.can_administer_store(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _user_id = (SELECT auth.uid())
    AND (
      public.is_store_admin(_store_id, _user_id)
      OR public.has_role(_user_id, 'admin'::public.app_role)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_store(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _user_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1
        FROM public.stores
        WHERE id = _store_id
          AND owner_id = _user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.store_memberships
        WHERE store_id = _store_id
          AND user_id = _user_id
          AND role IN ('owner', 'admin', 'editor', 'viewer')
      )
      OR public.has_role(_user_id, 'admin'::public.app_role)
    );
$$;

REVOKE ALL ON FUNCTION public.can_administer_store(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_store(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_administer_store(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_store(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.can_administer_store(uuid, uuid) IS
  'Owner/admin tenant administration capability. Editors and viewers are denied.';
COMMENT ON FUNCTION public.can_view_store(uuid, uuid) IS
  'Read-only tenant membership capability for owner/admin/editor/viewer plus platform admin.';
COMMENT ON FUNCTION public.can_manage_store(uuid, uuid) IS
  'Legacy content/commerce editing capability for owner/admin/editor. Do not use for sensitive tenant administration.';

-- Viewers can resolve their own unpublished store row without inheriting mutation authority.
DROP POLICY IF EXISTS "Anyone can view published stores" ON public.stores;
CREATE POLICY "Anyone can view published stores"
  ON public.stores FOR SELECT
  TO public
  USING (
    is_published = true
    OR public.can_view_store(id, auth.uid())
  );

-- Direct membership mutation bypasses invite-seat and role-grant authority (#323/#325).
-- Keep browser reads needed by Team Access, but move all membership writes behind
-- service-role governed claim/admin paths.
DROP POLICY IF EXISTS "Store owners can insert memberships" ON public.store_memberships;
DROP POLICY IF EXISTS "Store owners can update memberships" ON public.store_memberships;
DROP POLICY IF EXISTS "Store owners can delete memberships" ON public.store_memberships;
DROP POLICY IF EXISTS "Store members can view memberships" ON public.store_memberships;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.store_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_memberships TO service_role;

CREATE POLICY "Store members can view memberships"
  ON public.store_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_administer_store(store_id, auth.uid())
  );

-- Invite history/identity is administrative. A claimant may still see their own claimed row.
DROP POLICY IF EXISTS "Store staff can view invites" ON public.store_staff_invites;
CREATE POLICY "Store staff can view invites"
  ON public.store_staff_invites FOR SELECT
  TO authenticated
  USING (
    public.can_administer_store(store_id, auth.uid())
    OR claimed_by = auth.uid()
  );

-- Site settings mix content and authority-bearing configuration. Admins may manage
-- all keys; editors are limited to presentation/content keys. Payment, delivery,
-- storefront profile, support integrations, onboarding and system seed metadata
-- therefore remain admin/server-only.
DROP POLICY IF EXISTS "Store managers can manage site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Store staff can manage site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Store admins can manage site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Store editors can manage content site settings" ON public.site_settings;

CREATE POLICY "Store admins can manage site settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()))
  WITH CHECK (public.can_administer_store(store_id, auth.uid()));

CREATE POLICY "Store editors can manage content site settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (
    public.can_manage_store(store_id, auth.uid())
    AND key = ANY (ARRAY[
      'about_page',
      'announcement_bar',
      'blog',
      'brand_settings',
      'categories_custom_data',
      'contact_page',
      'countdown_timer',
      'exit_intent',
      'fallback_category_image_url',
      'fallback_product_image_url',
      'faq_entries',
      'footer',
      'hero_section',
      'home_categories',
      'home_featured',
      'homepage_section_visibility',
      'logo_url',
      'media_library',
      'navigation',
      'promo_banner',
      'theme_customization',
      'upsells'
    ]::text[])
  )
  WITH CHECK (
    public.can_manage_store(store_id, auth.uid())
    AND key = ANY (ARRAY[
      'about_page',
      'announcement_bar',
      'blog',
      'brand_settings',
      'categories_custom_data',
      'contact_page',
      'countdown_timer',
      'exit_intent',
      'fallback_category_image_url',
      'fallback_product_image_url',
      'faq_entries',
      'footer',
      'hero_section',
      'home_categories',
      'home_featured',
      'homepage_section_visibility',
      'logo_url',
      'media_library',
      'navigation',
      'promo_banner',
      'theme_customization',
      'upsells'
    ]::text[])
  );

-- Store identity and domains are owner/admin authority.
DROP POLICY IF EXISTS "Store owners can manage business profiles" ON public.store_business_profiles;
DROP POLICY IF EXISTS "Store owners can read business profiles" ON public.store_business_profiles;
CREATE POLICY "Store admins can manage business profiles"
  ON public.store_business_profiles FOR ALL
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()))
  WITH CHECK (public.can_administer_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store managers can manage store domains" ON public.store_domains;
DROP POLICY IF EXISTS "Store managers can view store domains" ON public.store_domains;
CREATE POLICY "Store admins can manage store domains"
  ON public.store_domains FOR ALL
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()))
  WITH CHECK (public.can_administer_store(store_id, auth.uid()));

-- Courier credential/configuration authority is admin-only. Editors may still book
-- and update individual shipments through the operational shipment contract below.
DROP POLICY IF EXISTS "Store managers can create courier connections" ON public.store_courier_connections;
DROP POLICY IF EXISTS "Store managers can update courier connections" ON public.store_courier_connections;
DROP POLICY IF EXISTS "Store managers can view courier connections" ON public.store_courier_connections;
CREATE POLICY "Store admins can view courier connections"
  ON public.store_courier_connections FOR SELECT
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()));
CREATE POLICY "Store admins can create courier connections"
  ON public.store_courier_connections FOR INSERT
  TO authenticated
  WITH CHECK (public.can_administer_store(store_id, auth.uid()));
CREATE POLICY "Store admins can update courier connections"
  ON public.store_courier_connections FOR UPDATE
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()))
  WITH CHECK (public.can_administer_store(store_id, auth.uid()));

-- Billing mutation authority is already server-only under #308. Narrow its remaining
-- merchant read policy to owner/admin without restoring any browser write grant.
DROP POLICY IF EXISTS "Store managers can create invoices" ON public.store_invoices;
DROP POLICY IF EXISTS "Store managers can update invoices" ON public.store_invoices;
DROP POLICY IF EXISTS "Store managers can view invoices" ON public.store_invoices;
CREATE POLICY "Store admins can view invoices"
  ON public.store_invoices FOR SELECT
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store members can view subscriptions" ON public.store_subscriptions;
CREATE POLICY "Store admins can view subscriptions"
  ON public.store_subscriptions FOR SELECT
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()));

-- Finance/reconciliation/refund truth is owner/admin authority.
DROP POLICY IF EXISTS "Store staff can manage cod reconciliation entries" ON public.store_cod_reconciliation_entries;
DROP POLICY IF EXISTS "Store staff can view cod reconciliation entries" ON public.store_cod_reconciliation_entries;
CREATE POLICY "Store admins can manage cod reconciliation entries"
  ON public.store_cod_reconciliation_entries FOR ALL
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()))
  WITH CHECK (public.can_administer_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store staff can manage return requests" ON public.store_return_requests;
DROP POLICY IF EXISTS "Store staff can view return requests" ON public.store_return_requests;
CREATE POLICY "Store admins can manage return requests"
  ON public.store_return_requests FOR ALL
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()))
  WITH CHECK (public.can_administer_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store staff can view revenue events" ON public.store_revenue_events;
CREATE POLICY "Store admins can view revenue events"
  ON public.store_revenue_events FOR SELECT
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store managers can view email events" ON public.email_events;
CREATE POLICY "Store admins can view email events"
  ON public.email_events FOR SELECT
  TO authenticated
  USING (store_id IS NOT NULL AND public.can_administer_store(store_id, auth.uid()));

-- Backups and feature overrides can expose/alter sensitive store configuration.
DROP POLICY IF EXISTS "Store managers can create backup events" ON public.store_backup_events;
DROP POLICY IF EXISTS "Store managers can view backup events" ON public.store_backup_events;
CREATE POLICY "Store admins can create backup events"
  ON public.store_backup_events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_administer_store(store_id, auth.uid())
    AND lifecycle_managed = false
    AND status = 'succeeded'
    AND request_digest IS NULL
    AND target_state_digest IS NULL
    AND attempt_token IS NULL
    AND attempt_started_at IS NULL
  );
CREATE POLICY "Store admins can view backup events"
  ON public.store_backup_events FOR SELECT
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store admins can view store feature overrides" ON public.store_feature_overrides;
CREATE POLICY "Store admins can view store feature overrides"
  ON public.store_feature_overrides FOR SELECT
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()));

-- Editors can build drafts/content, but publishing a release is administrative.
DROP POLICY IF EXISTS "Store managers can create storefront releases" ON public.storefront_releases;
DROP POLICY IF EXISTS "Store managers can read storefront releases" ON public.storefront_releases;
CREATE POLICY "Store admins can create storefront releases"
  ON public.storefront_releases FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_administer_store(store_id, auth.uid())
    AND published_by = auth.uid()
  );
CREATE POLICY "Store admins can read storefront releases"
  ON public.storefront_releases FOR SELECT
  TO authenticated
  USING (public.can_administer_store(store_id, auth.uid()));

-- Private reusable theme-package mutation is configuration authority; editors may
-- continue to read/apply packages through existing read policies.
DROP POLICY IF EXISTS "Admins can manage shared theme packages" ON public.theme_packages;
CREATE POLICY "Admins can manage shared theme packages"
  ON public.theme_packages FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      source_type = 'merchant_private'
      AND owner_store_id IS NOT NULL
      AND public.can_administer_store(owner_store_id, auth.uid())
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      source_type = 'merchant_private'
      AND owner_store_id IS NOT NULL
      AND public.can_administer_store(owner_store_id, auth.uid())
    )
  );

-- Viewer/read-only operational access. Editors retain write capability through the
-- existing can_manage_store-based content/fulfillment policies.
DROP POLICY IF EXISTS "Store staff can view analytics events" ON public.store_analytics_events;
CREATE POLICY "Store team can view analytics events"
  ON public.store_analytics_events FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store staff can view store customer profiles" ON public.store_customer_profiles;
CREATE POLICY "Store team can view store customer profiles"
  ON public.store_customer_profiles FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store staff can view store contact messages" ON public.contact_messages;
CREATE POLICY "Store team can view store contact messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, auth.uid()));

-- Preserve editor ability to work the contact inbox; viewers remain read-only.
DROP POLICY IF EXISTS "Store staff can update store contact messages" ON public.contact_messages;
CREATE POLICY "Store editors can update store contact messages"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

-- #328 removes direct client order writes earlier in the rollout. Reassert the
-- absence here and widen only the read policy to viewer membership.
DROP POLICY IF EXISTS "Store managers can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Store staff can update store orders" ON public.orders;
DROP POLICY IF EXISTS "Store staff can view all store orders" ON public.orders;
CREATE POLICY "Store team can view all store orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store managers can view shipments" ON public.order_shipments;
DROP POLICY IF EXISTS "Store team can view shipments" ON public.order_shipments;
CREATE POLICY "Store team can view shipments"
  ON public.order_shipments FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, auth.uid()));

-- Shipment booking/status is day-to-day fulfillment and remains editor-capable.
DROP POLICY IF EXISTS "Store managers can create shipments" ON public.order_shipments;
DROP POLICY IF EXISTS "Store managers can update shipments" ON public.order_shipments;
CREATE POLICY "Store editors can create shipments"
  ON public.order_shipments FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));
CREATE POLICY "Store editors can update shipments"
  ON public.order_shipments FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));
