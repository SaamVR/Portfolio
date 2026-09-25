# NOVA R13 Guided Product Story — Production Completion Handoff

Date: 2026-09-25

Repository: `SaamVR/Portfolio`

Integration branch: `nova/v2-integration`

## Exact deployed site source

`e39dc80ea88a62eb560403ee2e84c12b31ab00a6`

This is the exact `nova/site/**` source deployed to both Cloudflare Pages branches:
- `main`
- `v2`

At completion the integration branch head was:

`c25009a2d6268137cdc5f75278955e402c8541f4`

A compare from the deployed source to the completion head contains only:
- QA workflow changes
- QA trigger files

There are no `nova/site/**` changes after `e39dc80…`.

## R13 refinement delivered

### Guided fast path
- Added an optional hero CTA for a short guided route.
- The route presents three product moments:
  1. Comfort
  2. Fold
  3. Controls
- Each moment drives real authored product state rather than a static slideshow.
- Comfort enters the close cushion study.
- Fold triggers the actual fold controller and holds the compact pose.
- Controls enters side inspection and the controls hotspot.
- Visitors can leave the guided route and continue the full experience.
- Mobile Hero keeps Explore NOVA + Guided tour on one compact row so the product/headline framing remains clean.

### Stronger V1-style motion
- Restored more deliberate source-animation choreography inspired by the preserved V1 experience.
- Strengthened the Design close pass so hotspot anchors visibly travel with the authored product motion.
- Final Design close-pass motion passes the 4px minimum hotspot movement guard on desktop and mobile.
- Sound / listening-mode scenes remain intentionally calmer so environmental changes carry more of the mode transition.

### Product-story clarity
- Portability copy now explains the product benefit:
  - earcups fold inward for a compact carry shape
  - the hinge is readable as a signature product movement
- Existing concept-product honesty from R12 remains:
  - no invented battery/weight/dimension data
  - listening/noise-control states are explicitly conceptual
  - Product Facts and FAQ remain available

### Compact portfolio handoff
- Replaced the redundant two-step Behind NOVA / case-study introduction with one compact transition:
  - `Designed like a launch.`
  - `Built like a product.`
- Behind section is genuinely constrained to the authored compact track:
  - `110svh` parent
  - `100svh` sticky transition
  - parent padding removed so padding cannot inflate the section to 124svh
- The product yields into the case study without repeating the same title twice.

### Client-facing evidence
- Added a Verified browser QA evidence section.
- It shows real covered browser states instead of invented performance marketing:
  - 1440 × 1000 desktop journey
  - 1024 × 768 tablet journey
  - 390 × 844 mobile journey
  - WebGL fallback
  - Reduced motion
  - GLTF failure
- No fake Core Web Vitals or unsupported performance numbers were added.

### Stronger client conversion ending
- Client-capabilities section remains after the case study.
- CTA now explicitly frames:
  - `Discuss a 3D product website`
  - `Copy a ready-to-send project brief`
- Existing capabilities remain:
  - Interactive product launches
  - Product configurators
  - Responsive 3D integration
  - Campaign experiences

## Regression fixes caught during R13

### Mobile Hero collision
The guided-tour CTA initially created a third mobile text row and pushed the Hero headline into the product silhouette.

Final fix:
- shorter `Guided tour` visible label
- accessible label still describes `Three product moments guided tour`
- Explore NOVA + Guided tour share one compact row
- redundant mobile gesture hint is hidden

### Behind handoff height
The first compact handoff still rendered at ~124% viewport height because parent vertical padding sat outside the 110svh minimum while the sticky child remained 100svh.

Final fix:
- parent `.stage--behind` padding removed
- spacing remains inside the sticky child
- border-box geometry is contract-tested

### Validation-evidence QA
Initial evidence visibility checks used the wrong coordinate system.

Final QA:
- uses document coordinates based on `getBoundingClientRect().top + scrollY`
- waits until the evidence section is actually visible

### Mobile Notify QA
A broad close-control selector could time out.

Final QA:
- targets the actual panel close control explicitly

### Public preview story assertion
Public QA still expected the removed R12 phrase `Behind NOVA.`.

Final QA now requires:
- `Designed like a launch.`
- `Built like a product.`
- Guided Tour hook
- Validation Evidence hook

## Exact final verification

### Contracts
Run:
`36074433535`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36074433535

Conclusion: SUCCESS

Exact site source:
`e39dc80ea88a62eb560403ee2e84c12b31ab00a6`

