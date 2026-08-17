export type OpsAlertSeverity = "critical" | "warning" | "prewarning" | "info";

export type OpsAlert = {
  id: string;
  severity: OpsAlertSeverity;
  title: string;
  detail: string;
  action: string;
  href?: string;
};

export type OpsReadinessInput = {
  databaseHealthy: boolean;
  failedNotifications24h: number;
  pendingNotifications24h: number;
  failedInvoices24h: number;
  stalePendingInvoices: number;
  atRiskStores: number;
  pendingDeleteStores: number;
  openCriticalIncidents: number;
  openWarningIncidents: number;
  openPrewarningIncidents: number;
  ciFailed: number;
  ciPending: number;
  deploymentFailed: number;
  deploymentPending: number;
  providerErrors: string[];
};

const severityWeight: Record<OpsAlertSeverity, number> = {
  critical: 35,
  warning: 15,
  prewarning: 7,
  info: 0,
};

export function buildOperationalAlerts(input: OpsReadinessInput): OpsAlert[] {
  const alerts: OpsAlert[] = [];

  if (!input.databaseHealthy) {
    alerts.push({
      id: "database-unhealthy",
      severity: "critical",
      title: "Database connectivity is failing",
      detail: "The control plane could not complete its Supabase health query.",
      action: "Pause launches and checkout changes until database connectivity is restored.",
    });
  }

  if (input.openCriticalIncidents > 0) {
    alerts.push({
      id: "open-critical-incidents",
      severity: "critical",
      title: "Open application incidents require investigation",
      detail: `${input.openCriticalIncidents} critical incident${input.openCriticalIncidents === 1 ? " is" : "s are"} currently unresolved.`,
      action: "Open the Error & incident center below, reconcile the underlying failure, then resolve the incident only after the service state is healthy.",
      href: "/cms-admin#incident-center",
    });
  } else if (input.openWarningIncidents > 0) {
    alerts.push({
      id: "open-warning-incidents",
      severity: "warning",
      title: "Application incidents need operator attention",
      detail: `${input.openWarningIncidents} warning incident${input.openWarningIncidents === 1 ? " is" : "s are"} currently unresolved.`,
      action: "Review repeated failures and occurrence counts in the Error & incident center before increasing customer traffic.",
      href: "/cms-admin#incident-center",
    });
  } else if (input.openPrewarningIncidents > 0) {
    alerts.push({
      id: "open-prewarning-incidents",
      severity: "prewarning",
      title: "Early application degradation signals are present",
      detail: `${input.openPrewarningIncidents} pre-warning incident${input.openPrewarningIncidents === 1 ? " is" : "s are"} currently open.`,
      action: "Review these early signals before they become customer-facing failures.",
      href: "/cms-admin#incident-center",
    });
  }

  if (input.ciFailed > 0) {
    alerts.push({
      id: "ci-failed",
      severity: "critical",
      title: "A required CI check is failing",
      detail: `${input.ciFailed} current workflow check${input.ciFailed === 1 ? " is" : "s are"} failing.`,
      action: "Do not deploy or merge the affected revision. Open the failed workflow and fix the first failing step.",
    });
  } else if (input.ciPending > 0) {
    alerts.push({
      id: "ci-pending",
      severity: "prewarning",
      title: "CI validation is still running",
      detail: `${input.ciPending} required workflow check${input.ciPending === 1 ? " is" : "s are"} still pending.`,
      action: "Keep the release blocked until every required check is green.",
    });
  }

  if (input.deploymentFailed > 0) {
    alerts.push({
      id: "deployment-failed",
      severity: "critical",
      title: "A production deployment is failing",
      detail: `${input.deploymentFailed} deployment signal${input.deploymentFailed === 1 ? " is" : "s are"} unhealthy.`,
      action: "Keep traffic on the last healthy release and inspect the deployment logs before retrying.",
    });
  } else if (input.deploymentPending > 0) {
    alerts.push({
      id: "deployment-pending",
      severity: "prewarning",
      title: "A deployment is still progressing",
      detail: `${input.deploymentPending} deployment signal${input.deploymentPending === 1 ? " is" : "s are"} not yet ready.`,
      action: "Avoid announcing the release until the deployment reports a healthy ready state.",
    });
  }

  if (input.failedInvoices24h > 0) {
    alerts.push({
      id: "failed-invoices",
      severity: "critical",
      title: "Recent billing failures need reconciliation",
      detail: `${input.failedInvoices24h} invoice${input.failedInvoices24h === 1 ? " has" : "s have"} failed in the last 24 hours.`,
      action: "Review payment IDs, amounts, provider responses, and entitlement state before retrying settlement.",
      href: "/cms-admin?tab=billing",
    });
  }

  if (input.stalePendingInvoices > 0) {
    alerts.push({
      id: "stale-pending-invoices",
      severity: "warning",
      title: "Payments are stuck pending",
      detail: `${input.stalePendingInvoices} invoice${input.stalePendingInvoices === 1 ? " has" : "s have"} remained pending for more than 30 minutes.`,
      action: "Reconcile these payments with bKash before manually changing subscription access.",
      href: "/cms-admin?tab=billing",
    });
  }

  if (input.failedNotifications24h > 0) {
    alerts.push({
      id: "failed-notifications",
      severity: "warning",
      title: "Customer or merchant notifications are failing",
      detail: `${input.failedNotifications24h} notification${input.failedNotifications24h === 1 ? " has" : "s have"} failed in the last 24 hours.`,
      action: "Inspect recipient/provider errors and send a controlled test before relying on this alert path.",
    });
  } else if (input.pendingNotifications24h > 5) {
    alerts.push({
      id: "notification-backlog",
      severity: "prewarning",
      title: "Notification backlog is growing",
      detail: `${input.pendingNotifications24h} notifications are still pending from the last 24 hours.`,
      action: "Check processor throughput and provider latency before the queue becomes customer-visible.",
    });
  }

  if (input.pendingDeleteStores > 0) {
    alerts.push({
      id: "pending-store-deletions",
      severity: "warning",
      title: "Stores are approaching deletion",
      detail: `${input.pendingDeleteStores} store${input.pendingDeleteStores === 1 ? " is" : "s are"} in pending-delete state.`,
      action: "Confirm reminders, holds, and deletion dates before destructive lifecycle automation runs.",
      href: "/cms-admin?tab=lifecycle",
    });
  } else if (input.atRiskStores > 0) {
    alerts.push({
      id: "at-risk-stores",
      severity: "prewarning",
      title: "Store lifecycle risk is increasing",
      detail: `${input.atRiskStores} store${input.atRiskStores === 1 ? " is" : "s are"} currently marked at risk.`,
      action: "Review inactivity and subscription signals before these stores enter deletion workflow.",
      href: "/cms-admin?tab=lifecycle",
    });
  }

  input.providerErrors.forEach((providerError, index) => {
    alerts.push({
      id: `provider-${index}`,
      severity: "warning",
      title: "External status source is unavailable",
      detail: providerError,
      action: "Verify the provider token/configuration. Internal platform telemetry is still available below.",
    });
  });

  return alerts.sort((left, right) => severityWeight[right.severity] - severityWeight[left.severity]);
}

export function calculateOperationalScore(alerts: OpsAlert[]) {
  const penalty = alerts.reduce((total, alert) => total + severityWeight[alert.severity], 0);
  return Math.max(0, 100 - Math.min(100, penalty));
}
