# Flexible Multi-Style Storefront Platform Plan

## Summary
Turn the current merchant website flow into a fully data-driven, per-store configurable system without breaking existing stores. Keep the present commerce architecture as the live backbone, but remove hardcoded onboarding, template, theme, and placeholder-content assumptions so each merchant can create a distinct storefront safely. Build the system in two layers:

- Layer 1: a stronger commerce-first CMS engine for single-product, multi-product, fashion, gadgets, crafts, food, and similar stores.
- Layer 2: extension-ready vertical modules for hotels, real estate, service businesses, and booking/inquiry flows, added later without rewriting the core.

Use a phased rebuild of the current architecture. Do not replace the existing live engine outright. Introduce new schema and editor capabilities behind feature flags and compatibility adapters so current stores keep working.

## Key Changes

### 1. Replace hardcoded merchant creation with a template-driven launch pipeline
Current issues discovered:
- Onboarding is fixed to `clothing | food | general`.
- Draft creation is strongly tied to one `DraftState` shape and one 6-step flow.
- Template defaults contain hardcoded business copy, hero text, CTAs, promo messaging, FAQ content, and payment defaults.
- `defaultStore` is still the fallback source for page structure, trust copy, and demo visuals.

Plan:
- Introduce a `store_blueprints` model that becomes the source of truth for new-store creation.
- Each blueprint should define:
  - business family: `commerce`, later `booking`, `listing`, `service`
  - catalog mode: `single_product`, `multi_product`, `menu`, `inquiry_only`
  - onboarding schema: steps, fields, defaults, validations, optionality
  - recommended page set
  - recommended block set
  - default site settings payload
  - default theme binding
  - required capabilities
- Refactor onboarding to load its step sequence and defaults from the selected blueprint instead of `LaunchTemplateId`.
- Keep the current 3 templates as initial blueprint records migrated from code.
- Split onboarding from business logic:
  - `blueprint selection`
  - `brand identity`
  - `content setup`
  - `catalog mode`
  - `theme selection`
  - `payments / conversion`
  - `launch`
- Store owner selections should write only tenant-scoped rows. No fallback to shared mutable state.
- Keep `defaultStore` only as a last-resort demo/fail-safe object, not as a normal source for merchant sites.

### 2. Build a real theme package system instead of preset-only styling
Current issues discovered:
- `store_themes` stores only preset id, mode, fonts, radius, and color vars.
- `themePresets.ts` is a static code list.
- Merchants can select presets, but cannot truly create/export/import distributable themes.
- Theme structure is not versioned as a package.

Plan:
- Introduce `theme_packages` for reusable themes and keep `store_themes` as the installed theme instance for a store.
- `theme_packages` should contain:
  - id, slug, name, description, preview metadata
  - source type: `system`, `admin_shared`, `merchant_private`, later `merchant_submitted`
  - version
  - compatibility version
  - tokens: colors, typography, radius, spacing, shadows, motion, surfaces
  - component recipes: buttons, cards, badges, nav, hero, forms, section spacing
  - optional custom CSS with validation rules
  - export payload JSON
- `store_themes` should evolve to:
  - package reference
  - store-specific overrides
  - resolved token snapshot for rendering/cache
- Support these flows in v1:
  - merchant installs admin-provided shared theme
  - merchant edits store-local theme overrides
  - merchant exports current theme as JSON package
  - merchant imports a private JSON package into their own store
  - admin imports and promotes themes into the shared library
- Theme import/export should validate:
  - schema version
  - allowed tokens
  - no cross-store references
  - no unsafe CSS
- Keep theme sharing admin-curated first. Merchants can transfer privately, but shared distribution goes through admin approval.

### 3. Expand the CMS from fixed storefront patterns to a composition engine
Current issues discovered:
- Block types are fixed in code and their defaults are strongly commerce/fashion biased.
- Page templates are hardcoded in `page-templates.ts`.
- Site settings contain many fixed sections like `hero_section`, `home_featured`, `home_categories`, `promo_banner`, each with hardcoded labels/placeholders.
- `CmsPagesManager` and `SiteSettings` overlap in content responsibilities.

Plan:
- Define a block registry with three layers:
  - core blocks: text, hero, media, gallery, FAQ, CTA, trust, testimonials
  - commerce blocks: featured products, categories, upsells, cart-driven blocks
  - vertical extension blocks: booking widget, property cards, menu board, inquiry form, availability calendar
- Move block definitions into structured metadata rather than static code-only defaults.
- Each block type should define:
  - schema
  - editor fields
  - default props
  - preview behavior
  - required capabilities
  - compatible business families
- Replace code-hardcoded page templates with stored `page_blueprints`.
- Merge page-building responsibility into one clear content architecture:
  - `site_settings` for global store behavior and small global content
  - `store_pages` + `store_page_blocks` for page composition
  - no duplicated hero/promo/home-section authority across two separate systems long term
- Phase out highly specific hardcoded “home section” settings by mapping them into block instances on the homepage.
- Add layout modes per blueprint:
  - single product landing
  - classic catalog
  - editorial brand
  - menu/order
  - inquiry/catalog
- Keep existing pages and blocks backward-compatible through adapters.

