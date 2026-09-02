import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { advanceEditorContext, editorContextMatches, type EditorContextToken } from "./editor-context";

const root = process.cwd();

test("editor context generation advances only when the active store changes", () => {
  const initial: EditorContextToken = { storeId: "store-a", generation: 4 };
  assert.equal(advanceEditorContext(initial, "store-a"), initial);
  const switched = advanceEditorContext(initial, "store-b");
  assert.deepEqual(switched, { storeId: "store-b", generation: 5 });
  assert.equal(editorContextMatches(switched, initial), false);
  assert.equal(editorContextMatches(switched, { ...switched }), true);
});

test("CMS editor async paths reject stale store context before mutating shared UI", () => {
  const source = readFileSync(path.resolve(root, "src/views/admin/CmsPagesManager.tsx"), "utf8");
  const loadStore = source.slice(source.indexOf("const loadStore = useCallback"), source.indexOf("const currentSnapshot"));
  const sharedLibraries = source.slice(source.indexOf("const loadSharedLibraries"), source.indexOf("void loadSharedLibraries"));
  const loadRevisionsIndex = source.indexOf("const loadRevisions");
  const revisionsStart = source.lastIndexOf("const context = captureEditorContext()", loadRevisionsIndex);
  const revisionsEnd = source.indexOf("void loadRevisions", loadRevisionsIndex);
  assert.notEqual(loadRevisionsIndex, -1);
  assert.notEqual(revisionsStart, -1);
  assert.notEqual(revisionsEnd, -1);
  const revisions = source.slice(revisionsStart, revisionsEnd);
  const bootstrap = source.slice(source.indexOf("const bootstrapDefaultStore"), source.indexOf("const addPage"));
  const save = source.slice(source.indexOf("const saveAll"), source.indexOf("const restoreRevision"));

  assert.match(source, /editorContextRef\.current = advanceEditorContext/);
  assert.match(loadStore, /loadStoreRequestRef\.current === requestId && isEditorContextCurrent\(context\)/);
  assert.match(loadStore, /\.eq\("id", storeId\)/);
  assert.match(sharedLibraries, /if \(!isEditorContextCurrent\(context\)\) return;/);
  assert.match(revisions, /revisionsRequestRef\.current === requestId/);
  assert.match(revisions, /selectedPageIdRef\.current === pageId/);
  assert.match(revisions, /isEditorContextCurrent\(context\)/);
  assert.match(revisions, /if \(!isCurrentRevisionLoad\(\)\) return;/);

  assert.match(bootstrap, /const originStoreId = context\.storeId/);
  assert.doesNotMatch(bootstrap, /activeStoreId as string/);
  assert.match(bootstrap, /if \(isEditorContextCurrent\(context\)\) \{[\s\S]*await loadStore\(\)/);

  assert.match(save, /store\.id !== context\.storeId/);
  assert.match(save, /const originDraftStorageKey = getDraftStorageKey\(context\.storeId\)/);
  assert.match(save, /removeItem\(originDraftStorageKey\)/);
  assert.match(save, /if \(isEditorContextCurrent\(context\)\) \{[\s\S]*await loadStore\(\)/);
});
