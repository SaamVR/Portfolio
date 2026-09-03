import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

test("cookie consent keeps 44px mobile decision and close targets", () => {
  const source = readFileSync(path.resolve(root, "src/components/CookieConsent.tsx"), "utf8");

  assert.match(source, /className="[^"]*min-h-11[^"]*"[\s\S]*?>\s*Decline\s*<\/button>/);
  assert.match(source, /className="[^"]*min-h-11[^"]*"[\s\S]*?>\s*Accept All\s*<\/button>/);
  assert.match(source, /className="[^"]*h-11[^"]*w-11[^"]*"[\s\S]*?aria-label="Close"/);
  assert.match(source, /className="flex-1 pr-12"/);
  assert.match(source, /<X className="w-4 h-4" \/>/);
});
