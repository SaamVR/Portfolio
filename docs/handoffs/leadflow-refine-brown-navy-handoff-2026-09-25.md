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

