import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { STOREFRONT_PERFORMANCE_BASELINE } from "@/lib/storefront-platform/performance/budgets";

function tsxFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    return statSync(path).isDirectory() ? tsxFiles(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

test("raw storefront image usage does not exceed the measured foundation baseline", () => {
  const files = [...tsxFiles("src/components/storefront"), ...tsxFiles("src/app")];
  const count = files.reduce((total, path) => total + (readFileSync(path, "utf8").match(/<img\b/g)?.length ?? 0), 0);
  assert.ok(count <= STOREFRONT_PERFORMANCE_BASELINE.rawStorefrontImageOccurrences,
    `raw <img> occurrences increased from ${STOREFRONT_PERFORMANCE_BASELINE.rawStorefrontImageOccurrences} to ${count}`);
});
