import type { AnalyticsReportEvent } from "@/lib/analytics/report";

function escapeCsv(value: unknown) {
  if (value == null) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildAnalyticsCsv(
  events: AnalyticsReportEvent[],
  storeLabels: Record<string, string> = {},
) {
  const headers = [
    "store_id",
    "store_label",
    "event_name",
    "visitor_id",
    "session_id",
    "traffic_source",
    "traffic_medium",
    "traffic_campaign",
    "search_query",
    "product_id",
    "quantity",
    "value",
    "page_type",
    "page_path",
    "event_timestamp",
    "metadata",
  ];

  const lines = [
    headers.join(","),
    ...events.map((event) => [
      escapeCsv(event.store_id ?? ""),
      escapeCsv(storeLabels[event.store_id ?? ""] ?? ""),
      escapeCsv(event.event_name),
      escapeCsv(event.visitor_id ?? ""),
      escapeCsv(event.session_id ?? ""),
      escapeCsv(event.traffic_source ?? ""),
      escapeCsv(event.traffic_medium ?? ""),
      escapeCsv(event.traffic_campaign ?? ""),
      escapeCsv(event.search_query ?? ""),
      escapeCsv(event.product_id ?? ""),
      escapeCsv(event.quantity ?? ""),
      escapeCsv(event.value ?? ""),
      escapeCsv(event.page_type ?? ""),
      escapeCsv(event.page_path ?? ""),
      escapeCsv(event.event_timestamp ?? ""),
      escapeCsv(event.metadata ?? {}),
    ].join(",")),
  ];

  return lines.join("\n");
}

export function downloadAnalyticsCsv(
  filename: string,
  events: AnalyticsReportEvent[],
  storeLabels: Record<string, string> = {},
) {
  const csv = buildAnalyticsCsv(events, storeLabels);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
