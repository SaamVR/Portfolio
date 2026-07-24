# Editor Remaining Work - Batched Tasks

This tracks the remaining work after the Basic + Advanced editor v1 implementation. Batches are ordered by launch value and dependency risk.

## Batch 1 - Make Basic Layout Choices Render For Real

Status: implemented and covered by authenticated preview smoke.

Goal: Basic Mode layout variant choices should visibly change the storefront, not only save metadata.

Tasks:
- Done: Teach `StorefrontBlockRenderer` and the underlying storefront blocks to read `block.layoutVariant`.
- Done: Implement visible variants for:
  - Hero: `full-bleed`, `split`, `centered`, `editorial`.
  - Featured products: `2-col`, `3-col`, `4-col`, `3-col-sidebar-left`, `3-col-sidebar-right`.
  - Category showcase: `cards`, `carousel`, `masonry`, `compact-list`.
- Done: Preserve the current default rendering when `layoutVariant` is empty.
- Done: Authenticated preview smoke captures Basic desktop/mobile screenshots and verifies layout-variant persistence.

Acceptance:
- Changing a variant in Basic Mode visibly updates the live preview.
- Saving and reloading preserves the selected variant.
- Existing stores without variants still render normally.

Verification:
- `npm.cmd run typecheck`
- targeted storefront/block tests where practical
- authenticated browser QA for Basic Mode variant changes

## Batch 2 - Expand Basic Mini-Editors

Status: implemented and covered by authenticated preview smoke.

Basic UX refinement:
- Done: Replace the inner icon-only Basic navigation with labeled top tabs.
- Done: Add a Start dashboard with recommended next action, quick entry cards, and readiness progress.
- Done: Rename outer Basic tabs from Setup/Editor to Guide/Customize to reduce navigation confusion.
- Done: Widen the Basic control panel slightly for more comfortable forms.
- Done: Remove the outer Basic tab layer entirely so Basic has one navigation model instead of nested Guide/Customize and inner tabs.
- Done: Keep Store Vibe and Smart Polish as a compact strip above the unified Basic editor.

Goal: Basic Mode should expose friendly controls for every supported block type instead of hiding most props behind advanced mode.

Tasks:
- Done: Add dedicated Basic mini-editors for `social-feed`, `video-reel`, `faq-accordion`, `trust-badges`, `testimonials`, `countdown`, and `recently-viewed`.
- Done: Add Section Coach copy for each block type with one practical merchant tip.
- Done: Add empty-state guidance for sections with no content.
- Done: Keep controls short and merchant-safe; no raw JSON or technical field names.
- Done: Authenticated preview smoke captures desktop/mobile Basic editor screenshots.

Acceptance:
- Every block type in the Basic Add Section picker has useful editable fields.
- Basic Mode no longer shows generic "advanced properties hidden" for common editable fields.
- Empty sections explain what to add and why it helps shoppers.

Verification:
- Passed: `npm.cmd run typecheck`
- Passed: `npx.cmd eslint src/components/storefront/BasicModeEditor.tsx`
- Passed: focused CMS/template tests
- Passed: mobile and desktop visual smoke coverage

## Batch 3 - Drag, Undo, And Editor Ergonomics

Status: implemented and covered by authenticated preview smoke.

Goal: Make section arrangement feel modern and forgiving.

Tasks:
- Done: Add native drag-and-drop reordering for the Basic section list.
- Done: Keep up/down buttons as accessibility and mobile fallback.
- Done: Add duplicate section support in Basic Mode.
- Done: Add clearer before/after handling for Smart Polish.
- Done: Add named checkpoint presets through the revision label flow.
- Done: Add drag-and-drop to the Advanced section list.

Acceptance:
- Dragging sections updates sort order and preview immediately.
- Undo/redo works after drag, duplicate, hide, and Smart Polish actions.
- Named checkpoints can be restored without losing current draft safeguards.

Verification:
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for Basic editor cleanup and Page Builder integration
- Passed: focused CMS/template tests
- Passed: authenticated editor smoke covers route load, persistence, and screenshots.
- Deferred: deeper drag/drop and revision restore interaction QA can remain as regression hardening, not a blocking batch.

## Batch 4 - Template Gallery Preview-As-My-Store

Status: implemented and covered by authenticated preview smoke.

Goal: Template selection should feel real and trustworthy before apply.

Tasks:
- Done: Replace placeholder template images with blueprint-rendered previews where available through Live Preview.
- Done: Add "Preview as my store" using current store name, theme, and personalized hero copy.
- Done: Add desktop/tablet/mobile preview toggle inside template preview.
- Done: Add clear change summary before applying built-in and community templates through the shared bundle apply flow.
- Done: Avoid hard reload after template apply; built-in templates now apply into the local Page Builder draft.

