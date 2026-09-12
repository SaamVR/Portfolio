import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("specialized storefront renderers and shells stay behind dynamic imports", () => {
  const templateRenderer = source("src/components/storefront/StorefrontTemplateRenderer.tsx");
  const rendererBoundary = source("src/components/storefront/platform/StorefrontRendererBoundary.tsx");
  const shellBoundary = source("src/components/storefront/platform/StorefrontShellBoundary.tsx");

  assert.doesNotMatch(templateRenderer, /from ["']@\/components\/storefront\/(?:fashion-v3|threads)\//);
  assert.doesNotMatch(templateRenderer, /from ["']@\/components\/storefront\/StorefrontAdminMode["']/);
  assert.doesNotMatch(templateRenderer, /StorefrontLiveEditor|components\/storefront\/editor\//);
  assert.doesNotMatch(rendererBoundary, /StorefrontLiveEditor|components\/storefront\/editor\//);
  assert.doesNotMatch(shellBoundary, /StorefrontLiveEditor|components\/storefront\/editor\//);
  assert.match(rendererBoundary, /import\(["']@\/components\/storefront\/fashion-v3\/FashionV3BlockRenderer["']\)/);
  assert.match(rendererBoundary, /import\(["']@\/components\/storefront\/threads\/ThreadsBlockRenderer["']\)/);
  assert.match(shellBoundary, /import\(["']@\/components\/storefront\/fashion-v3\/FashionV3Shell["']\)/);
  assert.match(shellBoundary, /import\(["']@\/components\/storefront\/threads\/ThreadsShell["']\)/);

  // Public storefront content keeps Next's default SSR behavior; only the admin overlay opts out.
  assert.doesNotMatch(rendererBoundary, /ssr\s*:\s*false/);
  assert.doesNotMatch(shellBoundary, /ssr\s*:\s*false/);
  assert.match(templateRenderer, /StorefrontAdminMode\s*=\s*dynamic[\s\S]*?ssr\s*:\s*false/);
});
