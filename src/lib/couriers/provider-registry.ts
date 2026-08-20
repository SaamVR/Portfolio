import {
  buildProviderRegistry,
  normalizeProviderId,
} from "@/lib/integrations/provider-contract";
import type {
  CourierProviderManifest,
  CourierProviderPlugin,
} from "@/lib/couriers/provider-plugin";
import { pathaoCourierPlugin } from "@/lib/couriers/providers/pathao";
import { manualCourierPlugin } from "@/lib/couriers/providers/manual";
import { createSetupOnlyCourierPlugin } from "@/lib/couriers/providers/setup-only";

export type { CourierProviderManifest } from "@/lib/couriers/provider-plugin";

const courierProviderPlugins = [
  pathaoCourierPlugin,
  createSetupOnlyCourierPlugin("steadfast", "Steadfast", "Steadfast courier connection setup."),
  createSetupOnlyCourierPlugin("redx", "REDX", "REDX courier connection setup."),
  createSetupOnlyCourierPlugin("ecourier", "eCourier", "eCourier connection setup."),
  createSetupOnlyCourierPlugin("paperfly", "Paperfly", "Paperfly connection setup."),
  manualCourierPlugin,
] as const satisfies readonly CourierProviderPlugin[];

export const courierProviderManifests: readonly CourierProviderManifest[] = courierProviderPlugins.map((plugin) => plugin.manifest);
export const pathaoCourierProvider = pathaoCourierPlugin.manifest;
export const manualCourierProvider = manualCourierPlugin.manifest;

const courierProviderRegistry = buildProviderRegistry(courierProviderManifests);
const courierPluginRegistry = new Map<string, CourierProviderPlugin>(
  courierProviderPlugins.map((plugin) => [plugin.manifest.id, plugin]),
);

export function listCourierProviderManifests() {
  return [...courierProviderRegistry.values()];
}

export function getCourierProviderManifest(provider: unknown) {
  const id = normalizeProviderId(provider);
  return id ? courierProviderRegistry.get(id) ?? null : null;
}

export function getCourierProviderPlugin(provider: unknown) {
  const id = normalizeProviderId(provider);
  return id ? courierPluginRegistry.get(id) ?? null : null;
}

export function isRegisteredCourierProvider(provider: unknown) {
  return Boolean(getCourierProviderPlugin(provider));
}
