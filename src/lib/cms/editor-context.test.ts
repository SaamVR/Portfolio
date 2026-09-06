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
  const managerSource = readFileSync(path.resolve(root, "src/views/admin/CmsPagesManager.tsx"), "utf8");
  const controllerSource = readFileSync(path.resolve(root, "src/lib/cms/editor-data-controller.ts"), "utf8");
  const commandSource = readFileSync(path.resolve(root, "src/lib/cms/editor-command-controller.ts"), "utf8");

  const workspaceRead = controllerSource.slice(
    controllerSource.indexOf("const reloadWorkspace = useCallback"),
    controllerSource.indexOf("const reloadSharedLibraries = useCallback"),
  );
  const sharedLibraries = controllerSource.slice(
    controllerSource.indexOf("const reloadSharedLibraries = useCallback"),
    controllerSource.indexOf("const reloadRevisions = useCallback"),
  );
  const revisions = controllerSource.slice(
    controllerSource.indexOf("const reloadRevisions = useCallback"),
    controllerSource.indexOf("useEffect(() => {", controllerSource.indexOf("const reloadRevisions = useCallback")),
  );
  const bootstrap = managerSource.slice(
    managerSource.indexOf("const bootstrapDefaultStore"),
    managerSource.indexOf("const addPage"),
  );

  assert.notEqual(workspaceRead.length, 0);
  assert.notEqual(sharedLibraries.length, 0);
  assert.notEqual(revisions.length, 0);
  assert.notEqual(bootstrap.length, 0);

  assert.match(controllerSource, /editorContextRef\.current = advanceEditorContext/);
  assert.match(workspaceRead, /const requestId = \+\+workspaceRequestRef\.current/);
  assert.match(workspaceRead, /currentContext: editorContextRef\.current/);
  assert.match(workspaceRead, /capturedContext: context/);
  assert.match(workspaceRead, /\.eq\("id", storeId\)/);
  assert.match(workspaceRead, /if \(!isCurrent\(\)\) return;/);

  assert.match(sharedLibraries, /const requestId = \+\+sharedLibraryRequestRef\.current/);
  assert.match(sharedLibraries, /currentContext: editorContextRef\.current/);
  assert.match(sharedLibraries, /capturedContext: context/);
  assert.match(sharedLibraries, /if \(!isCurrent\(\)\) return;/);

  assert.match(revisions, /const requestId = \+\+revisionRequestRef\.current/);
  assert.match(revisions, /currentPageId: selectedPageIdRef\.current/);
  assert.match(revisions, /pageId,/);
  assert.match(revisions, /currentContext: editorContextRef\.current/);
  assert.match(revisions, /capturedContext: context/);
  assert.match(revisions, /if \(!isCurrent\(\)\) return;/);

  assert.match(managerSource, /useCmsEditorDataController\(\{/);
  assert.match(managerSource, /useCmsEditorCommandController\(\{/);
  assert.match(managerSource, /reloadWorkspace: loadStore/);
  assert.doesNotMatch(managerSource, /const loadStore = useCallback/);
  assert.doesNotMatch(managerSource, /const loadSharedLibraries/);

  assert.match(bootstrap, /const originStoreId = context\.storeId/);
  assert.doesNotMatch(bootstrap, /activeStoreId as string/);
  assert.match(bootstrap, /if \(isEditorContextCurrent\(context\)\) \{[\s\S]*await loadStore\(\)/);

  assert.match(commandSource, /const saveStorefront = useCallback/);
  assert.match(commandSource, /store\.id !== context\.storeId/);
  assert.match(commandSource, /clearDraftForStore\(context\.storeId\)/);
  assert.match(commandSource, /if \(!isEditorContextCurrent\(context\)\) return \{ status: "stale" \}/);
  assert.match(commandSource, /await reloadWorkspace\(\)/);
  assert.doesNotMatch(managerSource, /persistStorefrontState/);
});
