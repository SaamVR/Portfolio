import {
  buildProviderRegistry,
  normalizeProviderId,
} from "@/lib/integrations/provider-contract";
import type {
  PaymentProviderManifest,
  PaymentProviderPlugin,
} from "@/lib/payments/provider-plugin";
import { bkashPaymentPlugin } from "@/lib/payments/providers/bkash";

export type { PaymentProviderManifest } from "@/lib/payments/provider-plugin";

const paymentProviderPlugins = [bkashPaymentPlugin] as const satisfies readonly PaymentProviderPlugin[];
const paymentProviderRegistry = buildProviderRegistry(paymentProviderPlugins.map((plugin) => plugin.manifest));
const paymentPluginRegistry = new Map<string, PaymentProviderPlugin>(
  paymentProviderPlugins.map((plugin) => [plugin.manifest.id, plugin]),
);
const coreStorefrontPaymentMethods = new Set(["bkash_manual", "nagad", "cod"]);

// Compatibility export for older callers/tests while provider implementation now lives in one plugin module.
export const bkashPaymentProvider: PaymentProviderManifest = bkashPaymentPlugin.manifest;

export function listPaymentProviderManifests() {
  return [...paymentProviderRegistry.values()];
}

export function getPaymentProviderManifest(provider: unknown) {
  const id = normalizeProviderId(provider);
  return id ? paymentProviderRegistry.get(id) ?? null : null;
}

export function getPaymentProviderPlugin(provider: unknown) {
  const id = normalizeProviderId(provider);
  return id ? paymentPluginRegistry.get(id) ?? null : null;
}

export function getPaymentProviderByPaymentMethod(paymentMethod: unknown) {
  if (typeof paymentMethod !== "string") return null;
  const normalized = paymentMethod.trim().toLowerCase();
  return listPaymentProviderManifests().find((manifest) => manifest.paymentMethod === normalized) ?? null;
}

export function getPaymentPluginByPaymentMethod(paymentMethod: unknown) {
  const manifest = getPaymentProviderByPaymentMethod(paymentMethod);
  return manifest ? getPaymentProviderPlugin(manifest.id) : null;
}

export function isRegisteredPaymentProvider(provider: unknown) {
  return Boolean(getPaymentProviderPlugin(provider));
}

export function isAllowedStorefrontPaymentMethod(paymentMethod: unknown) {
  if (typeof paymentMethod !== "string") return false;
  const normalized = paymentMethod.trim().toLowerCase();
  if (coreStorefrontPaymentMethods.has(normalized)) return true;

  const provider = getPaymentProviderByPaymentMethod(normalized);
  return Boolean(provider && provider.runtimeStatus === "active");
}

export function isPrepaidStorefrontPaymentMethod(paymentMethod: unknown) {
  if (typeof paymentMethod !== "string") return false;
  const normalized = paymentMethod.trim().toLowerCase();
  if (normalized === "bkash_manual" || normalized === "nagad") return true;

  const provider = getPaymentProviderByPaymentMethod(normalized);
  return Boolean(provider && provider.runtimeStatus === "active" && provider.checkoutMode !== "offline");
}
