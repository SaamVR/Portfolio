# LeadFlow brown + navy refinement handoff — 2026-09-25

## Status

Production complete.

Canonical site:
- https://leadflow-ai-bhy.pages.dev/

Immutable deployment for this release:
- https://f6242701.leadflow-ai-bhy.pages.dev/

Variant routes:
- https://leadflow-ai-bhy.pages.dev/refine-brown/
- https://leadflow-ai-bhy.pages.dev/refine-navy/

The existing green root remains unchanged.

## Authoritative source

PR:
- #30 — Add brown and navy LeadFlow refinement variants
- https://github.com/SaamVR/Portfolio/pull/30

Reviewed branch head:
- `6fde2bf2e1bc868555fa292577e7336f9406d142`

Squash merge:
- `4ef0ff659718f7c2060380f6d4327fb81cd3974c`

Preservation branch:
- `preserve/leadflow-refine-brown-navy-f6242701-20260925`

## Route architecture

Both variants reuse the current production runtime:
- `/styles.css`
- `/app.js`
- `/dashboard.js`
- `/storytelling.js`

Each route adds only:
- its own `index.html`
- its own `theme.css`

No variant-specific JS fork was introduced.

## Brown direction

Route:
- `/refine-brown/`

Dominant system colors:
- dark accent: `#B98667`
- light accent: `#7A4F36`

Direction:
- espresso / dark cocoa surfaces
- warm brown interface identity
- yellow remains review / attention
- brick red remains action / failure

## Navy direction

Route:
- `/refine-navy/`

Dominant system colors:
- dark accent: `#76A9DA`
- light accent: `#285F93`

Direction:
- midnight navy / steel-blue surfaces
- blue interface identity
- yellow remains review / attention
- brick red remains action / failure

## QA evidence

Final branch QA:
- GitHub Actions run: https://github.com/SaamVR/Portfolio/actions/runs/36178040236
- successful run attempt: 2
- review artifact: `leadflow-refine-brown-navy-review`
- artifact ID: `10883461735`

Verified:
- variant contract PASS
- full Node regression PASS
- syntax PASS
- brown responsive / interaction matrix PASS
- navy responsive / interaction matrix PASS
- brown whole-page contrast PASS
- navy whole-page contrast PASS
- brown full six-chapter guided-tour motion audit PASS
- navy full six-chapter guided-tour motion audit PASS
- brown visual capture PASS
- navy visual capture PASS

Browser review artifact includes:
- desktop dark/light hero, middle and ending captures
- mobile dark/light hero captures
- all guided-tour chapters at 1440 and 390 for both palettes

## Production verification

Deployment path:
- authenticated Wrangler CLI on `samvr`
- clean detached worktree from merged `origin/main`
- isolated Wrangler npm cache

Cloudflare project:
- `leadflow-ai`

Immutable deployment:
- https://f6242701.leadflow-ai-bhy.pages.dev/

Live verification passed on immutable and canonical:
- root green page present
- `/refine-brown/` present
- `/refine-navy/` present
- `/v1/`, `/v2/`, `/v3/` present
- root `index.html`, `styles.css`, `app.js`, `dashboard.js`, `storytelling.js` byte-match merged source
- brown `index.html` + `theme.css` byte-match merged source
- navy `index.html` + `theme.css` byte-match merged source
- root / V2 / V3 qualification APIs report deterministic v2 engine
- V1 qualification API reports deterministic v1 engine

## Future rules

1. Preserve the green root as an independent presentation.
2. Preserve `/refine-brown/` and `/refine-navy/` as independent variants.
3. Do not fork app/story JS per variant unless behavior genuinely diverges.
4. Future functional fixes should preferably land in the shared root runtime so all three current presentations benefit.
5. Any future palette changes must keep yellow as review/attention and brick red as urgency/failure unless explicitly redesigned.
6. Do not overwrite the preservation branch.
7. Use immutable deployment `f6242701` as the rollback point for this release.

## Neutral canvas refinement — 2026-09-25

A second palette refinement was applied to both variants to remove the large brown/navy environmental tint while retaining each identity color as an accent system.

