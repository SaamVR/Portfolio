export const cartRecoverySettingsKey = "cart_recovery_settings";
export const analyticsPrivacySettingsKey = "analytics_privacy_settings";

export type CartRecoverySettings = {
  abandonmentWindowMinutes: number;
  cooldownHours: number;
  maxTouchesPerLead: number;
  preferredChannel: "smart" | "email" | "whatsapp";
  dailyQueueLimit: number;
};

export type AnalyticsPrivacySettings = {
  consentBannerRequired: boolean;
  allowVisitorIdentifiers: boolean;
  retentionDays: number;
  scheduledReportCadence: "off" | "weekly" | "monthly";
  reportRecipient: string;
  anomalySensitivity: number;
};

export function normalizeCartRecoverySettings(value: unknown): CartRecoverySettings {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    abandonmentWindowMinutes: Math.min(24 * 60, Math.max(15, Number(record.abandonmentWindowMinutes) || 60)),
    cooldownHours: Math.min(168, Math.max(1, Number(record.cooldownHours) || 24)),
    maxTouchesPerLead: Math.min(6, Math.max(1, Number(record.maxTouchesPerLead) || 3)),
    preferredChannel: record.preferredChannel === "email" || record.preferredChannel === "whatsapp" ? record.preferredChannel : "smart",
    dailyQueueLimit: Math.min(500, Math.max(5, Number(record.dailyQueueLimit) || 50)),
  };
}

export function normalizeAnalyticsPrivacySettings(value: unknown): AnalyticsPrivacySettings {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    consentBannerRequired: record.consentBannerRequired !== false,
    allowVisitorIdentifiers: record.allowVisitorIdentifiers !== false,
    retentionDays: Math.min(730, Math.max(30, Number(record.retentionDays) || 180)),
    scheduledReportCadence: record.scheduledReportCadence === "weekly" || record.scheduledReportCadence === "monthly"
      ? record.scheduledReportCadence
      : "off",
    reportRecipient: typeof record.reportRecipient === "string" ? record.reportRecipient.trim() : "",
    anomalySensitivity: Math.min(50, Math.max(5, Number(record.anomalySensitivity) || 20)),
  };
}
