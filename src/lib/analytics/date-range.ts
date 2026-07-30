export type AnalyticsDatePreset =
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "custom";

export type AnalyticsDateRange = {
  startIso: string;
  endIso: string;
};

export type AnalyticsDateRangePair = {
  current: AnalyticsDateRange;
  previous: AnalyticsDateRange;
};

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function resolveAnalyticsDateRange(
  preset: AnalyticsDatePreset,
  customStart?: string,
  customEnd?: string,
  now = new Date(),
): AnalyticsDateRange {
  const today = startOfDay(now);

  if (preset === "today") {
    return {
      startIso: today.toISOString(),
      endIso: endOfDay(now).toISOString(),
    };
  }

  if (preset === "last_7_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return {
      startIso: start.toISOString(),
      endIso: endOfDay(now).toISOString(),
    };
  }

  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startIso: start.toISOString(),
      endIso: endOfDay(now).toISOString(),
    };
  }

  if (preset === "custom" && customStart && customEnd) {
    const start = startOfDay(new Date(customStart));
    const end = endOfDay(new Date(customEnd));
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }

  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  return {
    startIso: start.toISOString(),
    endIso: endOfDay(now).toISOString(),
  };
}

export function getAnalyticsPresetLabel(preset: AnalyticsDatePreset) {
  switch (preset) {
    case "today":
      return "Today";
    case "last_7_days":
      return "Last 7 days";
    case "last_30_days":
      return "Last 30 days";
    case "this_month":
      return "This month";
    case "custom":
      return "Custom range";
    default:
      return "Last 30 days";
  }
}

export function resolveAnalyticsDateRangePair(
  preset: AnalyticsDatePreset,
  customStart?: string,
  customEnd?: string,
  now = new Date(),
): AnalyticsDateRangePair {
  const current = resolveAnalyticsDateRange(preset, customStart, customEnd, now);
  const start = new Date(current.startIso);
  const end = new Date(current.endIso);
  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return {
    current,
    previous: {
      startIso: previousStart.toISOString(),
      endIso: previousEnd.toISOString(),
    },
  };
}
