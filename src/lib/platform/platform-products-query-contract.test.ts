import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const platformControlPlane = readFileSync(
  new URL("../../views/admin/PlatformControlPlane.tsx", import.meta.url),
  "utf8",
);

test("platform control plane reads only canonical product columns", () => {
  assert.match(
    platformControlPlane,
    /from\("products"\)\.select\("id, store_id, images, description"\)/,
  );
  assert.doesNotMatch(
    platformControlPlane,
    /from\("products"\)\.select\([^\n]*variants/,
    "PlatformControlPlane must not request the retired products.variants column",
  );
});

test("platform product telemetry keeps media-reference fields without stale variant ownership", () => {
  assert.match(
    platformControlPlane,
    /products: Array<\{ id: string; store_id: string; images\?: any; description\?: string \| null \}>;/,
  );
  assert.doesNotMatch(
    platformControlPlane,
    /products: Array<\{[^\n]*variants\?:/,
  );
  assert.match(platformControlPlane, /JSON\.stringify\(storeProducts\)/);
});
