# LeadFlow Brown + Navy Refinement Variants — Production Handoff

Date: 2026-09-26

## Status

PRODUCTION COMPLETE.

The existing motion-refined green LeadFlow root remains unchanged. Two additional color-system variants are live:

- Brown: https://leadflow-ai-bhy.pages.dev/refine-brown/
- Navy: https://leadflow-ai-bhy.pages.dev/refine-navy/

Immutable production deployment:
- https://f6242701.leadflow-ai-bhy.pages.dev/
- Cloudflare deployment ID: f6242701-3a7f-464c-a0bd-e90ff5155e1e
- source commit: `4ef0ff659718f7c2060380f6d4327fb81cd3974c`
- Cloudflare Pages project: `leadflow-ai`
- environment: Production / main

Preservation branch:
- `preserve/leadflow-refine-brown-navy-f6242701-20260926`
- pinned to deployed product commit `4ef0ff659718f7c2060380f6d4327fb81cd3974c`

## Architecture

Both variants are thin presentation routes and reuse the production runtime:

- `/styles.css`
- `/dashboard.js`
- `/storytelling.js`
- `/app.js`
- root qualification API

Only route HTML plus a route-local `theme.css` differ. There are no forked application/storytelling/dashboard JS copies.

Files:
- `refine-brown/index.html`
- `refine-brown/theme.css`
- `refine-navy/index.html`
- `refine-navy/theme.css`

The root experience, V1, V2, V3, qualification rules, API behavior, copy, section order, motion directors, and the six-chapter guided product tour remain shared.

## Brown art direction

Dominant system palette:
- dark primary brown/copper: `#B98667`
- deep espresso: `#120F0D`
- raised cocoa surfaces: `#1B1512`
- focused surface: `#2A211C`
- light primary brown: `#7A4F36`

Yellow continues to represent review/attention and brick red continues to represent action/failure/urgency.

The theme explicitly recolors inherited success/system chrome across the hero, workflow, trust band, operations, reliability, architecture, ROI, workflow planning tool, product-delivery section, portfolio card, footer, and CRM surfaces.

## Navy art direction

Dominant system palette:
- dark steel blue: `#76A9DA`
- midnight background: `#0B111A`
- raised navy surfaces: `#101A27`
- focused surface: `#17283A`
- light primary navy: `#285F93`

Yellow continues to represent review/attention and brick red continues to represent action/failure/urgency.

The same full environmental recolor coverage applies; the page does not depend on green environmental surfaces.

## QA evidence

Authoritative final exact-head QA:
- run: https://github.com/SaamVR/Portfolio/actions/runs/36178040236
- tested feature head: `6fde2bf2e1bc868555fa292577e7336f9406d142`
- the product route/theme blobs on deployed `main` match that tested head

Results:
- variant contract: 7/7 PASS
- full Node regression: 107/107 PASS
- Brown responsive interaction matrix: PASS
- Navy responsive interaction matrix: PASS
- Brown whole-page contrast: PASS
- Navy whole-page contrast: PASS
- Brown guided six-chapter motion audit at 1440 and 390: PASS
- Navy guided six-chapter motion audit at 1440 and 390: PASS
- guided qualification stages observed: 0 → 1 → 2 → 3 → 4 → 5 → 6
- guided cancellation returns to `Watch LeadFlow in action` with no story left playing
- Brown visual capture: PASS
- Navy visual capture: PASS

Review artifact:
- artifact ID: `10883461735`
- name: `leadflow-refine-brown-navy-review`
- digest: `sha256:e6b1540b196de366689a8a617f81af2a1f62994f7841133ecd3f63c01e30d92c`

The final screenshots were visually reviewed after the full environmental recolor. Earlier screenshots showing residual green lower-page surfaces are superseded.

## Production verification

Canonical production:
- Brown route HTML matches current `main` byte-for-byte.
- Brown `theme.css` matches current `main` byte-for-byte.
- Navy route HTML matches current `main` byte-for-byte.
- Navy `theme.css` matches current `main` byte-for-byte.
- root / V1 / V2 / V3 smoke tests PASS.
- root / V2 / V3 qualification APIs report deterministic v2.
- V1 qualification API reports deterministic v1.

Immutable deployment `f6242701`:
- `index.html`, `app.js`, `dashboard.js`, `storytelling.js`, and `styles.css` match deployed source byte-for-byte.
- Brown route HTML/theme CSS match deployed source byte-for-byte.
- Navy route HTML/theme CSS match deployed source byte-for-byte.

## Deployment contract

The hardened Cloudflare Pages payload now preserves:
- root V4
- `/v1/`
- `/v2/`
- `/v3/`
- `/refine-brown/`
- `/refine-navy/`
- `/functions/`

Post-deploy smoke checks explicitly verify both refinement route markers and theme CSS markers, in addition to the existing root/version/API checks.

## Future work

Treat immutable deployment `f6242701` and preservation branch `preserve/leadflow-refine-brown-navy-f6242701-20260926` as the current color-variant baseline.

Do not fork the runtime JS into the refinement directories. Future functional or motion fixes should continue to land in the shared root runtime so all three visual variants inherit them.