Acceptance:
- Template cards show real or generated storefront previews, not random stock placeholders.
- Merchant can preview a template with their store context before applying.
- Applying a template does not silently replace pages without confirmation.

Verification:
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for Template Gallery and Page Builder integration
- Passed: authenticated Template Gallery smoke covers gallery load, community apply, install tracking, review aggregation, and moderation.
- Deferred: cancel/import-specific smoke can remain as extra regression coverage, not a blocking batch.

## Batch 5 - Marketplace Hardening

Status: implemented in code; Supabase migrations applied; authenticated marketplace QA partially covered by gallery smoke.

Goal: Make template publishing safe enough for real merchant/community use.

Tasks:
- Done: Add moderation statuses: `draft`, `in_review`, `published`, `rejected`.
- Done: Add admin review surface for marketplace templates.
- Done: Add install counts, ratings, and review display.
- Done: Add serializer checks for phone numbers, emails, payment IDs, tracking pixels, merchant bucket URLs, and custom code.
- Done: Keep published templates as independent forks when installed.
- Done: Applied the marketplace hardening migration to the linked Supabase project.
- Done: Added authenticated smoke coverage for published community template listing, apply, install tracking, and review rating aggregation.
- Done: Added authenticated smoke coverage for creator publish submission plus admin approve/reject moderation.

Acceptance:
- User-published templates cannot go public without passing safety checks.
- Marketplace listing cards show status, install count, rating, category, and price/free state.
- Installing a template creates an editable copy, not a live dependency.

Verification:
- Passed: marketplace hardening migration applied through Supabase CLI.
- Passed: remote marketplace tables and RLS policies verified.
- Passed: serializer unit tests.
- Passed: authenticated Template Gallery route smoke.
- Passed: authenticated community template apply/install smoke with Supabase install-count verification.
- Passed: marketplace review aggregation smoke with Supabase rating-count verification.
- Passed: merchant publish submission smoke with `in_review:passed` Supabase verification.
- Passed: platform admin approval smoke with `published` and `reviewed_by` Supabase verification.
- Passed: platform admin rejection smoke with `rejected`, `reviewed_by`, and `rejection_reason` Supabase verification.

## Batch 6 - Authenticated Visual QA And Full-Suite Cleanup

Goal: Move from compile confidence to real launch confidence.

Tasks:
- Done: Add an authenticated Playwright path for `/admin/page-builder/basic`, `/admin/page-builder/advanced`, and `/admin/templates`.
- Done: Capture desktop and mobile screenshots for Basic Mode, Advanced inspector, and template gallery.
- Done: Add smoke coverage for save/reload persistence of `layoutVariant`, effects, and custom CSS/HTML.
- Done: Investigate and fix existing failures in `src/app/api/route-side-effects.test.ts`.

Acceptance:
- Editor routes pass authenticated visual QA.
- New editor persistence fields are verified end-to-end.
- Full repo test failures are either fixed or documented as unrelated known failures.

Verification:
- Passed: `npm.cmd run typecheck`
- Passed: `npx.cmd eslint` on touched editor files.
- Passed: focused CMS/template tests.
- Passed: authenticated Playwright smoke.
- Passed: full `npm.cmd test` suite.

## Basic UX Batch B1 - First-Glance Redesign

Status: implemented and covered by authenticated preview smoke.

Goal: Make Basic Mode feel like a calm merchant setup console instead of a dense admin form.

Tasks:
- Done: Make the Start screen the real home of Basic Mode.
- Done: Add larger guided action cards: Edit Homepage, Arrange Sections, Choose Style, Launch Check.
- Done: Reduce admin wording and use merchant-friendly action copy.
- Done: Improve readiness into Launch Confidence guidance instead of checklist clutter.
- Done: Surface page, visible section count, and mobile preview reminder in the Start summary.

Verification:
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for `BasicModeEditor.tsx`
- Passed: focused CMS/template tests
- Passed: authenticated visual smoke screenshots

## Basic UX Batch B2 - Section Editing Polish

Status: implemented and covered by authenticated preview smoke.

Goal: Make section content editing feel focused and friendly.

Tasks:
- Done: Redesign Content tab from accordion-heavy forms into clearer section cards.
- Done: Show one active section editor at a time.
- Done: Add previous/next controls for moving section-by-section.
- Done: Keep Section Coach inside the focused editor so guidance appears only for the active section.
- Done: Add richer recommended next-edit hints for hero, product path, trust proof, and mobile preview.

