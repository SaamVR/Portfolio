import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  isCmsEditorRequestCurrent,
  reconcileCmsEditorSelectedPageId,
} from "./editor-data-controller-guards";

const pages = [
  { id: "page-a", isHomepage: false },
  { id: "home", isHomepage: true },
  { id: "page-b", isHomepage: false },
];

test("selected page reconciliation has deterministic requested/current/home/first precedence", () => {
  assert.equal(reconcileCmsEditorSelectedPageId(pages, "page-b", "page-a"), "page-b");
  assert.equal(reconcileCmsEditorSelectedPageId(pages, "missing", "page-a"), "page-a");
  assert.equal(reconcileCmsEditorSelectedPageId(pages, "missing", "missing"), "home");
  assert.equal(reconcileCmsEditorSelectedPageId([{ id: "first", isHomepage: false }], null, null), "first");
  assert.equal(reconcileCmsEditorSelectedPageId([], null, null), "");
});

test("request guard rejects stale request ids and stale store generations", () => {
  const storeA = { storeId: "store-a", generation: 2 };
  const storeB = { storeId: "store-b", generation: 3 };

  assert.equal(isCmsEditorRequestCurrent({
    currentRequestId: 4,
    requestId: 4,
    currentContext: storeA,
    capturedContext: storeA,
  }), true);
  assert.equal(isCmsEditorRequestCurrent({
    currentRequestId: 5,
    requestId: 4,
    currentContext: storeA,
    capturedContext: storeA,
  }), false);
  assert.equal(isCmsEditorRequestCurrent({
    currentRequestId: 4,
    requestId: 4,
    currentContext: storeB,
    capturedContext: storeA,
  }), false);
});

test("revision request guard also rejects a stale selected page", () => {
  const context = { storeId: "store-a", generation: 2 };
  assert.equal(isCmsEditorRequestCurrent({
    currentRequestId: 7,
    requestId: 7,
    currentContext: context,
    capturedContext: context,
    currentPageId: "page-new",
    pageId: "page-old",
  }), false);
});

test("CmsPagesManager delegates workspace, shared-library, and revision reads to the controller", () => {
  const manager = readFileSync(resolve(process.cwd(), "src/views/admin/CmsPagesManager.tsx"), "utf8");

  assert.match(manager, /useCmsEditorDataController/);
  assert.match(manager, /reconcileCmsEditorSelectedPageId/);
  assert.doesNotMatch(manager, /const loadStore = useCallback\(async/);
  assert.doesNotMatch(manager, /const loadSharedLibraries = async/);
  assert.doesNotMatch(manager, /\.from\("store_page_revisions"\)\s*\.select/);
  assert.doesNotMatch(manager, /loadBlockRegistry\(supabase\)/);
});
