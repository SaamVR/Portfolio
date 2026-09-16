export type RecoveryCouponCandidate = {
  code?: unknown;
  is_active?: unknown;
  expires_at?: unknown;
  max_uses?: unknown;
  uses_count?: unknown;
  min_order?: unknown;
};

export function normalizeRecoveryCouponCode(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().slice(0, 80);
  return normalized || null;
}

function finiteNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isRecoveryCouponUsable(
  coupon: RecoveryCouponCandidate | null | undefined,
  cartValue: unknown,
  nowMs = Date.now(),
) {
  if (!coupon || coupon.is_active !== true) return false;
  if (!normalizeRecoveryCouponCode(coupon.code)) return false;

  const expiresAt = typeof coupon.expires_at === "string" && coupon.expires_at.trim()
    ? Date.parse(coupon.expires_at)
    : null;
  if (expiresAt !== null && Number.isFinite(expiresAt) && expiresAt < nowMs) return false;

  const maxUses = coupon.max_uses == null ? null : finiteNumber(coupon.max_uses, -1);
  const usesCount = Math.max(0, finiteNumber(coupon.uses_count));
  if (maxUses !== null && (maxUses < 1 || usesCount >= maxUses)) return false;

  const minimum = Math.max(0, finiteNumber(coupon.min_order));
  const value = Math.max(0, finiteNumber(cartValue));
  return value >= minimum;
}