Authoritative refinement:
- PR #31 — Refine LeadFlow variants with neutral white-grey canvas
- reviewed branch head: `9e61d1880ebc579da19e7c80c4bf0f1b093fbe14`
- squash merge: `3fc85ff2a2a6ca438a1ec65e8411b52526cdabd1`
- preservation branch: `preserve/leadflow-neutral-canvas-d75eb77f-20260925`
- immutable deployment: https://d75eb77f.leadflow-ai-bhy.pages.dev/
- canonical deployment: https://leadflow-ai-bhy.pages.dev/

Refined canvas:
- fresh visits to both variants are light-first
- light page background: `#F6F7F7`
- light bands: `#EEF0F0`
- light cards: `#FFFFFF`
- dark page background: `#111315`
- dark bands: `#181A1C`
- dark cards: `#1D2022`

Identity colors are still preserved:
- brown dark accent `#B98667`
- brown light accent `#7A4F36`
- navy dark accent `#76A9DA`
- navy light accent `#285F93`
- yellow remains review / attention
- brick red remains urgency / failure

Large environmental surfaces now use neutral white-grey or graphite:
- body / section canvas
- nav chrome
- trust band
- workflow and brief cards
- demo container
- operations dashboard
- reliability
- architecture
- ROI / calculator
- blueprint planner
- case-study split
- portfolio-next card
- footer
- CRM workspace shells and cards

Verification:
- GitHub Actions run https://github.com/SaamVR/Portfolio/actions/runs/36184374172 PASS
- neutral-canvas variant contract PASS
- full Node regression PASS
- brown + navy responsive interaction matrices PASS
- brown + navy whole-page contrast audits PASS
- brown + navy full six-chapter guided motion audits PASS
- visual capture PASS
- live immutable and canonical source byte checks PASS
- root green production remains preserved
- V1 / V2 / V3 routes and qualification engine versions remain intact

For future palette work, treat immutable deployment `d75eb77f` and product commit `3fc85ff2a2a6ca438a1ec65e8411b52526cdabd1` as the current brown/navy baseline.

## Strict achromatic refinement — 2026-09-25

The neutral canvas was refined again after visual review because the earlier near-neutral values still carried a perceptible cool cast and the Operations workspace retained inherited green-tinted chrome.

Authoritative refinement:
- PR #32 — Make LeadFlow refinement canvases strictly achromatic
- reviewed branch head: `e387c19ef31681e644c937ced187111db9dac0d7`
- squash merge: `f6b177cd513a82143a26c123c71f62adb52c72b9`
- preservation branch: `preserve/leadflow-achromatic-c6c98fd8-20260925`
- immutable deployment: https://c6c98fd8.leadflow-ai-bhy.pages.dev/
- canonical deployment: https://leadflow-ai-bhy.pages.dev/

Current shared grayscale ladder:
- light page: `#F7F7F7`
- light bands: `#EFEFEF`
- light cards: `#FFFFFF`
- light secondary surfaces: `#F3F3F3` / `#EAEAEA`
- light borders: `#D2D2D2` / `#B8B8B8`
- light primary text: `#242424`
- light secondary text: `#444444`
- light muted text: `#666666`
- dark page: `#111111`
- dark bands: `#181818`
- dark cards: `#202020`
- dark secondary surfaces: `#262626` / `#282828`

All neutral palette values use equal RGB channels. Brown/navy are retained only for deliberate identity accents and selected/story states. Yellow remains review/attention and brick red remains urgency/failure.

Additional inherited tint cleanup covers:
- hero product panel and float cards
- theme-toggle chrome
- Operations dashboard and table
- Operations chart tracks / metadata / story ribbon
- CRM pipeline and tables
- Analytics v2 surfaces
- guided-tour chrome
- modal chrome
- ROI / blueprint / case / footer neutral surfaces

Final QA:
- GitHub Actions run https://github.com/SaamVR/Portfolio/actions/runs/36187432210 PASS
- strict achromatic contract PASS
- full Node regression PASS
- brown + navy responsive interaction matrices PASS
- brown + navy whole-page contrast audits PASS
- brown + navy full guided motion audits PASS
- visual capture PASS

Pixel verification from the final navy Operations capture:
- previous inherited table-header tint: RGB `(226,235,229)`
- current table header: RGB `(239,239,239)` = `#EFEFEF`
- current page background: RGB `(247,247,247)` = `#F7F7F7`
- primary cards: `#FFFFFF`