### 4. Make business type and storefront behavior extensible without breaking commerce
Current issues discovered:
- Current schema is still commerce-first: products, orders, categories, types.
- Real estate, hotels, and similar use cases need different data models, but should not force a rewrite now.

Plan:
- Introduce `store_business_profiles` to declare a store’s active business family and enabled modules.
- Add extension boundaries rather than immediate schema replacement:
  - core engine remains `stores`, `store_pages`, `store_page_blocks`, `store_themes`, `site_settings`, `products`, `orders`
  - extension modules later add `listing_items`, `booking_resources`, `availability_rules`, `inquiry_requests`, `service_packages`
- For phase 1, support non-fashion industries through:
  - better blueprint content
  - better theme packs
  - better block combinations
  - catalog mode toggles like `single_product`, `inquiry_only`, `hidden prices`, `no cart`, `WhatsApp checkout`
- For later vertical phases, add:
  - hotel module: rooms, rates, amenities, availability, booking request
  - real estate module: properties, specs, media gallery, lead capture, inquiry scheduling
  - services module: packages, appointments, quote requests
- All vertical modules must plug into the same page builder, theme package system, analytics surface, and permission model.

### 5. Separate CMS configuration cleanly and harden tenant isolation
Plan:
- Keep tenant isolation strict: every blueprint instance, theme instance, page, block, and setting row remains store-scoped unless explicitly marked as system/admin-shared.
- Add explicit shared-library tables for:
  - blueprint definitions
  - page blueprints
  - theme packages
  - block registry metadata
- Shared assets must never mutate installed store copies in place.
- Installing a blueprint/theme should create a store-owned snapshot plus a reference to the source package/version.
- Add upgrade strategy:
  - store can view upstream blueprint/theme updates
  - store chooses whether to adopt them
  - never auto-overwrite merchant customizations
- Tighten CMS admin permissions around shared package creation/promotion/import.
- Continue using RLS to separate:
  - public storefront-readable rows
  - merchant-owned rows
  - admin-shared package rows
  - private configuration rows

### 6. Editor and UX improvements needed for uniqueness at scale
Plan:
- Redesign onboarding UI around blueprint-driven choice architecture:
  - business goal first
  - site style second
  - content and conversion setup third
- Add blueprint picker grouped by use case:
  - clothing
  - electronics/gadgets
  - crafts/handmade
  - food/menu
  - single product launch
  - general catalog
  - inquiry-led catalog
- Add theme browser with:
  - preview cards
  - install/apply
  - duplicate-and-customize
  - import JSON
  - export current theme
- Add “Save as private theme” for merchants.
- Add “Promote to shared library” for admins only.
- Add a store mode switch for:
  - single product storefront
  - multi-product storefront
  - browse only / inquiry only
- Remove category-specific placeholder bias from editors. Labels and defaults should come from blueprint metadata, not hardcoded fashion language.

## Public Interfaces / Schema Changes
New or evolved interfaces to plan for:
- `store_blueprints`
- `page_blueprints`
- `theme_packages`
- `store_theme_installs` or expanded `store_themes`
- `store_business_profiles`
- block registry metadata source
- versioned import/export JSON schemas for blueprint packages and theme packages

Important compatibility rules:
- existing `store_themes`, `store_pages`, `store_page_blocks`, and `site_settings` must continue to resolve existing stores unchanged during migration
- current `launchTemplates`, `page-templates`, and `themePresets` should become seed sources for database-backed packages, not disappear immediately
- current admin routes should keep functioning while progressively swapping to the new package-backed reads

## Test Plan
Core scenarios:
- existing stores render unchanged after blueprint/theme package tables are introduced
- onboarding can create stores from multiple blueprint families without touching any shared state
- one merchant’s theme edits never affect another store
- importing a theme package only affects the target store unless an admin explicitly promotes it
- installing a shared admin theme creates a store-local snapshot and does not mutate when the shared source changes
- homepage/page blueprint installation works for single-product and multi-product modes
- current 3 templates still produce valid stores after migration
- stores can export then re-import their own theme package losslessly
- RLS prevents merchants from reading other stores’ private theme/config rows
- admin-shared themes are readable/installable, but private merchant themes are not
- backward compatibility adapters correctly map old `site_settings` homepage content into page blocks until migration is complete

Acceptance checks:
- merchant can create a gadgets store without fashion-biased copy leaking in
- merchant can create a food or crafts store and fully restyle it
- merchant can choose admin themes, customize, export, and import safely
- CMS can support both single-product and multi-product storefront structures from the same core engine
- architecture is ready for later hotel/real-estate modules without redoing the builder or theme system

## Assumptions and Defaults
- Keep the current commerce engine as the production-safe base and do not replace it.
- Use a phased rebuild, not a big-bang rewrite.
- Use admin-curated shared theme distribution first.
- Merchant private import/export is in scope for v1 of the theme package system.
- Vertical engines for hotels/real-estate are planned as later modules, not built in the first commerce-first rebuild.
- The current 3 launch templates become seeded blueprint records and remain supported during migration.
- `defaultStore` remains only as demo/fallback infrastructure, not a normal merchant customization mechanism.
