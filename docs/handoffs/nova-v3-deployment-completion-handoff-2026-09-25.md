# NOVA V3 Deployment Completion Handoff — 2026-09-25

Repository: `SaamVR/Portfolio`

Primary branch: `nova/v3-motion-polish`

## Canonical release status

NOVA V3 is DEPLOYED and browser-verified after the product-visibility correction.

Public branch alias:
https://v3.nova-interactive-portfolio.pages.dev/

Current immutable Cloudflare deployment:
https://9f147a72.nova-interactive-portfolio.pages.dev

Cloudflare deployment ID:
`9f147a72-ef24-4ded-8971-dbd5a0412013`

Cloudflare-reported source:
`a85882b`

Exact deployed site source:
`a85882be393660d6984322dbfd21e781a170f1e6`

Commit:
`fix(nova-v3): snap authored pose before model ready`

This supersedes the earlier V3 deployment based on `63af14a...` and the intermediate framing deployments `7177604...` / `c8b7aac...`.

Do not replace root production, V2, or the `/v1/` archive unless the user explicitly asks.

## Why the previous release was superseded

The user reported that the headphone was not visible.

The previous release gates were too permissive because they validated hotspot/collision behavior without a hard invariant that a recognizable headset silhouette remained on-screen.

Recovery work found two real presentation problems:

1. Camera composition could crop the product, especially the headband, in some scenes.
2. More importantly, deployed model load timing could make `modelState=ready` occur while the camera/product presentation was still damping from default transforms. The same authored scroll state could therefore render differently depending on model/network load timing.

A deployed public QA run reproduced this race at the hero:
- run `36151782430`
- desktop hero progress `.02`
- both earcups were visible but the headband landmark was still slightly above the viewport.

The release was not accepted at that point.

## Final site-source corrections

### Control / adaptive framing

Commit:
`c8b7aac0eee7a3dc42489e9e25a687028971263c`

Commit message:
`fix(nova-v3): keep control headband inside viewport`

The Control scene now looks slightly higher and sits slightly farther back so the full headband remains visible while the copy owns the right side.

### Deterministic initial renderer state

Commit:
`455d9e335a057b45373b8b14468375040f6f2b0d`

Commit message:
`fix(nova-v3): make initial product framing deterministic`

`nova/site/runtime/render-adapter.js` gained a `snap(state)` path that applies the authored camera, product transform, pose, lighting, and environment state immediately instead of damping from defaults.

### Snap authored state before readiness

Final site-source commit:
`a85882be393660d6984322dbfd21e781a170f1e6`

Commit message:
`fix(nova-v3): snap authored pose before model ready`

After the GLTF loads and the adapter/hotspots are ready, `nova/site/app.js` now:
1. samples the authored state for the current scroll position,
2. composes it with interaction state,
3. snaps the renderer to that state,
4. publishes/renders that state,
5. only then sets `document.body.dataset.modelState='ready'`.

Normal damping remains active for subsequent scene transitions.

This removes model/network-load-speed dependence from the first visible product frame.

## Framing QA added during this correction

The QA system now verifies actual product presence rather than only canvas opacity/hotspot existence.

A QA-only product framing probe projects the same real model landmarks used by product interactions:
- cushion,
- headband,
- controls.

The framing gate samples seven story positions on desktop and mobile:
- `.02`
- `.16`
- `.36`
- `.54`
- `.65`
- `.79`
- `.90/.92` depending on the workflow.

It waits for landmark convergence before judging the frame instead of relying on fixed sleeps.

Outside the intentional Design close-up, the gate requires:
- all three product landmarks on-screen,
- both earcup landmarks on-screen,
- minimum recognizable product span.

The Design close-up keeps its intentional crop allowance while still requiring enough real product landmarks to remain visible.

The deployed V3 public QA uses the same framing invariant.

## Final verified gates

### Contracts

Run:
`36152245687`

Conclusion:
SUCCESS

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36152245687

Head:
`a85882be393660d6984322dbfd21e781a170f1e6`

### Production Bundle

Run:
`36152245978`

Conclusion:
SUCCESS

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36152245978

Head:
`a85882be393660d6984322dbfd21e781a170f1e6`

Artifact:
`10871579809`

Name:
`nova-production-site`

Digest:
`sha256:b508f54c240473059244b0db60136e559154b2eb3f17fca3394e843eec08af21`

This exact artifact was deployed to Cloudflare branch `v3`.

No rebuild was performed on the deployment machine.

### Full Visual QA

Run:
`36152246000`

Conclusion:
SUCCESS

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36152246000

Head:
`a85882be393660d6984322dbfd21e781a170f1e6`

Matrix:
- `audit (core)`: SUCCESS
- `audit (extended)`: SUCCESS

Artifacts:
- core: `10872606849` / `nova-v2-visual-qa-core`
- core digest: `sha256:33efc74852bbaf2074eeacbbad27d0cbffa3c47add6ec13100ae4287a18dca8a`
- extended: `10871674213` / `nova-v2-visual-qa-extended`
- extended digest: `sha256:e6fe614f1d91fd28e6596d09f66365229c0a7cc92f3be7df5de150c2cfc89e7a`

