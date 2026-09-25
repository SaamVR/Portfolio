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
