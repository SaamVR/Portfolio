# Template Blueprint System — Upgrade Plan

*Builds directly on the existing two-tier architecture: `store-blueprints.ts` (macro) + `page-blueprints.ts` / `page-templates.ts` (micro), both DB-backed via Supabase (`store_blueprints`, `page_blueprints`) with hardcoded fallback.*

This plan does both things the architecture review flagged as options — schema expansion and serialization — because they're sequenced dependencies, not alternatives: you can't serialize a store into a reusable template until the schema can actually represent everything the editor plan (§2–6 of the editor strategy doc) needs a template to carry.

---

## 1. Schema expansion (prerequisite — do this first)

### 1.1 `StoreTheme` — expand to carry rich aesthetics
Current fields: `presetId`, `mode`, `headingFont`, `bodyFont`, `customCssVars`.

Add:
- `aesthetic: "minimal" | "glassmorphism" | "fluid" | "brutalist" | "neumorphism" | "editorial" | "retro" | "artisan" | "dark-luxury" | "playful-pop"` — currently this is only being read/written on the editor side (`updateThemeAesthetic`); it needs a durable home on the theme object itself so it round-trips through save/export/publish.
- `radiusScale` and `densityScale` (numeric, e.g. 0–1) to back the Radius/Density sliders from the editor plan, instead of only `customCssVars` free-form overrides.
- `effects: { scrollReveals: boolean, hoverEffects: boolean, parallax: boolean, intensity: "subtle" | "medium" | "bold" }` — promotes the effect toggles (already read in `BasicModeEditor` via `store.theme.effects?.scrollReveals` etc.) from an assumed-optional shape to a declared schema field, since right now the editor is defensively reading a field the schema doc doesn't confirm exists yet.
- `paletteSource: "manual" | "generated"` + `paletteSeed` — lets "I'm Feeling Lucky" regenerate deterministically and lets exported templates reproduce the same generated palette on import rather than only exporting the resolved hex values.

### 1.2 `StorePageBlock` — standardize effect + layout-variant properties
Add universal, renderer-agnostic fields so any block can carry them without each block type inventing its own:
- `entranceAnimation: "none" | "fade" | "slide-up" | "zoom" | "stagger"`
- `hoverEffect: "none" | "lift" | "zoom" | "glow"`
- `effectOverride: boolean` — whether this block opts out of the theme-level default and uses its own settings (backs the "section-level override" feature from the editor plan).
- `layoutVariant: string` — free-form key resolved per block `type` (e.g. `product-grid` → `"3-col"` / `"4-col-sidebar-left"`; `hero` → `"full-bleed"` / `"split"` / `"video-bg"`). Keeping this as a per-type-resolved string (rather than one fixed enum) avoids a schema migration every time a new block type ships a new layout option.
- `visible: boolean` (default `true`) — backs the Layout tab's per-section visibility toggle; currently hiding a block likely means deleting it, which loses data on accidental toggle.

### 1.3 `businessFamily` / `catalogMode` — extend the enums for new template categories
The editor plan's new template categories map onto existing macro concepts rather than needing a new dimension:

| New category | `businessFamily` | `catalogMode` |
|---|---|---|
| Digital Product / Course | `commerce` (new) | `digital_download` *(new)* |
| Restaurant / F&B | `commerce` | `menu` *(existing)* |
| Marketplace / Multi-vendor Lite | `commerce` (new) | `multi_vendor` *(new)* |
| Event / Pre-order & Launch | `booking` *(existing)* or new `commerce` sub-mode | `pre_order` *(new)* |
| Portfolio + Shop Hybrid | `commerce` | `single_product` or `multi_product` + a new `showcasePages: boolean` flag rather than a whole new catalogMode |
| Nonprofit / Donation | new `businessFamily: "donation"` | `inquiry_only`-style, but likely needs its own `catalogMode: "donation_tiers"` |