Verification:
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for `BasicModeEditor.tsx`
- Passed: focused CMS/template tests
- Passed: authenticated visual smoke screenshots

## Basic UX Batch B3 - Layout Builder Polish

Status: implemented and covered by authenticated preview smoke.

Goal: Make arranging sections feel visual and forgiving.

Tasks:
- Done: Make section reorder cards more visual with skeleton thumbnails.
- Done: Add skeleton previews to the selected section's layout variant choices.
- Done: Group layout variants by selected section instead of long stacked lists.
- Done: Improve drag affordance and keep arrow buttons as mobile/accessibility fallback.
- Done: Tune skeleton thumbnails per hero, product-grid, and category-showcase layout variant.

Verification:
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for `BasicModeEditor.tsx`
- Passed: focused CMS/template tests
- Passed: authenticated visual smoke screenshots

## Basic UX Batch B4 - Theme + Vibe Experience

Status: implemented and covered by authenticated preview smoke.

Goal: Make style selection feel like choosing a look, not configuring tokens.

Tasks:
- Done: Make Store Vibe feel like a design picker with visual swatches.
- Done: Move AI theme generation into the Theme tab in a calmer way.
- Done: Simplify color controls into Brand, Background, Text, and Accent.
- Done: Keep contrast warnings, but make them feel helpful rather than alarming.
- Done: Simplify the outer Basic strip to Quick Polish so style selection lives in Theme.

Verification:
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for `BasicModeEditor.tsx` and `CmsPagesManager.tsx`
- Passed: focused CMS/template tests
- Passed: authenticated visual smoke screenshots

## Basic UX Batch B5 - Mobile Basic Editor

Status: implemented and covered by authenticated preview smoke.

Goal: Make Basic Mode comfortable on phone-sized screens.

Tasks:
- Implemented: mobile Basic mode now shows the edit task only, with preview opened through the floating dock/full-screen sheet.
- Implemented: floating dock keeps Preview, Undo, Redo, and Save/Saved actions visible below desktop breakpoint.
- Implemented: preview overlay uses compact device toggles with icons and a sticky close header.
- Implemented: reduced cramped mobile controls in Basic tabs, palette grids, font buttons, add-section dialog, and editor padding.
- Passed: authenticated rendered mobile screenshot pass.

## Basic UX Batch B6 - Visual QA + Iteration

Status: in progress; authenticated smoke screenshots captured and second Basic preview polish pass implemented.

Goal: Verify the redesigned Basic editor in the browser and iterate from screenshots.

Tasks:
- Completed: started local Next dev server and confirmed `/admin/page-builder?mode=basic` loads without framework overlay, then redirects to `/admin/login` when unauthenticated.
- Completed: captured unauthenticated mobile smoke screenshot at `tmp/editor-qa/basic-mobile.png`.
- Implemented: added a compact mobile Basic task header with step count and progress so one-panel editing feels guided.
- Implemented: Basic readiness now tracks whether the merchant actually checked preview/mobile preview instead of showing a permanent placeholder.
- Implemented: Start, Layout, and Content copy/actions were tightened so Basic mode feels more like guided merchant setup and less like raw admin settings.
- Implemented: Theme, Effects, and Launch were converted toward guided decision cards, with a current-style summary, outcome-based motion controls, and actionable launch checklist rows.
- Completed: authenticated desktop/mobile Basic screenshots are generated by `npm.cmd run test:preview`.
- Implemented: compacted Start into a next-action strip, smaller task rows, and a tighter launch confidence summary.
- Implemented: reduced mobile task-card density and added bottom/dock-safe breathing room so the floating dock does not cover core task content.
- Completed: captured focused authenticated screenshots for Content, Layout, Theme, and mobile Preview overlay in the preview smoke.
- Implemented: removed editor selection chrome from the full-screen Basic preview overlay so it reads like a customer preview.
- Implemented: condensed Layout guidance into compact chips and improved Basic tab scroll padding to avoid clipped tab edges.
- Implemented: simplified Hero content editing by keeping button links and media in an optional details group.
- Implemented: compacted Theme palette presets into a featured set with a More Palettes disclosure.
- Implemented: made mobile preview device state explicit for smoke tests and opened the Basic mobile preview as a settled full-screen overlay.
- Implemented: forced editor preview entrance animations into a visible state so screenshots and merchant previews do not show washed-out blank hero content.
- Verified: `npm.cmd run typecheck`, targeted ESLint, and `npm.cmd run test:preview` passed after the Basic preview fixes.
- Implemented: compacted the Content section picker into a horizontal snap strip so the active mini-editor is visible sooner.
- Implemented: added an Essentials-first pattern to Basic mini-editors, moving labels, links, media, deadlines, videos, questions, badges, and reviews into disclosure groups.
- Verified: `npm.cmd run typecheck`, targeted ESLint for Basic editor files, and `npm.cmd run test:preview` passed after the Content density pass.
- Implemented: changed the mobile Basic task navigation into an icon grid so all eight tasks are visible without clipped tab labels.
- Verified: `npm.cmd run typecheck`, targeted ESLint for Basic editor files, and `npm.cmd run test:preview` passed after the mobile tab overflow fix.
- Implemented: tightened the mobile floating dock, added real bottom-safe space to the Basic scroll area, and hid the repeated Launch Confidence card on mobile so the dock no longer covers core Start content.
- Verified: `npm.cmd run typecheck`, targeted ESLint for Basic editor/Page Builder files, and `npm.cmd run test:preview` passed after the mobile dock collision fix.
- Implemented: started the Basic full section coverage plan with a shared `RepeatableListEditor` for FAQ, testimonials, and trust badges, including add/remove/reorder controls.
- Implemented: improved high-frequency block mini-editors with safer featured-products controls and rich-text alignment, keeping Basic controls limited to fields that actually persist.
- Verified: `npm.cmd run typecheck`, targeted ESLint for Basic editor files, and `npm.cmd run test:preview` passed after the repeatable-list coverage pass.
- Implemented: replaced Basic URL-only media fields with upload, media-library picker, preview, clear, and URL fallback controls for hero media, social images, and video reel media.
- Done: added richer Start guidance and variant-specific layout thumbnails; further visual tweaks can be handled from new screenshots as normal polish.

