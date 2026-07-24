# COMMERCE Engine — Editor & Template Strategy v2

*Expanded from the original plan, grounded in the current `BasicModeEditor.tsx` / `BasicModeWizard.tsx` implementation.*

---

## 0. What already exists (baseline)

Worth stating plainly so the rest of this doc reads as "extend," not "rebuild":

- **`BasicModeEditor.tsx`**: icon-rail navigation (Pages / Content / Theme / Font), accordion-based block editor keyed off `block.props`, a working color system (primary/accent/background/foreground → hex), aesthetic picker (minimal / glassmorphism / fluid / brutalist / neumorphism), and effect toggles (scroll reveals, hover, parallax).
- **`BasicModeWizard.tsx`**: a step-engine that special-cases the homepage (brand → hero → promo → done) and falls back to a generic "switch to Advanced Mode" step for everything else.

The gaps this plan closes: the wizard only really knows about the homepage; there's no layout/structure editing (add/remove/reorder blocks); no per-block skeleton previews; no responsive/device split; no template browsing or marketplace; and Advanced Mode doesn't exist yet as a surface.

---

## 1. Vision

Two audiences, one engine, no compromise:

- **Basic Mode** — a merchant with zero technical background should be able to launch a genuinely good-looking store in under 15 minutes, guided at every step, unable to produce a broken or ugly result.
- **Advanced Mode** — an agency or technical seller should get Webflow/Framer-level control: DOM tree, CSS inspector, code injection, data binding — without ever feeling boxed in by the "friendly" layer underneath.

The unlock is **templates as the unit of value**, and the **editor as the thing that makes every template infinitely reconfigurable** without the user ever touching code.

---

## 2. Template Ecosystem

### 2.1 Improving current templates
Before adding new ones, each existing template should be upgraded to guarantee:
1. **Every block is basic-mode-editable** — no block should exist that only exposes props Advanced Mode can reach. If `BasicModeEditor`'s generic prop-fallback (title/subtitle/tagline/ctaText/badgeText) is hiding fields, those blocks need dedicated mini-editors like the wizard already does for `hero` and `promo-banner`.
2. **A skeleton/thumbnail asset per template + per layout variant** — needed for the visual pickers described below (§4.2, §2.3).
3. **A declared "page graph"** — every template should ship a list of pages it includes (Home, Product, Collection, Cart, Checkout, About, Contact, Custom) so the wizard can walk *any* template, not just homepage.
4. **Aesthetic-agnostic base styling** — templates should be built purely on CSS variables/tokens so any of the five (soon more) aesthetics can be applied to *any* template without redesign.

### 2.2 New template categories to add
Beyond the five in the original plan, add:

6. **Digital Product / Course / Download Store** — file delivery UI, license-key display, "what's included" comparison blocks, instant-access messaging. Big for BD's growing digital-goods sellers.
7. **Restaurant / Food & Beverage (F-commerce native)** — menu-grid instead of product-grid, delivery-radius/COD messaging up front, WhatsApp/Messenger order button as a first-class block (directly relevant to your SM Manager integration).
8. **Marketplace / Multi-vendor Lite** — vendor cards, "sold by" badges, per-vendor mini-storefront section — useful if you ever let sellers group under one storefront.
9. **Event / Pre-order & Launch Page** — countdown-to-launch, waitlist capture, "notify me" block, deposit/pre-order payment flow.
10. **Portfolio + Shop Hybrid** — for artists/creators (relevant to your own VRChat/3D-art commission work) blending case-study/gallery blocks with a lightweight shop.
11. **Nonprofit / Cause / Donation** — donation-tier blocks, impact-counter, story-driven long-form layout.

### 2.3 Layout variants within each template
Each category should expose **2–4 layout variants**, not just one fixed design, selectable via skeleton preview (see §4.2):
- Product grid density (2/3/4 per row)
- Sidebar filters left / right / top-drawer / none
- Hero style (full-bleed image, split-screen, video-bg, minimal-text-only)
- Nav style (top bar, sticky, mega-menu, hamburger-first even on desktop for a boutique feel)

### 2.4 Template preview & selection surface
A dedicated **Template Gallery** (separate from the editor):
- Grid of cards, each with a live-rendered (not static-image) mini iframe preview that auto-scrolls or cycles through 2–3 key sections on hover — far more convincing than a screenshot.
- Filters: category, aesthetic, "best for" (dropship / boutique / service / restaurant / digital), color mood.
- "Preview as my store" — before committing, user can see the template pre-filled with *their* store name/logo/existing product photos (huge trust-builder, low effort to implement since you already resolve theme vars dynamically).
- One-click "Use this template" → drops user straight into the Basic Mode wizard, already scoped to that template's page graph.

