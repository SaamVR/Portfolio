import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runDeleteStoreTransaction } from "./route";

test("store deletion delegates destructive work to one transactional RPC", async () => {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return {
        data: [{
          owner_user_id: "owner_1",
          deleted_all_owned_stores: true,
          banned: true,
          deleted_store_id: "11111111-1111-4111-8111-111111111111",
        }],
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  const result = await runDeleteStoreTransaction(client, {
    storeId: "11111111-1111-4111-8111-111111111111",
    actorId: "22222222-2222-4222-8222-222222222222",
    actorEmail: "admin@example.com",
    actorRole: "super_admin",
    adminNote: "Policy violation",
    banMerchant: true,
    isPlatformAdmin: true,
    createdAt: "2026-08-16T14:10:00.000Z",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.fn, "delete_store_transactional");
  assert.equal(calls[0]?.args.p_ban_merchant, true);
  assert.equal(calls[0]?.args.p_is_platform_admin, true);
  assert.deepEqual(result, {
    ownerUserId: "owner_1",
    deletedAllOwnedStores: true,
    banned: true,
    deletedStoreId: "11111111-1111-4111-8111-111111111111",
  });
});

test("transactional deletion surfaces database failures instead of continuing partially", async () => {
  const client = {
    rpc: async () => ({ data: null, error: new Error("transaction rolled back") }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    () => runDeleteStoreTransaction(client, {
      storeId: "11111111-1111-4111-8111-111111111111",
      actorId: "22222222-2222-4222-8222-222222222222",
      actorRole: "super_admin",
      adminNote: "Policy violation",
      banMerchant: true,
      isPlatformAdmin: true,
      createdAt: "2026-08-16T14:10:00.000Z",
    }),
    /transaction rolled back/,
  );
});
