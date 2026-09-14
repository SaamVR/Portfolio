export const MANUAL_BKASH_PROVIDER = "bkash_manual" as const;

export function normalizeManualBkashTransactionId(value: string) {
  return value.trim().toUpperCase();
}

export function isValidManualBkashTransactionId(value: string) {
  const normalized = normalizeManualBkashTransactionId(value);
  return normalized.length >= 1
    && normalized.length <= 128
    && /^[A-Z0-9]+$/.test(normalized);
}

export function isDatabaseUniqueViolation(error: unknown) {
  return Boolean(
    error
      && typeof error === "object"
      && "code" in error
      && typeof error.code === "string"
      && error.code === "23505",
  );
}
