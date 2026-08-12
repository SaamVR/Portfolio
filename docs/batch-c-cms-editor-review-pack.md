# Batch C Review Pack

Last updated: August 11, 2026

## Scope

This batch is the reviewable release slice for:
- CMS editor restructuring,
- Basic and Advanced editor shell organization,
- template-aware homepage and theme tooling,
- CMS library manager changes,
- blueprint retirement and replacement paths.

## Exact Batch C Files In The Current Worktree

### Admin CMS surfaces

- `src/views/admin/CmsPagesManager.tsx`
- `src/views/admin/CmsLibraryManager.tsx`
- `src/components/admin/OnboardingWizard.tsx`
- `src/components/admin/HomepageSectionChoiceCard.tsx`
- `src/components/admin/StorefrontSectionStyleStudio.tsx`

### CMS library manager internals

- `src/components/admin/cms-library/BlockRegistryEditorForm.tsx`
- `src/components/admin/cms-library/ThemeEditorForm.tsx`
- `src/components/admin/cms-library/mutations.ts`
- `src/components/admin/cms-library/mutations.test.ts`
- `src/components/admin/cms-library/shared.ts`
- `src/components/admin/cms-library/shared.test.ts`
- `src/components/admin/cms-library/useCmsLibraryEditor.ts`
- `src/components/admin/cms-library/useCmsLibraryManagerData.ts`

### Storefront editor shell and shared structure

- `src/components/storefront/editor/EditorHeader.tsx`
- `src/components/storefront/editor/EditorModeToggle.tsx`
- `src/components/storefront/editor/EditorPageSelector.tsx`
- `src/components/storefront/editor/EditorPreviewPane.tsx`
- `src/components/storefront/editor/EditorPreviewToolbar.tsx`
- `src/components/storefront/editor/EditorResizeHandle.tsx`
- `src/components/storefront/editor/EditorSaveState.tsx`
- `src/components/storefront/editor/EditorShell.tsx`
- `src/components/storefront/editor/EditorShellComponents.test.tsx`
- `src/components/storefront/editor/types.ts`
- `src/components/storefront/editor/useEditorSelection.ts`
- `src/components/storefront/editor/useEditorShellState.ts`

### Advanced editor subtree

- `src/components/storefront/editor/advanced/AdvancedModeLayout.tsx`
- `src/components/storefront/editor/advanced/AdvancedUnsupportedNotice.tsx`
- `src/components/storefront/editor/advanced/inspector/BlockAdvancedControls.tsx`
- `src/components/storefront/editor/advanced/inspector/DataBindingTab.tsx`
- `src/components/storefront/editor/advanced/inspector/InspectorPanel.tsx`
- `src/components/storefront/editor/advanced/inspector/ResponsiveTab.tsx`
- `src/components/storefront/editor/advanced/inspector/StyleTab.tsx`
- `src/components/storefront/editor/advanced/tree/BlockTreeNode.tsx`
- `src/components/storefront/editor/advanced/tree/BlockTreePanel.tsx`

### Basic editor subtree

- `src/components/storefront/editor/basic/BasicMobileDock.tsx`
- `src/components/storefront/editor/basic/BasicModeLayout.tsx`
- `src/components/storefront/editor/basic/BasicPanelHeader.tsx`
- `src/components/storefront/editor/basic/BasicRail.tsx`
- `src/components/storefront/editor/basic/BasicTabPillBar.tsx`
- `src/components/storefront/editor/basic/ThemePanel.tsx`
- `src/components/storefront/editor/basic/ThemePanel.test.tsx`
- `src/components/storefront/editor/basic/theme-recipes.ts`
- `src/components/storefront/editor/basic/theme-recipes.test.ts`
- `src/components/storefront/editor/basic/tabs/BasicContentTab.tsx`
- `src/components/storefront/editor/basic/tabs/BasicEffectsTab.tsx`
- `src/components/storefront/editor/basic/tabs/BasicLaunchTab.tsx`
- `src/components/storefront/editor/basic/tabs/BasicLayoutTab.tsx`
- `src/components/storefront/editor/basic/tabs/BasicPagesTab.tsx`
- `src/components/storefront/editor/basic/tabs/BasicStoreFlowTab.tsx`

### Editor shared field components

- `src/components/storefront/editor/shared/ColorField.tsx`
- `src/components/storefront/editor/shared/LinkPicker.tsx`
- `src/components/storefront/editor/shared/MediaField.tsx`
- `src/components/storefront/editor/shared/NumberStepper.tsx`
- `src/components/storefront/editor/shared/PropertyRow.tsx`
- `src/components/storefront/editor/shared/TextField.tsx`

### CMS template and editor registry support

- `src/lib/cms/page-templates.ts`
- `src/lib/cms/storefront-editor-registry.ts`
- `src/lib/cms/storefront-template-seeds.ts`
- `src/lib/cms/template-homepage-sections.ts`

## Retired Blueprint Files Removed In This Batch

- `src/app/templates/[blueprintId]/page.tsx`
- `src/components/admin/cms-library/BlueprintEditorForm.tsx`
- `src/components/admin/cms-library/PageBlueprintBlockEditor.tsx`
- `src/components/admin/cms-library/PageBlueprintEditorForm.tsx`
- `src/lib/cms/blueprint-pages.ts`
- `src/lib/cms/page-blueprints.ts`
- `src/lib/cms/store-blueprints.ts`

## Release Intent

Batch C should be reviewed and released as a CMS/editor architecture migration. It should not be mixed with:
- queue and deferred-processing rollout,
- storefront search rollout,
- platform ops and analytics refactors,
- public marketing page changes.

## Verification Baseline

Recommended focused verification for this batch:

- `npm.cmd run lint`
- `npm.cmd run typecheck -- --pretty false`
- targeted editor and CMS tests already present in the tree, especially:
  - `src/components/storefront/editor/EditorShellComponents.test.tsx`
  - `src/components/storefront/editor/basic/ThemePanel.test.tsx`
  - `src/components/storefront/editor/basic/theme-recipes.test.ts`
  - `src/components/admin/cms-library/mutations.test.ts`
  - `src/components/admin/cms-library/shared.test.ts`

## Migration Risk Notes

- This batch includes both additive editor structure and destructive blueprint retirement.
- Any release of this batch should confirm there are no remaining runtime references to retired blueprint files.
- Keep compatibility behavior where the repo intentionally supports both old and new field names or payload shapes during transition.
