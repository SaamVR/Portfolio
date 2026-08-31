export type BoundedIntegerDraftOptions = {
  label: string;
  min: number;
  max: number;
};

export type BoundedIntegerDraftResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

export const merchantNumericSettingBounds = {
  analyticsRetentionDays: { label: "Retention days", min: 30, max: 730 },
  analyticsAnomalySensitivity: { label: "Anomaly sensitivity", min: 5, max: 50 },
  cartAbandonmentWindowMinutes: { label: "Abandonment window", min: 15, max: 1440 },
  cartCooldownHours: { label: "Cooldown between touches", min: 1, max: 168 },
  cartMaxTouchesPerLead: { label: "Maximum touches per lead", min: 1, max: 6 },
  cartDailyQueueLimit: { label: "Daily queue limit", min: 5, max: 500 },
} as const satisfies Record<string, BoundedIntegerDraftOptions>;

export function parseBoundedIntegerDraft(
  rawValue: string,
  { label, min, max }: BoundedIntegerDraftOptions,
): BoundedIntegerDraftResult {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { ok: false, error: `${label} is required.` };
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, error: `${label} must be a number.` };
  }

  if (!Number.isInteger(value)) {
    return { ok: false, error: `${label} must be a whole number.` };
  }

  if (value < min) {
    return { ok: false, error: `${label} must be at least ${min}.` };
  }

  if (value > max) {
    return { ok: false, error: `${label} must be at most ${max}.` };
  }

  return { ok: true, value };
}
