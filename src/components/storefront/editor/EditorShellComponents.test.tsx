import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AdvancedUnsupportedNotice } from "./advanced/AdvancedUnsupportedNotice";
import { EditorModeToggle } from "./EditorModeToggle";
import { EditorSaveState } from "./EditorSaveState";

test("disables Advanced Mode when the store plan does not include it", () => {
  const markup = renderToStaticMarkup(
    <EditorModeToggle mode="basic" onChange={() => undefined} canUseAdvanced={false} />,
  );

  assert.match(markup, /Advanced Mode is not included in this store plan/);
  assert.match(markup, /disabled=""/);
});

test("labels a changed draft as unsaved", () => {
  const markup = renderToStaticMarkup(
    <EditorSaveState state="idle" detail="Draft has changes" />,
  );

  assert.match(markup, />Unsaved</);
  assert.match(markup, /Draft has changes/);
});

test("explains plan-gated Advanced Mode and offers Basic Mode", () => {
  const markup = renderToStaticMarkup(
    <AdvancedUnsupportedNotice reason="plan" onSwitchToBasic={() => undefined} />,
  );

  assert.match(markup, /Advanced Mode is not included in this store plan/);
  assert.match(markup, /Switch to Basic Mode/);
});
