const ANALYTICS_EVENT_NAMES = new Set([
  "page_view", "view_item", "quick_view_open", "search", "tag_click", "search_result_click",
  "filter_used", "sort_changed", "add_to_cart", "remove_from_cart", "cart_quantity_changed",
  "clear_cart", "view_cart", "begin_checkout", "purchase", "purchase_item", "track_order_search",
  "track_order_result", "add_to_wishlist", "remove_from_wishlist",
]);

function rows(plan: Record<string, unknown>, key: string) {
  const value = plan[key];
  if (!Array.isArray(value)) throw new Error(`Normalized restore plan is missing ${key}.`);
  return value as Array<Record<string, unknown>>;
}

function jsonKind(value: unknown) {
  if (Array.isArray(value)) return "array";
  if (value && typeof value === "object") return "object";
  if (value === null) return "null";
  return typeof value;
}

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) throw new Error(`${label} contains an empty identity.`);
    if (seen.has(value)) throw new Error(`${label} contains a duplicate identity: ${value}`);
    seen.add(value);
  }
}

export function assertNormalizedRestorePlanConstraints(plan: Record<string, unknown>) {
  for (const key of [
    "store_themes", "product_categories", "product_types", "products", "coupon_codes", "blog_posts",
    "orders", "product_reviews", "contact_messages", "customer_addresses", "store_customer_profiles",
    "store_analytics_events", "store_pages", "store_page_blocks", "store_page_revisions", "site_settings",
    "store_staff_invites", "store_memberships", "store_subscriptions",
  ]) {
    assertUnique(rows(plan, key).map((row) => String(row.id ?? "")), `${key}.id`);
  }

  assertUnique(rows(plan, "site_settings").map((row) => String(row.key ?? "")), "site_settings.key");
  assertUnique(rows(plan, "store_memberships").map((row) => String(row.user_id ?? "")), "store_memberships.user_id");
  assertUnique(rows(plan, "store_customer_profiles").map((row) => String(row.user_id ?? "")), "store_customer_profiles.user_id");
  assertUnique(rows(plan, "store_pages").map((row) => String(row.slug ?? "")), "store_pages.slug");
  assertUnique(rows(plan, "blog_posts").map((row) => String(row.slug ?? "")), "blog_posts.slug");
  assertUnique(
    rows(plan, "product_reviews").map((row) => `${String(row.user_id ?? "")}::${String(row.product_id ?? "")}::${String(row.order_id ?? "")}`),
    "product_reviews user/product/order",
  );

  for (const [index, row] of rows(plan, "product_types").entries()) {
    if (!Array.isArray(row.metric_schema)) {
      throw new Error(`product_types[${index}].metric_schema must be an array.`);
    }
  }

  for (const [index, row] of rows(plan, "products").entries()) {
    if (jsonKind(row.metric_values) !== "object") {
      throw new Error(`products[${index}].metric_values must be an object.`);
    }
  }

  for (const [index, row] of rows(plan, "store_page_blocks").entries()) {
    if (jsonKind(row.responsive_config) !== "object") {
      throw new Error(`store_page_blocks[${index}].responsive_config must be an object.`);
    }
  }

  for (const [index, row] of rows(plan, "contact_messages").entries()) {
    const name = String(row.name ?? "");
    const email = String(row.email ?? "");
    const message = String(row.message ?? "");
    if (name.length > 100) throw new Error(`contact_messages[${index}].name exceeds 100 characters.`);
    if (email.length > 255) throw new Error(`contact_messages[${index}].email exceeds 255 characters.`);
    if (message.length > 2_000) throw new Error(`contact_messages[${index}].message exceeds 2,000 characters.`);
    if (message.trim().length < 10) throw new Error(`contact_messages[${index}].message must contain at least 10 characters.`);
  }

  for (const [index, row] of rows(plan, "product_reviews").entries()) {
    const rating = Number(row.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error(`product_reviews[${index}].rating must be between 1 and 5.`);
    }
  }

  for (const [index, row] of rows(plan, "store_analytics_events").entries()) {
    const eventName = String(row.event_name ?? "");
    if (!ANALYTICS_EVENT_NAMES.has(eventName)) {
      throw new Error(`store_analytics_events[${index}].event_name is not supported.`);
    }
    const metadataBytes = new TextEncoder().encode(JSON.stringify(row.metadata ?? {})).byteLength;
    if (metadataBytes > 4_096) {
      throw new Error(`store_analytics_events[${index}].metadata exceeds the 4 KiB database limit.`);
    }
  }
}
