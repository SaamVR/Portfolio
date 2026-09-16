import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

test("production CSP contains no Firebase phone-auth or reCAPTCHA runtime allowances", () => {
  const source = readFileSync(path.join(process.cwd(), "next.config.js"), "utf8");

  assert.doesNotMatch(source, /NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN/);
  assert.doesNotMatch(source, /identitytoolkit\.googleapis\.com/);
  assert.doesNotMatch(source, /securetoken\.googleapis\.com/);
  assert.doesNotMatch(source, /google\.com\/recaptcha/);
  assert.doesNotMatch(source, /gstatic\.com\/recaptcha/);

  assert.match(source, /frame-ancestors 'none'/);
  assert.match(source, /object-src 'none'/);
  assert.match(source, /default-src 'self'/);
  assert.doesNotMatch(source, /script-src[^\n]*\*/);
  assert.doesNotMatch(source, /connect-src[^\n]*\*/);
});
