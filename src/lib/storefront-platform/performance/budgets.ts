export const STOREFRONT_PERFORMANCE_BASELINE = {
  capturedAt: "2026-09-13",
  route: "/[slug]",
  runtime: { node: "24.19.0", npm: "11.17.0" },
  build: { webpackCompileSeconds: 114, typecheckSeconds: 70, status: "environment-blocked" as const },
  clientReferenceGraph: { chunkCount: 31, rawBytes: 1_413_798, gzipBytes: 385_464 },
  rawStorefrontImageOccurrences: 14,
  webVitalReference: { lcpMs: 2500, cls: 0.10, inpMs: 200 },
} as const;

export type StorefrontClientGraphMetrics = { chunkCount: number; rawBytes: number; gzipBytes: number };

export function evaluateStorefrontClientGraph(metrics: StorefrontClientGraphMetrics) {
  const baseline = STOREFRONT_PERFORMANCE_BASELINE.clientReferenceGraph;
  const regressions = [
    metrics.chunkCount > baseline.chunkCount ? `chunkCount ${metrics.chunkCount} > ${baseline.chunkCount}` : null,
    metrics.rawBytes > baseline.rawBytes ? `rawBytes ${metrics.rawBytes} > ${baseline.rawBytes}` : null,
    metrics.gzipBytes > baseline.gzipBytes ? `gzipBytes ${metrics.gzipBytes} > ${baseline.gzipBytes}` : null,
  ].filter((value): value is string => Boolean(value));

  return { status: regressions.length === 0 ? "within-baseline" as const : "investigate" as const, regressions };
}