### Focused Hotspot QA

Run:
`36153678140`

Conclusion:
SUCCESS

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36153678140

Run head:
`7b795e5c302e614a0d8687581147b99af8b96a22`

Artifact:
`10872118992`

Digest:
`sha256:ea89a3dd1c58c1f7d94e174cacd6f68c1a4199238e968024abfd916e936528bd`

The only branch change after `a85882be...` at this point was the hotspot trigger file, so this run validates the same site bytes.

### Deployed V3 Public QA

Run:
`36153997801`

Conclusion:
SUCCESS

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36153997801

Target:
https://v3.nova-interactive-portfolio.pages.dev/

Run head:
`3c279e1d7be290b3f3a8bdfeb7bd285f2abdc217`

Artifact:
`10872473517`

Digest:
`sha256:0e9eecf81f5d85e3da2736e0c35b857d1236393ac7ddaf2829f0fc6b4b38c3d4`

Artifact `result.json`:
- URL: `https://v3.nova-interactive-portfolio.pages.dev/`
- browser errors: `[]`

The live public QA validates:
- model reaches ready only after authored state is established,
- recognizable headphone framing at the sampled desktop/mobile story positions,
- desktop hero,
- desktop Control scene,
- mobile hero,
- mobile Control scene,
- sequential Cushion / Hinge / Touch Controls Design behavior,
- active detail/hotspot state,
- product Specifications panel,
- Sony WH-1000XM6 benchmark disclosure and official factual references,
- mobile navigation,
- mobile Design detail state,
- V1 archive.

Manual inspection of the final deployed public-QA screenshots confirms:
- desktop hero: complete headset visible,
- desktop Control: complete headset/headband visible,
- mobile hero: complete headset visible,
- mobile Control: headset remains clearly visible above/behind copy,
- no recurrence of the user's “headphone not even visible” failure.

## Deployment

Deployment machine:
`samvr` only.

Deployment method:
- exact GitHub Actions production artifact,
- no local rebuild,
- Wrangler 4,
- Cloudflare Pages branch `v3`,
- commit hash explicitly supplied as `a85882be393660d6984322dbfd21e781a170f1e6`.

Deployment ID:
`9f147a72-ef24-4ded-8971-dbd5a0412013`

Immutable URL:
https://9f147a72.nova-interactive-portfolio.pages.dev

Branch alias:
https://v3.nova-interactive-portfolio.pages.dev/

Cloudflare deployment list confirmed:
- branch: `v3`
- source: `a85882b`

The previous V3 deployment `ee4c840c...` / source `c8b7aac` is superseded.

## Branch state after release

Exact deployed site source:
`a85882be393660d6984322dbfd21e781a170f1e6`

QA-only hotspot trigger head:
`7b795e5c302e614a0d8687581147b99af8b96a22`

QA-only public trigger head:
`3c279e1d7be290b3f3a8bdfeb7bd285f2abdc217`

Comparison from exact site source `a85882be...` to `3c279e1d...` contains only:
- `nova/hotspot-qa-trigger.txt`
- `nova/v3-public-qa-trigger.txt`

Therefore the deployed site bytes remain attributable to `a85882be...`.

This handoff update itself is documentation-only and must not be treated as a new site revision.

## Deployment-machine note

`samvr` has a nearly full root disk.

After deployment, disposable temporary deployment directories and npm npx cache were removed.

Project/source files were not removed.

Future deployment work should check disk space first and avoid rebuilding on `samvr`.

## Product/content constraints to preserve

- NOVA remains an independent portfolio launch study.
- Sony WH-1000XM6 is the factual hardware benchmark.
- Do not imply Sony affiliation.
- Do not invent NOVA hardware specs.
- Keep the official source links.
- Keep large product presence and readable typography.
- Keep sequential Cushion → Hinge → Touch Controls presentation.
- Keep source-pose damping for subsequent transitions.
- Preserve deterministic initial readiness via the renderer snap.
- Preserve the landmark-based product-framing QA.
- Keep reduced-motion and WebGL/GLTF fallbacks.
- Preserve V1 archive.

## Rollback preservation

Original V1 rollback remains:

Branch:
`backup/nova-interactive-v1-2026-09-23`

Commit:
`9c5e084518f35d364fabc1d565ccb31a6e348eba`

Also preserve:
- root production,
- V2 preview,
- `/v1/` archive.

## Next-chat instruction

Do not restart the V3 audit.

Treat the corrected V3 release as live at:
https://v3.nova-interactive-portfolio.pages.dev/

Start any future V3 site change from exact site source:
`a85882be393660d6984322dbfd21e781a170f1e6`

while preserving the newer QA workflow/trigger state on the branch.

Any new `nova/site/**` change creates a new site-source revision and must pass:
1. Contracts
2. Production Bundle
3. Full Visual QA
4. Focused Hotspot QA when motion/hotspots/render-state behavior is affected
5. deployment to `v3` from the exact production artifact on `samvr`
6. deployed V3 Public QA with settled landmark framing checks

Do not promote V3 over root production unless the user explicitly requests it.