Live immutable and canonical byte/source verification passed, and V1/V2/V3 plus their qualification engine versions remain intact.

Treat product commit `f6b177cd513a82143a26c123c71f62adb52c72b9` and immutable deployment `c6c98fd8` as the current brown/navy refinement baseline.

## Navy guideline refinement — 2026-09-25

A navy-only design refinement was completed using the supplied Material Design, W3C, and NN/g references as the design/a11y standard.

Authoritative source:
- PR #33 — Refine LeadFlow navy design with motion and accessibility guidelines
- reviewed branch head: `e9b6f5d3e3c3ab58ee6eef2353fd546b5cf5cf74`
- squash merge: `a8d03aa665bc4291ea85178e93ad5a325647bd81`
- preservation branch: `preserve/leadflow-navy-guidelines-a8d03aa6-20260925`

Scope:
- only `refine-navy/theme.css`, the navy guideline test, and its QA workflow branch trigger changed
- no brown variant files changed
- no green root files changed
- no shared app/dashboard/story JS changed
- no qualification API behavior changed

Design changes:
- removes persistent decorative hero signal, workflow connector, flow-node, follow-up-card and Run-workflow CTA loops
- keeps intentional story/workflow motion event-driven
- standardizes navy motion tokens to 160ms / 240ms / 320ms with `cubic-bezier(.4,0,.2,1)`
- keeps route-level `prefers-reduced-motion` authoritative
- reduces sticky navigation to 64px desktop / 60px mobile
- changes sticky navigation from translucent blur to opaque high-contrast chrome
- preserves 44px minimum interaction targets despite smaller persistent chrome
- uses navy for identity, key actions, active navigation, focus, and meaningful state rather than large neutral surfaces
- converts the hero visual from ambient/glass styling to a crisper product diagram
- reduces heavy shadows / competing card emphasis
- makes “Watch LeadFlow in action” a tertiary hero action
- keeps architecture integration detail, engineering/API detail, and workflow planning progressively disclosed
- strengthens disclosure keyboard focus states
- changes the final CTA to a neutral surface with a navy keyline
- keeps yellow reserved for review/attention semantics in the refined hierarchy

Final QA:
- GitHub Actions run: https://github.com/SaamVR/Portfolio/actions/runs/36195433372
- artifact: `leadflow-refine-brown-navy-review`
- artifact ID: `10890316387`
- artifact digest: `sha256:5088182258df49749017f7c644f67eeafee12c6efa5e909e46d002669647fc60`
- navy guideline contract PASS
- full Node regression PASS
- syntax PASS
- brown responsive matrix PASS
- navy responsive matrix PASS
- brown contrast audit PASS
- navy contrast audit PASS
- brown six-chapter guided motion PASS
- navy six-chapter guided motion PASS
- final brown/navy visual captures PASS

Final visual review confirms:
- dark hero tertiary tour control no longer competes with primary CTAs
- capability strip uses navy/neutral hierarchy rather than decorative yellow
- light hero preserves strict grayscale canvas with controlled navy identity
- Operations reads as a restrained dashboard
- progressive-disclosure sections remain discoverable without dominating the page
- mobile header remains compact with 44px controls

Deployment state at handoff creation:
- source is merged and preserved
- canonical `/refine-navy/` still serves the prior `f6b177cd...` achromatic release
- Cloudflare deployment is pending because the authenticated `samvr` relay is offline and its SSH recovery host is unreachable
- `samai` is online but its local Wrangler credential is expired and no Cloudflare API token/account ID is present in its environment
- do not claim production deployment until the canonical route contains the `LEADFLOW NAVY — GUIDELINE REFINEMENT` marker and byte verification passes

When deployment access returns, deploy exact product merge `a8d03aa665bc4291ea85178e93ad5a325647bd81`, then:
1. verify immutable and canonical navy `theme.css` byte-match the merge
2. confirm green root and brown variant remain unchanged
3. confirm `/v1`, `/v2`, `/v3` remain present
4. confirm root/V2/V3 qualification engine is deterministic v2 and V1 remains deterministic v1
5. create a deployment-ID preservation alias if desired and record the immutable Pages URL

