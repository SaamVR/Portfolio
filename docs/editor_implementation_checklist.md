# Editor Implementation Checklist

This checklist turns the editor vision into concrete repo work so we can ship it in batches without losing the product goal.

## 1. Basic Mode Foundation

### 1.1 Template-aware editor rules

- [x] Add shared template-aware editor registry
  - Files:
    - `src/lib/cms/storefront-editor-registry.ts`
- [x] Make Basic Mode flow panels template-aware
  - Files:
    - `src/components/storefront/BasicModeEditor.tsx`
- [x] Make Basic block editor template-aware
  - Files:
    - `src/components/storefront/BasicBlockMiniEditor.tsx`
    - `src/lib/cms/storefront-editor-registry.ts`
- [x] Make Basic wizard page-type-aware and template-aware
  - Files:
    - `src/components/storefront/BasicModeWizard.tsx`
    - `src/lib/cms/storefront-editor-registry.ts`

### 1.2 Desktop Basic Mode UX

- [x] Add persistent undo/redo/autosave actions in Basic Mode header
  - Files:
    - `src/components/storefront/BasicModeEditor.tsx`
    - `src/components/storefront/StorefrontLiveEditor.tsx`
- [x] Add fullscreen preview action and preview-toolbar cleanup
  - Files:
    - `src/components/storefront/StorefrontLiveEditor.tsx`
- [x] Add clearer page/content/layout/effects/store-flow/launch nav grouping
  - Files:
    - `src/components/storefront/BasicModeEditor.tsx`

### 1.3 Mobile Basic Mode UX

- [x] Add mobile floating preview/undo/redo/autosave dock
  - Files:
    - `src/components/storefront/BasicModeEditor.tsx`
    - `src/components/storefront/StorefrontLiveEditor.tsx`
- [x] Add full-page mobile preview overlay with close button
  - Files:
    - `src/components/storefront/StorefrontLiveEditor.tsx`
- [x] Add mobile-first simplified section navigation
  - Files:
    - `src/components/storefront/BasicModeEditor.tsx`

## 2. Layout and Block Editing

### 2.1 Layout tab

- [x] Add template-aware layout variant options
  - Files:
    - `src/lib/cms/storefront-editor-registry.ts`
    - `src/components/storefront/BasicModeEditor.tsx`
- [x] Add richer skeleton previews per block/layout variant
  - Files:
    - `src/components/storefront/BasicModeEditor.tsx`
- [x] Add section preset cards and recommended layouts
  - Files:
    - `src/components/storefront/BasicModeEditor.tsx`
    - `src/lib/cms/storefront-editor-registry.ts`

### 2.2 Block editors

- [x] Hero block template-aware editing hints and field priority
- [x] Featured products block context-aware labels for food / subscriptions / hotel / property / inquiry
- [x] Category showcase block context-aware labels and discovery guidance
- [x] FAQ / trust / testimonials context-aware coaching by vertical
  - Files:
    - `src/components/storefront/BasicBlockMiniEditor.tsx`
    - `src/lib/cms/storefront-editor-registry.ts`

### 2.3 Advanced block control continuity

- [x] Keep block-level custom CSS/HTML isolated to Advanced Mode
- [x] Ensure Basic Mode never exposes dangerous markup editing
  - Files:
    - `src/components/storefront/StorefrontLiveEditor.tsx`
    - `src/components/storefront/BasicModeEditor.tsx`
    - `src/lib/cms/validation.ts`

## 3. Theme and Effects

### 3.1 Theme page

- [x] Expand aesthetics list and previews
- [x] Add density / radius controls
- [x] Add recommended palette sets
- [x] Add contrast helper and fix suggestions
  - Files:
    - `src/components/storefront/BasicModeEditor.tsx`
    - `src/lib/cms/store-theme-utils.ts`
    - `src/lib/themePresets.ts`

### 3.2 Effects tab

- [x] Promote effects into its own stronger editing section
- [x] Add effect intensity controls
- [x] Add section-level override UX
- [x] Add hover-preview effect demos
  - Files:
    - `src/components/storefront/BasicModeEditor.tsx`
    - `src/components/storefront/StorefrontBlockRenderer.tsx`
    - `src/lib/cms/store-theme-utils.ts`

## 4. Wizard and Onboarding

### 4.1 Merchant signup and onboarding continuity

- [x] Template-first signup flow
- [x] Template-aware onboarding field visibility
- [x] Template-aware onboarding field groups with richer previews
  - Files:
    - `src/components/admin/OnboardingWizard.tsx`
    - `src/lib/cms/onboarding-template-registry.ts`

### 4.2 Basic wizard rebuild

- [ ] Support homepage / product / collection / checkout / contact / custom page wizard configs
- [x] Add Quick Setup vs Full Setup
- [ ] Add mobile step progress UI
- [x] Add template-aware content and CTA coaching
  - Files:
    - `src/components/storefront/BasicModeWizard.tsx`
    - `src/lib/cms/storefront-editor-registry.ts`

## 5. Template System and Gallery

### 5.1 Template editing continuity

- [x] Preserve template-scoped settings and page snapshots on template switch
- [ ] Extend template-specific block presets and recommended page graphs
  - Files:
    - `src/views/admin/SiteSettings.tsx`
    - `src/lib/cms/template-site-settings-registry.ts`
    - `src/lib/cms/storefront-templates.ts`

### 5.2 Template gallery upgrade

- [ ] Improve template gallery cards with stronger previews and filters
- [ ] Add “preview with my store”
- [ ] Add more layout variants per template
  - Files:
    - `src/views/admin/TemplateGallery.tsx`
    - `src/lib/cms/template-gallery-preview.ts`
    - `src/components/storefront/StorefrontTemplateRenderer.tsx`

## 6. Advanced Mode Roadmap

### 6.1 Advanced Mode v1

- [ ] Tree navigator cleanup and stronger selection sync
- [ ] Visual inspector for spacing / typography / layout / effects
- [ ] Breakpoint-specific overrides
  - Files:
    - `src/components/storefront/StorefrontLiveEditor.tsx`
    - `src/components/storefront/DomTreeNavigator.tsx`
    - `src/components/storefront/VisualCssInspector.tsx`

### 6.2 Advanced Mode v2

- [ ] Scoped code injection UX
- [ ] Data binding UX
- [ ] Multi-select / style copy-paste
- [ ] Version checkpoints and annotations
  - Files:
    - `src/components/storefront/StorefrontLiveEditor.tsx`
    - `src/lib/cms/theme-export-import.ts`
    - new advanced-mode support modules

## 7. Export / Import / Marketplace

- [ ] Theme-only export/import
- [ ] Layout export/import with diff preview
- [ ] Block preset export/import
- [ ] Template publishing flow hardening
  - Files:
    - `src/lib/cms/theme-export-import.ts`
    - `src/lib/cms/template-publisher.ts`
    - `src/components/admin/TemplatePublishDialog.tsx`

## 8. Validation Standard Per Batch

Every editor batch should end with:

- [ ] `eslint` on changed files
- [ ] `tsc --noEmit`
- [ ] if UI changed materially, manual preview check in desktop + mobile mode
- [ ] check that template-aware behavior still falls back safely for generic templates
