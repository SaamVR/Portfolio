export const providerIdPattern = /^[a-z][a-z0-9_-]{0,63}$/;

export type ProviderCategory = "payment" | "courier";
export type ProviderRuntimeStatus = "active" | "setup_only" | "disabled";
export type ProviderFieldKind = "text" | "password" | "url" | "number" | "boolean" | "select";
export type ProviderFieldScope = "public" | "secret";

export type ProviderFieldOption = {
  label: string;
  value: string | number | boolean;
};

export type ProviderSetupField = {
  key: string;
  label: string;
  kind: ProviderFieldKind;
  scope: ProviderFieldScope;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number | boolean | null;
  options?: ProviderFieldOption[];
};

export type ProviderSetupGuide = {
  title: string;
  body: string;
  examples?: string[];
};

export type ProviderManifest = {
  id: string;
  category: ProviderCategory;
  label: string;
  description: string;
  runtimeStatus: ProviderRuntimeStatus;
  capabilities: string[];
  fields: ProviderSetupField[];
  guide?: ProviderSetupGuide;
};

export function normalizeProviderId(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return providerIdPattern.test(normalized) ? normalized : null;
}

export function assertValidProviderManifest(manifest: ProviderManifest) {
  if (!providerIdPattern.test(manifest.id)) {
    throw new Error(`Invalid provider id: ${manifest.id}`);
  }

  const fieldKeys = new Set<string>();
  for (const field of manifest.fields) {
    if (!field.key.trim()) {
      throw new Error(`Provider ${manifest.id} has an empty setup field key`);
    }
    if (fieldKeys.has(field.key)) {
      throw new Error(`Provider ${manifest.id} declares duplicate setup field ${field.key}`);
    }
    fieldKeys.add(field.key);
  }

  return manifest;
}

export function buildProviderRegistry<T extends ProviderManifest>(manifests: readonly T[]) {
  const registry = new Map<string, T>();
  for (const manifest of manifests) {
    assertValidProviderManifest(manifest);
    if (registry.has(manifest.id)) {
      throw new Error(`Duplicate provider id: ${manifest.id}`);
    }
    registry.set(manifest.id, manifest);
  }
  return registry;
}