---

## 3. Theme Page — Brainstorm (expanded aesthetics)

Your five aesthetics are a strong base. Recommended additions, each mapped to concrete CSS-variable deltas your `updateThemeAesthetic` handler can drive:

| Aesthetic | Visual signature | Best for |
|---|---|---|
| Minimal *(existing)* | Clean, generous whitespace, subtle shadows | General retail, tech |
| Glassmorphism *(existing)* | Frosted/blurred translucent panels | Modern fashion, tech |
| Fluid / Organic *(existing)* | Blob shapes, soft radii, pastel gradients | Beauty, wellness, kids |
| Cubic / Brutalist *(existing)* | Sharp edges, thick borders, mono + accent | Streetwear, merch drops |
| Neumorphism *(existing)* | Soft extruded tactile UI | Premium/tech gadgets |
| **Editorial / Magazine** | Big serif display type, asymmetric grid, generous margins | Fashion lookbooks, boutique |
| **Retro / Y2K** | Chunky gradients, chrome text, grain texture | Gen-Z streetwear, merch |
| **Warm Craft / Artisan** | Paper/linen texture backgrounds, hand-drawn accents, earthy palette | Handmade goods, food |
| **Dark Luxury** | Near-black backgrounds, thin gold/metallic accents, serif headings | Jewelry, premium goods |
| **Playful Pop** | Bold saturated colors, rounded chunky buttons, sticker-style badges | Toys, youth brands, food |

Theme page structure (four sub-tabs, matching your existing `Tabs` pattern):
1. **Colors** — primary/accent/background/foreground (existing) + auto-generated palette suggestions (3 harmonious options) so users who don't know color theory aren't stuck picking hex codes cold.
2. **Aesthetic** — the grid above, each card rendering a tiny live CSS-variable-driven preview swatch (button + card + input), not just a text label.
3. **Typography** — existing heading/body font pickers, plus a **pairing recommendation**: when a user picks a heading font, auto-suggest 2 body fonts that pair well, flagged with a small "Recommended" badge.
4. **Radius & Density** — a simple slider (Sharp ↔ Rounded) and (Compact ↔ Spacious) that maps to `--radius` and spacing tokens — gives power without exposing raw CSS.

---

## 4. Basic Mode — Deep Dive

### 4.1 Guiding principle
**Progressive disclosure.** First glance = 4–5 big friendly choices. Every choice can go deeper, but nothing is required to go deeper. The existing icon-rail (`Pages / Content / Theme / Font`) is the right shape — extend it, don't replace it.

