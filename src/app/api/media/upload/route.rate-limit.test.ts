import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { POST, mediaUploadRouteDeps } from "./route";

const original = {
  getAuthenticatedUser: mediaUploadRouteDeps.getAuthenticatedUser,
  rateLimit: mediaUploadRouteDeps.rateLimit,
};

afterEach(() => {
  mediaUploadRouteDeps.getAuthenticatedUser = original.getAuthenticatedUser;
  mediaUploadRouteDeps.rateLimit = original.rateLimit;
});

test("media signing endpoint rejects rate-limited users before parsing JSON", async () => {
  mediaUploadRouteDeps.getAuthenticatedUser = async () => ({ id: "user_1" }) as never;
  mediaUploadRouteDeps.rateLimit = async () => ({
    success: false,
    limit: 60,
    remaining: 0,
    reset: Date.now() + 60_000,
  });

  const response = await POST(new Request("https://example.com/api/media/upload", { method: "POST" }));
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: "Too many media upload attempts" });
});