### Production Bundle
Run:
`36074433568`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36074433568

Conclusion: SUCCESS

Artifact:
`10839392151` — `nova-production-site`

Digest:
`sha256:e7b3274a9b877f1df688d5b4ad786fdc2cc5f24da6e8500cb44169a4e426c304`

Bundle file count:
33

Deployment integrity hashes on `samvr`:
- `index.html`: `2a6af898a3321c62ed6b32dff96af7d8e14f22fd89b7f66fa6a29cfa39687dd6`
- `styles.css`: `208b279a8b732d6e706d85f0d2764163efb630b56cc3c60d165613566e26142d`
- `runtime/timeline.js`: `90e6c1aea70b79b093c2d5f83750abef1ee3ad1f8c5bb339e228935d8d01a38a`

### Full Visual QA
Run:
`36074433590`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36074433590

Conclusion: SUCCESS

Artifact:
`10839896481` — `nova-v2-visual-qa`

Digest:
`sha256:5bfa2f2a10fbe1abbaa258480b0d5b48f86bd52f0843a9ca8a689e7fcdbdf605`

Manual inspection included:
- Guided Comfort
- Guided Fold
- Guided Controls
- compact case-study handoff
- mobile Hero
- Design close-pass
- desktop/mobile case study
- validation-evidence content
- existing Product Facts / Notify / fallback / reduced-motion / V1 states

### Focused Hotspot QA
Run:
`36075261791`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36075261791

Conclusion: SUCCESS

Artifact:
`10839921827` — `nova-hotspot-qa`

Digest:
`sha256:674a330d28492d8829b41d485796e3904d80cf301d19e282677803d2e2c1e949`

The run head is QA-only after the exact site source; the site files remain `e39dc80…`.

### Public V2 Preview QA
Run:
`36075725265`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36075725265

Conclusion: SUCCESS

Artifact:
`10840067992` — `nova-public-preview-qa`

Digest:
`sha256:8d6d121786c2ac4be185d041d8387425a85fd53f2622915e168e5f645041682b`

### Production Public QA
Run:
`36075964568`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36075964568

Conclusion: SUCCESS

Artifact:
`10839334879` — `nova-production-public-qa`

Digest:
`sha256:d99559434e968327ab5964a9c8d0d52d21d9fce962eefa01890f1aa8208da852`

Production QA now requires the R13 Guided Tour, validation-evidence section and compact case-study title in addition to the R12 root checks and preserved V1 archive.

## Deployment

Cloudflare Pages project:
`nova-interactive-portfolio`

### Production / main
Stable:
https://nova-interactive-portfolio.pages.dev/

Immutable R13 deployment:
https://200174f8.nova-interactive-portfolio.pages.dev

Commit hash supplied to Wrangler:
`e39dc80ea88a62eb560403ee2e84c12b31ab00a6`

### V1 archive
https://nova-interactive-portfolio.pages.dev/v1/

### V2 preview
Stable:
https://v2.nova-interactive-portfolio.pages.dev/

Immutable R13 deployment:
https://23919709.nova-interactive-portfolio.pages.dev

Commit hash supplied to Wrangler:
`e39dc80ea88a62eb560403ee2e84c12b31ab00a6`

Both `main` and `v2` were deployed from the same exact 33-file verified artifact.

## V1 preservation

Rollback branch:
`backup/nova-interactive-v1-2026-09-23`

Rollback commit:
`9c5e084518f35d364fabc1d565ccb31a6e348eba`

Do not rewrite or delete this point.

The production `/v1/` archive remains intact.

## Operational notes

- `samvr` was used only for exact artifact handling and Cloudflare deployment.
- No coding, browser QA or source debugging was performed on `samvr`.
- No rebuild happened during deployment.
- R13 source is frozen at `e39dc80…`.
- Current integration commits after that source are QA/workflow/trigger-only.

## Resume rules

1. Reconcile `nova/v2-integration` first.
2. Compare live head against exact deployed site source `e39dc80ea88a62eb560403ee2e84c12b31ab00a6`.
3. If differences are only QA/tests/docs/triggers, production source remains `e39dc80…`.
4. If any `nova/site/**` path changes, run a new exact Contracts + Production Bundle + full Visual QA cycle.
5. If timeline/product motion changes, rerun focused Hotspot QA.
6. Deploy V2 first, verify public V2, then promote the exact same artifact to main.
7. Keep `/v1/` and the independent V1 rollback intact.
8. Keep `samvr` deployment-only.
