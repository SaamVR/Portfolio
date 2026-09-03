const E164_RENEWAL_PHONE = /^\+[1-9][0-9]{7,14}$/;
const BD_LOCAL_MOBILE = /^01[0-9]{9}$/;
const BD_COUNTRY_MOBILE = /^8801[0-9]{9}$/;

export function normalizeRenewalPhone(value: unknown) {
  if (typeof value !== "string") return null;

  let compact = value.trim().replace(/[\s().-]+/g, "");
  if (!compact) return null;

  if (compact.startsWith("00")) {
    compact = `+${compact.slice(2)}`;
  } else if (BD_LOCAL_MOBILE.test(compact)) {
    compact = `+880${compact.slice(1)}`;
  } else if (BD_COUNTRY_MOBILE.test(compact)) {
    compact = `+${compact}`;
  }

  return E164_RENEWAL_PHONE.test(compact) ? compact : null;
}

export function supportsRenewalPreferences(planId: unknown) {
  return typeof planId === "string" && planId.trim() !== "" && planId !== "free";
}
