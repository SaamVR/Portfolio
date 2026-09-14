import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

test("production CSP permits Firebase phone auth without weakening core framing/object policy", () => {
  const source = readFileSync(path.join(process.cwd(), "next.config.js"), "utf8");

  assert.match(source, /https:\/\/www\.google\.com\/recaptcha\//);
  assert.match(source, /https:\/\/www\.gstatic\.com\/recaptcha\//);
  assert.match(source, /https:\/\/recaptcha\.google\.com\/recaptcha\//);
  assert.match(source, /https:\/\/identitytoolkit\.googleapis\.com/);
  assert.match(source, /https:\/\/securetoken\.googleapis\.com/);
  assert.match(source, /NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN/);
  assert.match(source, /frame-src \$\{frameSrc\}/);

  assert.match(source, /frame-ancestors 'none'/);
  assert.match(source, /object-src 'none'/);
  assert.match(source, /default-src 'self'/);
  assert.doesNotMatch(source, /script-src[^\n]*\*/);
  assert.doesNotMatch(source, /connect-src[^\n]*\*/);
});
