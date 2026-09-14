import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeOrderCreatedAnalyticsRows } from "@/lib/orders/order-background-jobs";

test("order creation analytics are not persisted as purchase truth", () => {
  const rows = normalizeOrderCreatedAnalyticsRows([
    {
      event_name: "purchase",
      value: 1500,
      metadata: { payment_method: "bkash" },
    },
    {
      event_name: "purchase_item",
      product_id: "product-1",
      value: 1500,
      metadata: { productName: "Example" },
    },
    {
      event_name: "begin_checkout",
      value: 0,
    },
  ]) as Array<Record<string, unknown>>;

  assert.equal(rows[0]?.event_name, "order_created");
  assert.equal(rows[1]?.event_name, "order_created_item");
  assert.equal(rows[2]?.event_name, "begin_checkout");
  assert.deepEqual(rows[0]?.metadata, {
    payment_method: "bkash",
    lifecycle_truth: "order_created_unsettled",
  });
});

test("order-created queue and background jobs fail closed for revenue and refunds", () => {
  const jobsSource = readFileSync(
    path.join(process.cwd(), "src/lib/orders/order-background-jobs.ts"),
    "utf8",
  );
  const queueSource = readFileSync(
    path.join(process.cwd(), "src/lib/orders/order-background-queue.ts"),
    "utf8",
  );
  const createRouteSource = readFileSync(
    path.join(process.cwd(), "src/app/api/orders/create/route.ts"),
    "utf8",
  );
  const statusRouteSource = readFileSync(
    path.join(process.cwd(), "src/app/api/orders/status/route.ts"),
    "utf8",
  );

  assert.doesNotMatch(jobsSource, /from\(["']store_revenue_events["']\)/);
  assert.match(jobsSource, /recovered_revenue:\s*0/);
  assert.match(jobsSource, /order_created_unsettled/);

  assert.match(queueSource, /normalizeOrderCreatedAnalyticsRows\(args\.purchaseEventRows\)/);
  assert.match(queueSource, /recoveredRevenue:\s*0/);
  assert.match(queueSource, /lifecycle_truth:\s*["']order_created_unsettled["']/);

  assert.match(createRouteSource, /dispatchOrderCreatedBackgroundJobs/);
  assert.doesNotMatch(createRouteSource, /from\(["']store_revenue_events["']\)/);
  assert.doesNotMatch(statusRouteSource, /from\(["']store_revenue_events["']\)/);
});
