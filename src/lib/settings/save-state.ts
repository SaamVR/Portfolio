export type SettingsSaveState = "clean" | "dirty" | "saving" | "saved" | "save_failed";

export type SettingsSaveFeedback = {
  state: "saving" | "saved" | "save_failed";
  operationId: string;
  message?: string;
};

type JsonLike = null | boolean | number | string | JsonLike[] | { [key: string]: JsonLike };

function canonicalize(value: unknown): JsonLike | undefined {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") return undefined;
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry) ?? null);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, JsonLike> = {};
    for (const key of Object.keys(record).sort()) {
      const next = canonicalize(record[key]);
      if (next !== undefined) normalized[key] = next;
    }
    return normalized;
  }

  return String(value);
}

export function normalizeSettingsValue(value: unknown): string {
  return JSON.stringify(canonicalize(value) ?? null);
}

export function settingsValuesEqual(current: unknown, persisted: unknown): boolean {
  return normalizeSettingsValue(current) === normalizeSettingsValue(persisted);
}

export function resolveSettingsSaveState({
  current,
  persisted,
  feedback,
}: {
  current: unknown;
  persisted: unknown;
  feedback?: SettingsSaveFeedback;
}): SettingsSaveState {
  if (feedback?.state === "saving") return "saving";

  const dirty = !settingsValuesEqual(current, persisted);
  if (feedback?.state === "save_failed" && dirty) return "save_failed";
  if (dirty) return "dirty";
  if (feedback?.state === "saved") return "saved";
  return "clean";
}

export function settingsSaveStateLabel(state: SettingsSaveState): string {
  switch (state) {
    case "dirty":
      return "Unsaved changes";
    case "saving":
      return "Saving changes…";
    case "saved":
      return "Saved";
    case "save_failed":
      return "Save failed — changes are still unsaved";
    default:
      return "No unsaved changes";
  }
}

export function isSettingsSaveCompletionCurrent({
  originStoreId,
  currentStoreId,
  settingKey,
  operationSettingKey,
  operationId,
  latestOperationId,
}: {
  originStoreId: string;
  currentStoreId: string | null;
  settingKey: string;
  operationSettingKey: string;
  operationId: string;
  latestOperationId: string | undefined;
}): boolean {
  return (
    originStoreId === currentStoreId &&
    settingKey === operationSettingKey &&
    operationId === latestOperationId
  );
}