## Basic Full Section Coverage

Status: in progress; catalog-source pass implemented.

Tasks:
- Done: Replace bespoke FAQ/testimonial/trust list editors with one shared repeatable-list pattern.
- Done: Add reorder controls to FAQ questions, testimonial quotes, and trust badges.
- Done: Keep featured-products Basic editing honest by exposing title/count/label only until product-source selection is backed by schema and rendering.
- Done: Add rich-text alignment control alongside heading/body copy.
- Done: Add friendly upload controls with URL fallback for hero, social-feed, and video-reel media.
- Done: Add persisted product/category/source controls with matching schema and renderer support for featured products and category showcase.
- Done: Group Basic Pages into Content Pages, Store Flow Pages, and excluded System Pages.
- Done: Add Basic Store Flow Settings panels for Shop/Product Detail, Cart/Delivery, Checkout/Payment, and Account/Support.

## Basic UX Batch B7 - Catalog Sources And Page Organization

Status: implemented and covered by authenticated preview smoke.

Goal: Make Basic Mode feel more merchant-aware by exposing real catalog source choices and clearer page ownership.

Tasks:
- Implemented: Featured Products can choose featured-first, featured-only, all, newest, one category, or one product type.
- Implemented: Category Showcase can choose automatic, product categories, or product types with an item limit.
- Implemented: Storefront rendering honors the saved source, category, product type, and limit fields.
- Implemented: Pages tab groups content pages, store-flow pages, and platform/system pages.
- Done: add dedicated Store Flow settings panels for Product Detail, Checkout, Cart, Shop, and Account.
- Done: browser smoke covers Basic flow source/settings persistence with real Supabase rows.

Verification:
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for touched editor/storefront files
- Passed: `npm.cmd run test:preview`

## Basic UX Batch B8 - Store Flow Settings Panels

Status: implemented and covered by authenticated preview smoke.

Goal: Let Basic Mode handle store-flow pages without forcing merchants into raw block editing or the full Site Settings screen.

Tasks:
- Implemented: Basic Pages tab now includes a Store Flow Settings panel below grouped pages.
- Implemented: Shop/Product Detail controls for product visibility and product-page upsell behavior.
- Implemented: Cart/Delivery controls for delivery fee, zone labels, outside fee, and free delivery threshold.
- Implemented: Checkout/Payment controls for checkout mode, COD, bKash, Nagad, payment numbers, and prepaid badge text.
- Implemented: Account/Support controls for WhatsApp support visibility, number, and default message.
- Implemented: settings save through existing `site_settings` keys so storefront and admin settings stay aligned.
- Implemented: focused authenticated smoke coverage that saves Shop/Product, Cart/Delivery, Checkout/Payment, and Account/Support flow settings from Basic Mode and verifies matching `site_settings` rows.
- Done: authenticated smoke verifies WhatsApp button and cart delivery totals after Basic settings changes.

