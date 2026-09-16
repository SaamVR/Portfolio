#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import vm from "node:vm";

const BASELINE = { chunkCount: 31, rawBytes: 1_413_798, gzipBytes: 385_464 };
const manifestPath = process.argv.find((arg) => arg.startsWith("--manifest="))?.split("=").slice(1).join("=")
  ?? ".next/server/app/[slug]/page_client-reference-manifest.js";
const check = process.argv.includes("--check");

if (!existsSync(manifestPath)) {
  console.error(`Storefront client-reference manifest not found: ${manifestPath}`);
  process.exit(1);
}

const context = { globalThis: {} };
vm.runInNewContext(readFileSync(manifestPath, "utf8"), context, { filename: manifestPath });
const manifests = context.globalThis.__RSC_MANIFEST ?? {};
const manifest = manifests["/[slug]/page"] ?? Object.values(manifests)[0];
const entry = Object.entries(manifest?.clientModules ?? {}).find(([name]) => name.endsWith("/src/components/storefront/StorefrontPage.tsx"));
if (!entry) {
  console.error("StorefrontPage client entry was not found in the manifest.");
  process.exit(1);
}

const chunkPaths = [...new Set(entry[1].chunks.filter((value) => typeof value === "string" && value.endsWith(".js")))];
let rawBytes = 0;
let gzipBytes = 0;
for (const chunk of chunkPaths) {
  const file = `.next/${chunk}`;
  if (!existsSync(file)) continue;
  rawBytes += statSync(file).size;
  gzipBytes += gzipSync(readFileSync(file)).length;
}
const current = { chunkCount: chunkPaths.length, rawBytes, gzipBytes };
const regressions = Object.entries(current).filter(([key, value]) => value > BASELINE[key]);
console.log(JSON.stringify({ route: "/[slug]", baseline: BASELINE, current, regressions }, null, 2));
if (check && regressions.length > 0) process.exit(2);