Recommended nav (extending your `navItems` array):
```
Pages · Content · Layout · Theme · Effects · Font
```
Adding **Layout** as its own tab (currently layout/reordering isn't represented anywhere) and **Effects** as its own tab (currently effects are buried inside Theme — worth promoting since the plan calls them out as a distinct feature).

### 4.2 Layout tab (new)
This is the biggest functional gap today. Contents:
- **Section list** for the current page, each row = block type + a drag handle + up/down arrows (arrows as a fallback for low-dexterity mobile use, drag for desktop).
- **Toggle visibility** per section (eye icon) — hide without deleting.
- **Add Section** button → opens a picker of available block types *for this page type*, each shown as a **skeleton wireframe SVG**, not a text label. This directly extends the "Skeleton Previews for Layouts" idea in the original plan — apply it to whole sections, not just grid density.
- **Per-section layout options**, contextual to the block type — e.g. for `product-grid`: skeleton picker for 2/3/4-column and sidebar-left/right/none; for `hero`: skeleton picker for full-bleed/split/video-bg.

### 4.3 Guided Wizard — extending beyond homepage
Today `BasicModeWizard` special-cases `isHomepage` and gives every other page a dead-end "switch to Advanced Mode" message. Fix: define a **step-template per page type** (Product, Collection, Checkout, About/Contact, Custom-landing), each contributing its own array entries the same way `heroBlock`/`promoBlock` do today. Concretely: a `pageWizardConfig` map keyed by page type, each returning `{id, title, description, render}` steps — same shape already used, just generalized instead of hardcoded to homepage.

Add a **"Quick Setup" vs "Full Setup" fork** at wizard start: Quick = 3 essential steps (colors, hero, done); Full = every editable section on the page. Most merchants will pick Quick and go find Layout/Theme tabs later when curious — reduces first-session abandonment.

### 4.4 Web layout (confirmed direction)
- **Left panel (fixed ~360–420px):** the section-rail nav + active section content — this is what `BasicModeEditor` already renders.
- **Right panel:** live iframe preview, real-time reactive to every field change (debounced ~150ms to avoid jank on typing).
- **Top bar over the preview:** Desktop / Tablet / Mobile viewport toggle (resizes iframe container, not a separate render), plus a "Full Screen Preview" button that collapses the left panel to a slide-out drawer.
- **Addition:** a persistent **Undo/Redo** pair and **Autosave indicator** in the top bar on web too (currently only specified for mobile) — parity matters, and it de-risks experimentation, which is the whole point of "can't create a bad design."

### 4.5 Mobile layout (confirmed direction, refined)
- Full-screen settings-first UI, one section at a time (matches your icon-rail → becomes a bottom tab bar or a "Menu" root screen on mobile given limited width).
- **Floating Action Dock** (bottom-right, collapsible): Preview (eye) · Undo · Redo · Autosave status dot (idle/saving/saved states, small color pulse).
- **Preview overlay:** full-screen iframe slide-up, sticky "✕" top-right to dismiss. Add a tiny **device-toggle chip** even inside the mobile preview overlay (small/large phone) since "mobile" isn't one fixed size merchants think about, but this is a nice-to-have, not core.
- **One more mobile-specific addition:** a **bottom mini progress bar** while in wizard mode (reuses the existing `steps.map` dot logic in `BasicModeWizard`, just restyled thinner for small screens).

### 4.6 Effects Tab (promoted to top-level)
Extend the existing three toggles (scroll reveals, hover, parallax — already implemented) with:
- **Per-effect intensity**, not just on/off (Subtle / Medium / Bold) — one extra select per toggle, still zero-code.
- **Section-level override** — global effect settings apply everywhere by default, but each section in the Layout tab can override ("no parallax on this hero specifically").
- **New effect types**: Staggered reveal (list/grid items cascade in), CTA pulse/glow, image-zoom-on-hover for product cards, sticky-header-shrink-on-scroll.
- **Live-preview badge**: when hovering an effect option (not just selecting it), briefly trigger it in the right-pane preview so the user sees it before committing — small touch, big perceived quality.

### 4.7 Creative/UX touches (additions to the original three)
- **"I'm Feeling Lucky"** *(existing idea)* — extend to regenerate palette + font-pairing + aesthetic + effect intensity together as one bundled "look," with a quick before/after toggle so users can compare against their current setup before accepting.
- **Smart Contrast Checker** *(existing idea)* — also apply it automatically the moment an aesthetic or palette is applied, not just on manual picks, since palette generation could itself produce a low-contrast pairing.
- **Gamified Progress Tracker** *(existing idea)* — tie it to real launch-readiness, not vanity: Logo set, Colors set, ≥1 product added, Home/Product/Checkout pages touched, Payment method configured, Domain connected. Confetti + "Ready to publish" state, not just a checklist for its own sake.
- **New: Guided "What's this for?" onboarding question** — before the wizard even starts, ask category (fashion / food / digital / service / other) and vibe (2–3 word tags like "bold," "minimal," "cozy"). Use the answer to pre-select template category + aesthetic, so the very first screen the merchant sees already looks intentional instead of default.
- **New: Inline empty-state guidance** — every empty section (no products yet, no testimonials yet) shows a skeleton with a one-line "why this matters" tip instead of just blank space, so low-technical users understand *why* a section exists, not just how to fill it.

---

## 5. Advanced Mode — Deep Dive

Doesn't exist as a surface yet, so this is where to be most concrete.

### 5.1 Core structure
- **Full DOM/Block Tree Navigator** — left panel, collapsible nested tree mirroring the actual page/block/element structure (Page → Section → Block → sub-elements). Click-to-select syncs with the preview (and vice versa: click an element in the live preview to jump to its tree node — this bidirectional sync is what makes tools like Webflow feel powerful).
- **Visual CSS Inspector** — right panel, tabbed: Layout (flex/grid, gap, align), Spacing (visual box-model padding/margin), Typography (size/weight/line-height/letter-spacing/family override), Effects (shadow, radius, opacity, filter), Position (z-index, sticky/fixed/absolute).
- **Breakpoint switcher** at the top of the inspector — Desktop/Tablet/Mobile — every property edit made while a breakpoint is active writes a media-query-scoped override, not a global change. This is the single most-requested "pro" feature in visual builders; worth prioritizing early.

### 5.2 Code-level power
- **Global code injection** — `<head>`/`<body>` slots for tracking pixels, chat widgets, custom fonts.
- **Block-level custom CSS/HTML** — scoped class auto-generated per block so custom CSS can't leak and break the rest of the site.
- **Component override / "Eject to code"** — for a single block, let an agency replace the rendered output entirely with custom JSX/HTML while keeping it wired into the same props/data contract. This is the ceiling feature that makes Advanced Mode genuinely competitive with hand-coded sites.
- **Dynamic data binding** — bind any text/image field to store data (`product.price`, `product.inventory_count`, `store.meta_description`, `customer.name` for personalization). Expose via a small "🔗 Bind to data" icon next to any field, with a searchable field picker rather than requiring users to type dot-paths from memory.

### 5.3 Power-user quality-of-life
- **Multi-select + bulk styling** (shift-click multiple blocks in the tree, apply one style change to all).
- **Copy/paste style** (like Figma's "copy properties," paste onto another block).
- **Version history / named checkpoints**, separate from autosave — "Save as version: Pre-Eid campaign" — critical for agencies iterating for clients.
- **Comment/annotation mode** — pin a comment to a specific block, for agency-client review workflows without needing a separate tool.
- **Keyboard shortcuts** for tree navigation, duplicate, delete, undo/redo — signal of a "real" tool to power users.

### 5.4 Basic ↔ Advanced continuity
Critical UX rule: switching from Basic to Advanced must **never** lose or reset anything — Advanced Mode should just be "more panels exposed over the same underlying block/theme data," which your architecture already supports since both modes read/write the same `Store`/`StorePage`/`StorePageBlock` shape. Surface a small "You're now in Advanced Mode — all your Basic Mode settings are preserved" toast the first time a user switches, to reduce anxiety about "breaking" their site.

---

## 6. Export / Import & Template Marketplace

### 6.1 Export/Import Engine
- **"Theme Code" export** — one-click JSON bundle: theme tokens, aesthetic, effect settings, font choices, and (optionally) full page/block layout. Structured, versioned schema (`schemaVersion` field) so future editor changes don't break old exports.
- **Selective export** — let users choose "just theme" vs "theme + layout" vs "entire store," since a common use case is "I like this store's colors/fonts but not its layout."
- **Import with conflict preview** — before applying an imported theme/layout, show a diff-style preview ("this will change: primary color, heading font, hero layout") so users aren't surprised.
- **Shareable Theme Code link** — generates a short shareable code/URL others can import directly, not just a downloadable file — much lower friction for community sharing.

### 6.2 Template Marketplace
- **Publish flow**: creator selects a store/page → "Publish as Template" → set category, tags, cover preview, free/premium, price (if premium) → submitted for a lightweight automated + spot-check review (mainly: does it render clean at all three breakpoints, no broken links/placeholder text left in).
- **Revenue share model** for premium templates — direct incentive for your best agency/power users to keep producing quality templates instead of you having to build every category yourself.
- **Ratings + "used by N stores" social proof** on each template card.
- **Fork & customize** — installing someone else's template doesn't lock you to it; it becomes a normal editable copy immediately, Basic or Advanced.

---

## 7. Suggested build sequence

Given SM Manager and the CMS are meant to bundle together, a pragmatic order:

1. **Layout tab** (§4.2) — biggest functional gap, unlocks section add/remove/reorder that's currently entirely missing.
2. **Wizard generalization** (§4.3) — turns the wizard from "homepage only" into "any page," which is needed before the template gallery makes sense.
3. **Template Gallery + preview-as-my-store** (§2.4) — this is your strongest conversion lever for f-commerce sellers who want to see *their* shop, not a demo.
4. **Effects tab promotion + intensity controls** (§4.6) — cheap to add given the toggles already exist, high perceived-polish payoff.
5. **Export/Import** (§6.1) — needed as a prerequisite for the marketplace, and useful standalone (backup/restore, multi-store users).
6. **Advanced Mode v1** (§5.1–5.2: tree navigator + CSS inspector + breakpoints) — the highest-effort item, sequence it after Basic Mode is solid since most of your BD f-commerce sellers will live in Basic Mode day-to-day.
7. **Template Marketplace** (§6.2) — last, since it depends on a healthy population of well-built templates existing first (from you or early power users).