Verification:
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for `BasicModeEditor.tsx`
- Passed: `npm.cmd run test:preview`

## Basic UX Batch B9 - Store Flow Persistence QA

Status: implemented and verified.

Goal: Prove the new Basic Store Flow panels save real settings, not just local UI state.

Tasks:
- Implemented: stable test ids for the Basic Store Flow panel controls and save buttons.
- Implemented: preview smoke edits and saves product visibility, upsell title, delivery fees, checkout mode, payment badge, and WhatsApp support.
- Implemented: preview smoke polls Supabase `site_settings` for the saved values.
- Completed: fixed a Basic Store Flow hydration race so late settings fetches do not overwrite dirty unsaved merchant edits.
- Passed: `npm.cmd run typecheck`.
- Passed: targeted ESLint for `BasicModeEditor.tsx` and `tests/preview-smoke.spec.ts`.
- Passed: `npm.cmd run test:preview`.

## Basic UX Batch B10 - Remaining Batch Closure

Status: implemented and verified.

Goal: Close the remaining code-backed batches by turning stale manual QA notes into automated coverage or shipped UI polish.

Tasks:
- Implemented: richer Start-screen recommended edit hints for hero copy, product path, trust proof, and mobile preview.
- Implemented: variant-specific skeleton thumbnails for hero, featured-products, and category-showcase layout variants.
- Implemented: storefront WhatsApp button test id and cart total test ids.
- Implemented: authenticated smoke verifies the saved Basic WhatsApp support setting appears on the storefront.
- Implemented: authenticated smoke seeds a cart item and verifies saved Basic delivery fee settings affect cart delivery and grand totals.
- Completed: updated stale pending tracker lines that are now covered by authenticated smoke.

Verification:
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for touched files
- Passed: `npm.cmd run test:preview`

## Basic UX Batch B11 - Basic Polish Closure

Status: planned next after current verified flow.

Goal: Use current smoke screenshots to finish subjective Basic Mode polish without adding new editor concepts.

Tasks:
- Pending: review latest desktop/mobile Basic screenshots for density and confusing copy.
- Pending: make only small spacing/copy/control-grouping changes that improve merchant clarity.
- Pending: mark Basic UX B6 complete after the screenshot pass no longer shows obvious cramped or admin-like surfaces.

## Batch 12 - Import/Export Safety

Status: implemented and verified.

Goal: Make imports safer by showing what will change before applying a bundle.

Tasks:
- Implemented: import analyzer now summarizes theme field changes.
- Implemented: import analyzer now lists affected pages and section count changes.
- Implemented: existing-page layout replacement shows an explicit warning before Apply.
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for touched editor/template files.
- Passed: `npm.cmd run test:preview`

## Batch 13 - Advanced Mode Pro Controls

Status: started and verified.

Goal: Improve the Advanced inspector with practical agency workflow controls.

Tasks:
- Implemented: Visual CSS Inspector now supports copying and pasting block style maps.
- Pending: deeper breakpoint-specific UX and rollback polish.
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for touched editor/template files.
- Passed: `npm.cmd run test:preview`

## Batch 14 - Template Preview Quality

Status: started and verified.

Goal: Make template cards easier to evaluate before preview/apply.

Tasks:
- Implemented: template cards now show compact category, aesthetic, and mobile readiness trust signals.
- Pending: generated/stored preview screenshots if current live previews are still too static.
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for touched editor/template files.
- Passed: `npm.cmd run test:preview`

## Batch 15 - Regression Coverage

Status: pending.

Goal: Add focused tests for deferred editor and template edge cases.

Tasks:
- Pending: drag/drop reorder and duplicate-section coverage.
- Pending: revision restore coverage.
- Pending: import analyze/cancel/apply coverage.
- Pending: marketplace moderation edge-case coverage.

## Batch 16 - Template Shop Page Coverage

Status: implemented and verified.

Goal: Ensure catalog-style templates include a visible Shop page in the page graph, while single-product/service-style templates stay focused.

Tasks:
- Implemented: catalog, menu, digital, preorder, multi-vendor, and inquiry commerce blueprints now receive a generated `/shop` store-flow page when missing.
- Implemented: single-product templates do not receive a generated `/shop` page.
- Implemented: existing persisted catalog stores get the missing Shop page at store resolution and in Page Builder mapping.

Verification:
- Passed: `npm.cmd run typecheck`
- Passed: targeted ESLint for blueprint/resolver/Page Builder files
- Passed: `npx.cmd tsx --test src/lib/cms/blueprint-pages.test.ts`