Recommendation: treat `catalogMode` additions as low-risk (it's already an open enum pattern with fallbacks), but treat a brand-new `businessFamily` (`donation`) as higher-risk since `businessFamily` appears to drive checkout/payment defaults — needs its own default payment config path (e.g. no COD default, just bKash/card) before it's safe to ship.

### 1.4 Versioning
Add `schemaVersion` to both `StoreBlueprint` and `PageBlueprint` (and to the theme object) now, before any export/import or marketplace work begins. Every future field addition should bump this and the loader should know how to upgrade an old blueprint on read (fill new fields with safe defaults) rather than fail. This is cheap to add now and expensive to retrofit once real merchant stores and published templates exist on an unversioned shape.

---

## 2. Serialization: Store → Template ("Publish as Template")

### 2.1 Flow
1. **Snapshot**: read the live `Store` + all `StorePage`s + blocks + resolved `StoreTheme`.
2. **Strip merchant-specific data**: this is the part that needs the most care. Strip:
   - Real product data (SKUs, prices, inventory counts, images) → replace with placeholder/sample content pulled from a small curated "demo content" pool matched to the template's `catalogMode` (so a food template gets sample menu items, not empty grids).
   - Store identity: name, logo, domain, contact info, payment credentials (bKash/Nagad merchant IDs), analytics/tracking pixel IDs from any code-injection fields.
   - Customer/order data — none of this should ever be reachable from a page/theme snapshot, but worth an explicit allowlist-based serializer (only pull known-safe fields) rather than a blocklist-based one (strip known-bad fields), since a blocklist silently leaks anything new added later.
3. **Reconstitute as blueprint rows**: write a new `store_blueprints` row (with the theme, `recommendedPageSet`, `recommendedBlockSet`) and corresponding `page_blueprints` rows, tagged with a new `sourceType: "user_published"` (vs `"system"` for your hardcoded fallbacks) so the two can coexist and be moderated/filtered differently.
4. **Generate preview assets**: server-side render (or headless-browser screenshot) of each page at 2–3 breakpoints for the Template Gallery cards; store references, don't regenerate on every gallery load.

### 2.2 Data-safety gate
Before a template is publishable, run an automated check that fails the publish if any allowlist-serializer output still contains: a real phone number/email pattern, a payment credential shape, or a non-placeholder image URL from the merchant's own asset bucket. This is a cheap regex/pattern pass but an important one given the Bangladeshi merchant base will have real customer PII (phone numbers, WhatsApp handles) embedded in some block content.

---

## 3. Import: Template → Store

1. **Instantiate**: same hydration path already used today (DB blueprint → merge with fallback → instantiate store), just pointed at a `user_published` or `system` blueprint interchangeably — no new hydration logic needed, which is a nice consequence of the existing fallback-merge design already being blueprint-source-agnostic.
2. **Selective import** (from the editor plan §6.1): let the import flow accept a `scope: "theme_only" | "theme_and_layout" | "full"` parameter. `theme_only` writes just the `StoreTheme` object onto the existing store; `full` also replaces/creates pages and blocks. This is mostly a matter of the import function respecting scope rather than a schema change.
3. **Conflict preview**: diff the incoming blueprint's theme + page/block list against the current store's, surface a human-readable change list ("Primary color, heading font, and 3 page layouts will change") before committing.

---

## 4. "Theme Code" export/import (portable, outside the DB)

Distinct from the Template Sector flow above — this is the lightweight, shareable-link/JSON version:
- Export a signed JSON blob: `{ schemaVersion, theme, effects, aesthetic, layoutVariants[] }` (no page/block content unless `scope: "full"` requested) — reuses the same serializer as §2 but with a much smaller allowlist since there's no moderation step for a peer-to-peer share link.
- Import validates `schemaVersion` and applies the same defaulting-on-old-version logic from §1.4.
- Shareable link = a short-lived or permanent signed URL pointing at the stored JSON blob (Supabase storage), not the JSON embedded in the URL itself, so blobs can be updated/revoked and stay under URL length limits.

---

## 5. Template Sector (Gallery + Marketplace) — data model additions

New/extended tables beyond `store_blueprints` / `page_blueprints`:
- `template_listings`: `blueprint_id`, `creator_id`, `category`, `tags[]`, `aesthetic`, `price` (nullable = free), `status` (`draft` / `in_review` / `published` / `rejected`), `preview_asset_urls[]`, `install_count`, `rating_avg`.
- `template_reviews`: rating + short text, tied to `template_listings`.
- **Review queue**: `status = in_review` templates run through the §2.2 data-safety gate automatically, plus a manual spot-check step before flipping to `published`. Automated checks alone shouldn't be sufficient given the review already flagged this as needing "admins to create and publish new templates without deploying code" — the same admin surface should handle moderation, not just creation.
- **Fork tracking**: when a store is instantiated from a `template_listings` row, record `installed_from_template_id` on the store for install-count / "used by N stores" social proof, without creating any live coupling — an installed store is a full independent copy from that point on (matches the "fork & customize" principle from the editor plan).

---

## 6. Sequencing (how this slots into the broader editor build order)

Mapping onto the 7-step sequence from the editor strategy doc:

1. Schema expansion (§1 above) should land **before** step 1 (Layout tab) in that doc — the Layout tab's per-section visibility/reorder/variant picker needs `visible` and `layoutVariant` to exist on `StorePageBlock` first, otherwise the tab has nowhere to persist its state.
2. Effects schema fields (§1.2) should land **before** step 4 (Effects tab promotion) for the same reason.
3. Serialization (§2) and Theme Code export (§4) are prerequisites for step 5 (Export/Import) — build in that order since §4 reuses §2's serializer.
4. Template Sector data model (§5) is the direct backing for step 7 (Template Marketplace) — no changes needed to that step's position in the sequence, just confirming this is the schema it depends on.

**Net recommendation:** insert a "Step 0" — schema + versioning (§1.4, §1.1, §1.2) — before the editor build sequence begins. Everything downstream (Layout tab, Effects tab, Export/Import, Marketplace) either reads or writes these fields, so getting the shape right (and versioned) first avoids re-migrating live merchant stores later.
