import assert from "node:assert/strict";
import test from "node:test";
import { buildOperationalAlerts, calculateOperationalScore } from "./ops-readiness";

const healthyInput = {
  databaseHealthy: true,
  failedNotifications24h: 0,
  pendingNotifications24h: 0,
  failedInvoices24h: 0,
  stalePendingInvoices: 0,
  atRiskStores: 0,
  pendingDeleteStores: 0,
  openCriticalIncidents: 0,
  openWarningIncidents: 0,
  openPrewarningIncidents: 0,
  ciFailed: 0,
  ciPending: 0,
  deploymentFailed: 0,
  deploymentPending: 0,
  providerErrors: [],
};

test("healthy operations produce no alerts and a perfect score", () => {
  const alerts = buildOperationalAlerts(healthyInput);
  assert.deepEqual(alerts, []);
  assert.equal(calculateOperationalScore(alerts), 100);
});

test("launch-blocking signals are prioritized above warnings and prewarnings", () => {
  const alerts = buildOperationalAlerts({
    ...healthyInput,
    ciFailed: 1,
    stalePendingInvoices: 2,
    atRiskStores: 3,
  });

  assert.equal(alerts[0]?.id, "ci-failed");
  assert.equal(alerts[0]?.severity, "critical");
  assert.equal(alerts.some((alert) => alert.id === "stale-pending-invoices" && alert.severity === "warning"), true);
  assert.equal(alerts.some((alert) => alert.id === "at-risk-stores" && alert.severity === "prewarning"), true);
  assert.ok(calculateOperationalScore(alerts) < 100);
});

test("open critical incidents lower the safety score and surface the incident center", () => {
  const alerts = buildOperationalAlerts({
    ...healthyInput,
    openCriticalIncidents: 2,
  });

  assert.equal(alerts[0]?.id, "open-critical-incidents");
  assert.equal(alerts[0]?.severity, "critical");
  assert.match(alerts[0]?.href ?? "", /incident-center/);
  assert.equal(calculateOperationalScore(alerts), 65);
});

test("provider telemetry failures are surfaced without marking the database unhealthy", () => {
  const alerts = buildOperationalAlerts({
    ...healthyInput,
    providerErrors: ["GitHub status unavailable: token missing"],
  });

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0]?.severity, "warning");
  assert.match(alerts[0]?.detail ?? "", /GitHub/);
});
