export type ProductFulfillmentType = "physical" | "digital";

export type ProductCommercialOptionKind = "variant" | "plan" | "duration" | "license";

export type ProductCommercialOption = {
  id: string;
  groupKey: string;
  label: string;
  priceDelta: number;
  kind: ProductCommercialOptionKind;
  active: boolean;
};

type RawCommercialOption = Record<string, unknown>;

function text(value: unknown, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeGroupKey(value: unknown) {
  return text(value, 80).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function inferCommercialOptionKind(value: unknown, groupKey: string): ProductCommercialOptionKind {
  const explicit = text(value, 30).toLowerCase();
  if (explicit === "plan" || explicit === "duration" || explicit === "license" || explicit === "variant") {
    return explicit;
  }
  if (/(^|_)(license|licence)(_type|_tier)?$/.test(groupKey)) return "license";
  if (/(^|_)(duration|billing_period|term)$/.test(groupKey)) return "duration";
  if (/(^|_)(plan|account_type)$/.test(groupKey)) return "plan";
  return "variant";
}

function priceDelta(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed);
}

export function normalizeCommercialOptions(value: unknown): ProductCommercialOption[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const raw = entry as RawCommercialOption;
    const id = text(raw.id, 100);
    const groupKey = normalizeGroupKey(raw.group_key ?? raw.groupKey);
    const label = text(raw.label, 120);
    if (!id || !groupKey || !label || seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      groupKey,
      label,
      priceDelta: priceDelta(raw.price_delta ?? raw.priceDelta),
      kind: inferCommercialOptionKind(raw.kind, groupKey),
      active: raw.active !== false && raw.is_active !== false,
    }];
  });
}


export function serializeCommercialOptions(value: unknown) {
  return normalizeCommercialOptions(value).map((option) => ({
    id: option.id,
    group_key: option.groupKey,
    label: option.label,
    price_delta: option.priceDelta,
    kind: option.kind,
    active: option.active,
  }));
}

export function normalizeFulfillmentType(value: unknown): ProductFulfillmentType {
  return value === "digital" ? "digital" : "physical";
}

export function getActiveCommercialOptions(value: unknown) {
  return normalizeCommercialOptions(value).filter((option) => option.active);
}

export function getCommercialOptionsByGroup(value: unknown) {
  const grouped = new Map<string, ProductCommercialOption[]>();
  for (const option of getActiveCommercialOptions(value)) {
    const options = grouped.get(option.groupKey) ?? [];
    options.push(option);
    grouped.set(option.groupKey, options);
  }
  return grouped;
}

export function findCommercialOptionByLabel(
  value: unknown,
  groupKey: string,
  label: string | null | undefined,
) {
  const normalizedGroup = normalizeGroupKey(groupKey);
  const normalizedLabel = text(label).toLocaleLowerCase();
  if (!normalizedGroup || !normalizedLabel) return null;
  return getActiveCommercialOptions(value).find((option) =>
    option.groupKey === normalizedGroup && option.label.toLocaleLowerCase() === normalizedLabel,
  ) ?? null;
}

export function findCommercialOptionByKind(
  value: unknown,
  kind: ProductCommercialOptionKind,
  labelOrId: string | null | undefined,
) {
  const needle = text(labelOrId).toLocaleLowerCase();
  if (!needle) return null;
  return getActiveCommercialOptions(value).find((option) =>
    option.kind === kind && (option.id.toLocaleLowerCase() === needle || option.label.toLocaleLowerCase() === needle),
  ) ?? null;
}

export function buildCommercialSelection(
  value: unknown,
  selections: Array<{ groupKey: string; label?: string | null }>,
) {
  const options = selections.flatMap(({ groupKey, label }) => {
    const option = findCommercialOptionByLabel(value, groupKey, label);
    return option ? [option] : [];
  });
  return {
    optionIds: options.map((option) => option.id),
    label: options.map((option) => option.label).join(" • "),
    priceDelta: options.reduce((sum, option) => sum + option.priceDelta, 0),
  };
}


export function buildCommercialSelectionWithDefaults(
  value: unknown,
  selections: Array<{ groupKey: string; label?: string | null }>,
) {
  const requestedByGroup = new Map(
    selections
      .map((selection) => [normalizeGroupKey(selection.groupKey), selection.label] as const)
      .filter(([groupKey]) => Boolean(groupKey)),
  );
  const options = Array.from(getCommercialOptionsByGroup(value).entries()).flatMap(([groupKey, groupOptions]) => {
    const requestedLabel = requestedByGroup.get(groupKey);
    if (requestedLabel) {
      const requested = findCommercialOptionByLabel(value, groupKey, requestedLabel);
      return requested ? [requested] : [];
    }
    return groupOptions[0] ? [groupOptions[0]] : [];
  });
  const requiredGroupCount = getCommercialOptionsByGroup(value).size;
  return {
    optionIds: options.map((option) => option.id),
    label: options.map((option) => option.label).join(" • "),
    priceDelta: options.reduce((sum, option) => sum + option.priceDelta, 0),
    complete: options.length === requiredGroupCount,
  };
}

export function getDefaultCommercialSelection(value: unknown) {
  const groups = getCommercialOptionsByGroup(value);
  const options = Array.from(groups.values()).flatMap((group) => group[0] ? [group[0]] : []);
  return {
    optionIds: options.map((option) => option.id),
    label: options.map((option) => option.label).join(" • "),
    priceDelta: options.reduce((sum, option) => sum + option.priceDelta, 0),
  };
}

export function getCommercialSelectionPrice(basePrice: number, value: unknown, optionIds: string[]) {
  const active = new Map(getActiveCommercialOptions(value).map((option) => [option.id, option]));
  const selected = optionIds.map((id) => active.get(id)).filter((option): option is ProductCommercialOption => Boolean(option));
  if (selected.length !== optionIds.length) return null;

  const groupKeys = new Set(selected.map((option) => option.groupKey));
  if (groupKeys.size !== selected.length) return null;

  const requiredGroupCount = getCommercialOptionsByGroup(value).size;
  if (requiredGroupCount !== selected.length) return null;

  const unitPrice = Math.round(basePrice + selected.reduce((sum, option) => sum + option.priceDelta, 0));
  if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 2_000_000_000) return null;
  return unitPrice;
}
