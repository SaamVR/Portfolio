import assert from "node:assert/strict";
import test from "node:test";
import { validateProxyUploadInput } from "./route";

const baseInput = {
  fileSize: 1024,
  fileType: "image/png",
  storeId: "11111111-1111-4111-8111-111111111111",
  path: "stores/11111111-1111-4111-8111-111111111111/cms/asset.png",
};

test("proxy upload accepts legitimate image media inside the store namespace", () => {
  const result = validateProxyUploadInput(baseInput);
  assert.deepEqual(result, { ok: true, contentType: "image/png" });
});

test("proxy upload rejects non-media MIME types even if a caller tries the fallback directly", () => {
  const result = validateProxyUploadInput({ ...baseInput, fileType: "text/html" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 415);
});

test("proxy upload rejects traversal-like or cross-store object paths", () => {
  const traversal = validateProxyUploadInput({
    ...baseInput,
    path: "stores/11111111-1111-4111-8111-111111111111/../other-store/payload.svg",
  });
  assert.equal(traversal.ok, false);

  const crossStore = validateProxyUploadInput({
    ...baseInput,
    path: "stores/22222222-2222-4222-8222-222222222222/cms/asset.png",
  });
  assert.equal(crossStore.ok, false);
});

test("proxy upload enforces the server fallback size ceiling", () => {
  const result = validateProxyUploadInput({ ...baseInput, fileSize: 4 * 1024 * 1024 + 1 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
});
