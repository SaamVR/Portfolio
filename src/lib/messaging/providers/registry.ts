import { greenWebSmsProvider } from "./greenweb";
import type { SmsProviderAdapter } from "./types";

const providers = new Map<string, SmsProviderAdapter>([[greenWebSmsProvider.key, greenWebSmsProvider]]);

export function getSmsProviderAdapter(provider: string) {
  return providers.get(provider.trim().toLowerCase()) ?? null;
}

export function listSmsProviderOptions() {
  return Array.from(providers.values()).map(({ key, label }) => ({ key, label }));
}
