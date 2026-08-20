import test, { afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { POST, storePreviewTokenRouteDeps } from "@/app/api/stores/preview-token/route";

afterEach(() => {
  mock.restoreAll();
});

function previewRequest(storeId = "store_1") {
  return new Request("https://example.com/api/stores/preview-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ storeId }),
  });
}

describe("store preview token route", () => {
  test("rejects unauthenticated requests before creating an admin client", async () => {
    mock.method(storePreviewTokenRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClient = mock.method(storePreviewTokenRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("must not create admin client");
    });

    const response = await POST(previewRequest());

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClient.mock.callCount(), 0);
  });

  test("rejects users without store-management access", async () => {
    mock.method(storePreviewTokenRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(storePreviewTokenRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManage = mock.method(storePreviewTokenRouteDeps, "canManageStore", async () => false);

    const response = await POST(previewRequest());

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManage.mock.callCount(), 1);
  });

  test("creates a store-scoped 24-hour token through the service-role client", async () => {
    const nowMs = Date.parse("2026-08-20T02:30:00.000Z");
    const expectedExpiry = "2026-08-21T02:30:00.000Z";
    const deletedFilters: Array<[string, string]> = [];
    const insertedRows: Record<string, unknown>[] = [];

    const storeSelect: any = {
      eq: () => storeSelect,
      maybeSingle: async () => ({ data: { id: "store_1", slug: "threadbd" }, error: null }),
    };
    const cleanupDelete: any = {
      eq(column: string, value: string) {
        deletedFilters.push([column, value]);
        return cleanupDelete;
      },
      lt(column: string, value: string) {
        deletedFilters.push([column, value]);
        return Promise.resolve({ error: null });
      },
    };
    const tokenInsert: any = {
      select: () => tokenInsert,
      single: async () => ({
        data: { id: "11111111-1111-4111-8111-111111111111", expires_at: expectedExpiry },
        error: null,
      }),
    };
    const adminClient = {
      from(table: string) {
        if (table === "stores") {
          return { select: () => storeSelect };
        }
        if (table === "store_preview_tokens") {
          return {
            delete: () => cleanupDelete,
            insert: (row: Record<string, unknown>) => {
              insertedRows.push(row);
              return tokenInsert;
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };

    mock.method(storePreviewTokenRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(storePreviewTokenRouteDeps, "getSupabaseAdminClient", () => adminClient as never);
    mock.method(storePreviewTokenRouteDeps, "canManageStore", async () => true);
    mock.method(storePreviewTokenRouteDeps, "now", () => nowMs);

    const response = await POST(previewRequest());

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      previewUrl: "/stores/threadbd?preview=11111111-1111-4111-8111-111111111111",
      expiresAt: expectedExpiry,
    });
    assert.deepEqual(insertedRows, [{
      store_id: "store_1",
      created_by: "owner_1",
      expires_at: expectedExpiry,
    }]);
    assert.deepEqual(deletedFilters, [
      ["store_id", "store_1"],
      ["expires_at", "2026-08-20T02:30:00.000Z"],
    ]);
  });
});
