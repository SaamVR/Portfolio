export type RecoveryConsentStatus = "accepted" | "declined" | "unknown";

type RecoveryAuthIdentity = {
  id?: string | null;
  email?: string | null;
} | null | undefined;

function normalizeAccountEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 180) return null;
  return email;
}

export function resolveRecoveryContactAuthority(input: {
  requestedConsentStatus: RecoveryConsentStatus;
  authUser: RecoveryAuthIdentity;
}) {
  const accountEmail = normalizeAccountEmail(input.authUser?.email);
  const canScheduleEmail = input.requestedConsentStatus === "accepted"
    && Boolean(input.authUser?.id)
    && Boolean(accountEmail);

  return {
    canScheduleEmail,
    consentStatus: input.requestedConsentStatus === "declined"
      ? "declined" as const
      : canScheduleEmail
        ? "accepted" as const
        : "unknown" as const,
    contactEmail: canScheduleEmail ? accountEmail : null,
    authority: canScheduleEmail ? "authenticated_account_email" as const : "none" as const,
  };
}
