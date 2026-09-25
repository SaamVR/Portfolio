# NOVA V3 Production Refinement — Implementation Plan

Date: 2026-09-25
Spec: `docs/superpowers/specs/2026-09-25-nova-v3-production-refinement-design.md`

## Task 1 — Define RED contracts

Files:
- `nova/tests/test_v2_content_contract.py`
- `nova/tests/interaction_contract.mjs`
- `nova/tests/test_qa_contract.py`

Require:
- verified market benchmark section and official source links;
- research-derived NOVA target language;
- absence of old demo/notify phrasing;
- sequential Design detail rail;
- hotspot fade behavior;
- fold ownership behavior;
- camera-target and pose damping markers;
- V3 browser QA captures.

Expected: contracts fail before implementation.

## Task 2 — Replace demo content with research-backed product content

Files:
- `nova/site/index.html`
- `nova/site/styles.css`
- `nova/site/ui/product-ui.js`

Add:
- market benchmark table;
- NOVA design brief targets;
- practical daily-use details;
- source links;
- design detail rail.

Remove:
- fake notify demo UI;
- fictional-spec placeholder language.

Expected: content contracts pass.

## Task 3 — Fix motion-controller composition

Files:
- `nova/site/runtime/render-adapter.js`
- `nova/site/runtime/composer.js`
- `nova/site/interactions/hotspot-controller.js`
- `nova/site/interactions/fold-controller.js`
- `nova/site/app.js`

Implement:
- damped camera look target;
- damped GLTF pose time;
- smooth hotspot offset transitions and fade-out;
- hotspot cleanup on scene exit;
- Form-only fold ownership;
- cancellable guided-tour delayed actions.

Expected: interaction contracts pass and no legacy behavior regresses.

## Task 4 — Improve Design close-pass presentation

Files:
- `nova/site/index.html`
- `nova/site/styles.css`
- `nova/site/app.js`
- `nova/site/ui/product-ui.js`

Implement:
- scroll-derived `data-design-detail`;
- sequential Cushion / Hinge / Controls detail rail;
- one emphasized floating callout at a time in Design;
- direct card click focuses corresponding detail without competing automatic camera motion.

Expected: browser QA shows readable, stable product-detail progression.

## Task 5 — Extend browser QA

Files:
- `.github/workflows/nova-qa.yml`
- `nova/tests/test_qa_contract.py`

Add:
- desktop/mobile benchmark captures;
- Design detail sequence captures;
- motion continuity audit sampling rendered pose/camera target during scroll;
- verify no notify demo UI;
- 360/390/430 mobile widths where useful.

Expected: full Visual QA green.

## Task 6 — Verify, inspect, deploy V3

Run:
- Contracts;
- Production Bundle;
- Full Visual QA;
- Focused Hotspot QA;
- manual artifact inspection.

Deploy exact verified artifact to Cloudflare branch `v3` using `samvr` deployment-only.

Then run a V3 public browser QA workflow or branch-specific equivalent.

Do not modify main, v2, or v1.
