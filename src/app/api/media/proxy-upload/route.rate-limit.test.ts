import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { POST, mediaProxyUploadRouteDeps } from "./route";

const original = {
  getAuthenticatedUser: mediaProxyUploadRouteDeps.getAuthenticatedUser,
  rateLimit: mediaProxyUploadRouteDeps.rateLimit,
};

afterEach(() => {
  mediaProxyUploadRouteDeps.getAuthenticatedUser = original.getAuthenticatedUser;
  mediaProxyUploadRouteDeps.rateLimit = original.rateLimit;
});

test("media proxy rejects rate-limited users before parsing an upload body", async () => {
  mediaProxyUploadRouteDeps.getAuthenticatedUser = async () => ({ id: "user_1" }) as never;
  mediaProxyUploadRouteDeps.rateLimit = async () => ({
    success: false,
    limit: 30,
    remaining: 0,
    reset: Date.now() + 60_000,
  });

  const response = await POST(new Request("https://example.com/api/media/proxy-upload", { method: "POST" }));
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: "Too many media upload attempts" });
});
