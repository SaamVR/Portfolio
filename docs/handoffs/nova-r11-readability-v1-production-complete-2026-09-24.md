# NOVA R11 Readability + V1 Production Completion Handoff

Date: 2026-09-24

Repository: `SaamVR/Portfolio`

Integration branch: `nova/v2-integration`

## Exact deployed site source

`f482d8415f1d9b2cd3c870d73793299e26f8c8e4`

This is the exact `nova/site/**` source deployed to both Cloudflare Pages production branch `main` and preview branch `v2`.

At completion, the integration branch head was:

`a4eda56d33b5702d27102c045514a6d9c9cd9e62`

The two commits after the deployed source are QA trigger-only changes:
- `nova/production-qa-trigger.txt`
- `nova/public-preview-qa-trigger.txt`

There are no `nova/site/**` changes after `f482d841…`.

## User-requested result

- Current/refined NOVA is the main production experience at the project root.
- Preserved original NOVA V1 is bundled into the same production deployment at `/v1/`.
- V2 preview is synchronized to the same exact artifact.
- V1 rollback branch remains preserved independently.

## Production URLs

Main/root:
https://nova-interactive-portfolio.pages.dev/

V1 archive:
https://nova-interactive-portfolio.pages.dev/v1/

Stable V2 alias:
https://v2.nova-interactive-portfolio.pages.dev/

Immutable production deployment:
https://4cdaf0b0.nova-interactive-portfolio.pages.dev

Immutable V2 deployment:
https://3356190c.nova-interactive-portfolio.pages.dev

## R11 audit findings fixed

The audit found that the macro hierarchy was strong but secondary hierarchy and legibility were too weak.

Implemented:

- Desktop body copy raised to a 16px baseline.
- Mobile body copy raised to a 14px baseline.
- Utility/navigation/control copy standardized around a 10px minimum.
- Light-theme muted text contrast strengthened.
- Dark-theme supporting-copy contrast strengthened.
- Listening/fold segmented controls made larger and more readable.
- Buttons increased in size and hit area.
- Hotspot labels made more legible.
- Header gains a subtle scene-aware gradient backing so navigation remains readable over the moving model without becoming a boxed navbar.
- Mobile headline scale reduced relative to supporting copy so information hierarchy is less top-heavy.
- Copy widths/line-height increased for easier scanning.
- Case-study intro, cards, labels and supporting text received higher contrast and clearer section definition.
- Case-study cards gained restrained top accent lines and stronger border hierarchy.
- Notify panel body/input text improved.
- Resolution and hero supporting copy width improved.
- V1 archive link added to the case-study footer.
- Preserved V1 was packaged at `nova/site/v1/`, referencing the shared verified runtime and GLTF assets.
- V1 remains the original editorial 3D product-film version, not a recreation.
- Readability browser QA was added for desktop/mobile.
- V1 browser QA was added for desktop/mobile.
- Production root + V1 public QA was added.

## Additional design regressions caught and fixed during R11

### Form collision
Increasing readable body typography exposed a slight desktop Form headline/product collision.

The first R11 Visual QA failed on the Form collision guard. The composition was corrected without shrinking the text.

A later final refinement moved the Form copy farther left while preserving product scale and readable typography.

### Mobile full-width copy
A CSS override introduced an unintended mobile copy-width regression. It was caught and corrected so mobile copy remains full-width within its authored safe area.

### Hotspot viewport safety
The expanded hotspot work exposed edge cases near viewport boundaries. Hotspot centers/labels were made viewport-safe and the behavior was added to QA.

## Exact final verification

### Contracts

Run:
`36000270839`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36000270839

Conclusion: SUCCESS

Exact site source:
`f482d8415f1d9b2cd3c870d73793299e26f8c8e4`

### Production Bundle

Run:
`36000270989`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36000270989

Conclusion: SUCCESS

Artifact:
`10807523736` — `nova-production-site`

Artifact digest:
`sha256:b1fa8978981f1d818586393c8405ac5fbbf354dc9bbdc5eb58e8601d245ea477`

Bundle file count:
32

Deployment integrity check on `samvr`:
- `styles.css`: `5dfa7d99add26fda9f9285951d225507f1676364747844f329dfb54ee75148e4`
- `v1/index.html`: `09be5e24c1ae5ca77750c6842d95a677dd4bd7d0a01e771996683abc1dc9ffe6`

### Full Visual QA

Run:
`36000270941`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36000270941

Conclusion: SUCCESS

Artifact:
`10808396848` — `nova-v2-visual-qa`

Artifact digest:
`sha256:77a40b83a61d47140722e2677e156ab7ec95b8f338fb94cc064eb70655d70a56`

Manual review confirmed:
- desktop hero hierarchy
- mobile hero hierarchy
- desktop/mobile readability
- Form product/copy clearance
- Resolution layout
- case-study contrast and hierarchy
- mobile case-study layout
- V1 desktop
- V1 mobile
- existing interaction/fallback/reduced-motion states

### Production Public QA

Run:
`36001718493`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36001718493

Conclusion: SUCCESS

Artifact:
`10808706135` — `nova-production-public-qa`

Artifact digest:
`sha256:fd42368ebbf0df4a170cb49efa095e54bce7c9b153a8acee342ba213cfb05629`

Public result verified:
- root title: `NOVA — Hear beyond.`
- root model: ready
- root contains the V1 archive link
- desktop body copy: 16px
- mobile body copy: 14px
- V1 desktop model: ready
- V1 mobile model: ready
- V1 title: `NOVA — Interactive 3D Product Film`
- browser errors: none

### V2 Public Preview QA

Run:
`36001724688`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36001724688

Conclusion: SUCCESS

Artifact:
`10807948595` — `nova-public-preview-qa`

Artifact digest:
`sha256:c916462d916ac490cf7c28fb99dfd04a9d0aedf70a06a5b5f539b3ddcc31fc80`

## Deployment

Cloudflare Pages project:
`nova-interactive-portfolio`

Production branch:
`main`

Production immutable deployment:
`https://4cdaf0b0.nova-interactive-portfolio.pages.dev`

Production stable root:
`https://nova-interactive-portfolio.pages.dev/`

V1 production path:
`https://nova-interactive-portfolio.pages.dev/v1/`

Preview branch:
`v2`

V2 immutable deployment:
`https://3356190c.nova-interactive-portfolio.pages.dev`

V2 stable alias:
`https://v2.nova-interactive-portfolio.pages.dev/`

Both branches were deployed from the same exact verified artifact built from `f482d841…`.

`samvr` was used only for deployment/artifact handling and Cloudflare deployment inspection, not coding or browser QA.

## Preserved rollback

Original V1 rollback branch:
`backup/nova-interactive-v1-2026-09-23`

Original V1 rollback commit:
`9c5e084518f35d364fabc1d565ccb31a6e348eba`

The production `/v1/` archive is packaged from that preserved NOVA V1 experience while using shared verified GLTF/vendor assets in the current production bundle.

## Resume rules

1. Reconcile live `nova/v2-integration` first.
2. Compare against exact deployed site source `f482d8415f1d9b2cd3c870d73793299e26f8c8e4`.
3. If changes after that are only docs/QA/triggers, production site source remains `f482d841…`.
4. If any `nova/site/**` path changes, run new Contracts + Production Bundle + full Visual QA before deploying.
5. Keep production root and `v2` synchronized unless deliberately testing an isolated preview.
6. Keep `backup/nova-interactive-v1-2026-09-23` intact.
7. Keep `samvr` deployment-only.
