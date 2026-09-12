import assert from "node:assert/strict";
import test from "node:test";
import { resolveStorefrontRenderer, storefrontRendererFamilyRegistry } from "./renderer-registry";
import { resolveStorefrontShell, storefrontShellRegistry } from "./shell-registry";

test("renderer registry resolves existing renderer kinds without template-id branching", () => {
  assert.deepEqual(resolveStorefrontRenderer({ rendererKind: "generic" }), {
    familyId: "generic-commerce",
    implementationId: "generic",
  });
  assert.deepEqual(resolveStorefrontRenderer({ rendererKind: "fashion" }), {
    familyId: "editorial-commerce",
    implementationId: "fashion-v3",
  });
  assert.deepEqual(resolveStorefrontRenderer({ rendererKind: "threads" }), {
    familyId: "editorial-commerce",
    implementationId: "threads-earthy",
  });
  assert.equal(Object.keys(storefrontRendererFamilyRegistry).length, 2);
});

test("shell registry resolves independently from block renderer implementation", () => {
  assert.equal(resolveStorefrontShell({ rendererKind: "generic" }).id, "classic-commerce");
  assert.equal(resolveStorefrontShell({ rendererKind: "fashion" }).id, "fashion-v3");
  assert.equal(resolveStorefrontShell({ rendererKind: "threads" }).id, "threads-earthy");
  assert.equal(Object.keys(storefrontShellRegistry).length, 3);
});
