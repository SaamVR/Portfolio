import assert from "node:assert/strict";
import test from "node:test";
import { FileText } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdvancedUnsupportedNotice } from "./advanced/AdvancedUnsupportedNotice";
import { EditorModeToggle } from "./EditorModeToggle";
import { EditorSaveState } from "./EditorSaveState";
import { EditorShell, type EditorShellProps } from "./EditorShell";
import type { Store, StorePage } from "@/lib/cms/schema";

const testPage = {
  id: "page-home",
  title: "Homepage",
  slug: "/",
  isHomepage: true,
  blocks: [],
} as StorePage;

function createShellProps(overrides: Partial<EditorShellProps> = {}): EditorShellProps {
  return {
    store: { name: "Wiring Test Store" } as Store,
    pages: [testPage],
    activePageId: testPage.id,
    onPageChange: () => undefined,
    mode: "basic",
    onModeChange: () => undefined,
    canUseAdvanced: true,
    saveState: "saved",
    basicItems: [{ id: "content", label: "Content", icon: FileText }],
    panelTitle: "Homepage",
    renderBasicPanel: (tab, page) => <div>Basic slot: {tab} / {page?.title}</div>,
    renderPreview: (page, breakpoint) => <div>Preview slot: {page?.title} / {breakpoint}</div>,
    renderAdvancedTree: (page) => <div>Tree slot: {page?.title}</div>,
    renderAdvancedInspector: (page, breakpoint) => <div>Inspector slot: {page?.title} / {breakpoint}</div>,
    onMobilePreview: () => undefined,
    onUndo: () => undefined,
    onRedo: () => undefined,
    onSave: () => undefined,
    saveLabel: "Saved",
    ...overrides,
  };
}

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

test("wires the selected page and breakpoint into Basic editor slots", () => {
  const markup = renderToStaticMarkup(<EditorShell {...createShellProps()} />);

  assert.match(markup, /Basic slot: content \/ Homepage/);
  assert.match(markup, /Preview slot: Homepage \/ desktop/);
  assert.match(markup, /Wiring Test Store/);
});

test("wires Advanced tree, inspector, and preview slots", () => {
  const markup = renderToStaticMarkup(
    <EditorShell {...createShellProps({ mode: "advanced", breakpoint: "tablet" })} />,
  );

  assert.match(markup, /Tree slot: Homepage/);
  assert.match(markup, /Inspector slot: Homepage \/ tablet/);
  assert.match(markup, /Preview slot: Homepage \/ tablet/);
});

test("does not render Advanced slots when the store plan blocks them", () => {
  const markup = renderToStaticMarkup(
    <EditorShell {...createShellProps({ mode: "advanced", canUseAdvanced: false })} />,
  );

  assert.match(markup, /Advanced Mode is not included in this store plan/);
  assert.doesNotMatch(markup, /Tree slot:/);
  assert.doesNotMatch(markup, /Inspector slot:/);
});


test("does not alias Publish to Save when no publish transition is provided", () => {
  const markup = renderToStaticMarkup(<EditorShell {...createShellProps({ saveLabel: "Save" })} />);

  assert.match(markup, />Save</);
  assert.doesNotMatch(markup, />Publish</);
});

test("renders a distinct publication action only when explicitly provided", () => {
  const markup = renderToStaticMarkup(
    <EditorShell {...createShellProps({ onPublish: () => undefined, publishLabel: "Unpublish", saveLabel: "Save" })} />,
  );

  assert.match(markup, />Save</);
  assert.match(markup, />Unpublish</);
});
