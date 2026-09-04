export type SmsPurpose = "otp" | "transactional" | "marketing";

export type SmsProviderVerification = {
  ok: boolean;
  metadata: Record<string, unknown>;
  error: string | null;
};

export type SmsDispatchInput = {
  secret: string;
  to: string;
  message: string;
  purpose: SmsPurpose;
};

export type SmsDispatchResult = {
  accepted: boolean;
  providerMessageId: string | null;
  error: string | null;
};

export interface SmsProviderAdapter {
  readonly key: string;
  readonly label: string;
  verifyCredential(secret: string): Promise<SmsProviderVerification>;
  send(input: SmsDispatchInput): Promise<SmsDispatchResult>;
}
