import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canManageStore } from "./supabase-route";

function createAuthorizationClient(options: {
  ownerId?: string | null;
  membershipRole?: string | null;
  platformRoles?: string[];
}) {
  return {
    from(table: string) {
      if (table === "stores") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: options.ownerId === undefined ? null : { id: "store_1", owner_id: options.ownerId },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === "store_memberships") {
        return {
          select() {
            const chain = {
              eq() {
                return chain;
              },
              maybeSingle: async () => ({
                data: options.membershipRole ? { role: options.membershipRole } : null,
                error: null,
              }),
            };
            return chain;
          },
        };
      }

      if (table === "user_roles") {
        return {
          select() {
            return {
              eq: async () => ({
                data: (options.platformRoles ?? []).map((role) => ({ role })),
                error: null,
              }),
            };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;
}

test("support and billing platform roles do not bypass tenant membership", async () => {
  for (const role of ["support_agent", "billing_admin", "co_admin"]) {
    const allowed = await canManageStore(
      createAuthorizationClient({ ownerId: "owner_1", platformRoles: [role] }),
      "store_1",
      "platform_user_1",
      ["owner", "admin"],
    );

    assert.equal(allowed, false, `${role} must not receive global store-manager access`);
  }
});

test("full platform admins retain global store-manager access", async () => {
  for (const role of ["admin", "super_admin"]) {
    const allowed = await canManageStore(
      createAuthorizationClient({ ownerId: "owner_1", platformRoles: [role] }),
      "store_1",
      "platform_user_1",
      ["owner", "admin"],
    );

    assert.equal(allowed, true, `${role} should retain full platform access`);
  }
});

test("store owners and explicitly allowed members retain access", async () => {
  assert.equal(
    await canManageStore(
      createAuthorizationClient({ ownerId: "merchant_1" }),
      "store_1",
      "merchant_1",
      ["owner", "admin"],
    ),
    true,
  );

  assert.equal(
    await canManageStore(
      createAuthorizationClient({ ownerId: "merchant_1", membershipRole: "admin" }),
      "store_1",
      "staff_1",
      ["owner", "admin"],
    ),
    true,
  );

  assert.equal(
    await canManageStore(
      createAuthorizationClient({ ownerId: "merchant_1", membershipRole: "editor" }),
      "store_1",
      "staff_2",
      ["owner", "admin"],
    ),
    false,
  );
});
