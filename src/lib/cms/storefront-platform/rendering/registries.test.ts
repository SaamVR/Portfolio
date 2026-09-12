import assert from "node:assert/strict";
import test from "node:test";
import { resolveStorefrontRenderer, storefrontRendererFamilyRegistry } from "./renderer-registry";
import { resolveStorefrontShell, storefrontShellRegistry } from "./shell-registry";
import { getStorefrontTemplateDefinition, storefrontTemplateIds } from "@/lib/cms/storefront-templates";

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


test("all current templates preserve the legacy generic/fashion/threads rendering split", () => {
  for (const templateId of storefrontTemplateIds) {
    const template = getStorefrontTemplateDefinition(templateId);
    const renderer = resolveStorefrontRenderer(template);
    const shell = resolveStorefrontShell(template);

    if (templateId === "fashion") {
      assert.equal(renderer.implementationId, "fashion-v3");
      assert.equal(shell.id, "fashion-v3");
      continue;
    }

    if (templateId === "threads") {
      assert.equal(renderer.implementationId, "threads-earthy");
      assert.equal(shell.id, "threads-earthy");
      continue;
    }

    assert.equal(renderer.implementationId, "generic", templateId);
    assert.equal(shell.id, "classic-commerce", templateId);
  }
});
