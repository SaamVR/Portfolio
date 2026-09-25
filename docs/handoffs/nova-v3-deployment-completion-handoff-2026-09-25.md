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


## Motion fluidity refinement — 2026-09-26

The headphone motion audit/refinement is complete and deployed to the V3 preview.

### Scope

This was a bounded motion-system refinement only.

Preserved:
- existing V3 visual direction and story,
- current content/specifications,
- deterministic initial renderer `snap`,
- product scale/presence,
- sequential Cushion → Hinge → Touch Controls presentation,
- reduced-motion and WebGL/GLTF fallbacks,
- V1 archive,
- root production and V2.

Changed site files only:
- `nova/site/runtime/timeline.js`
- `nova/site/interactions/inspection-controller.js`

A later QA-only commit changes only:
- `nova/hotspot-qa-trigger.txt`

### Motion findings and correction

The audit isolated two primary causes of the reported abnormal motion.

1. Scroll choreography had narrow camera-composition release windows around the Adaptive → Form and Resolution → Behind transitions. The authored target changed too aggressively over short progress intervals, which could read as a camera whip/jolt after outer damping.
2. Front / Side / Rear inspection rotation used first-order convergence, hard-zeroed the current rotation on Reset, and could reverse direction abruptly under rapid retargeting.

The release corrects these without adding decorative motion.

Timeline changes:
- Adaptive influence release widened from `.565 → .58` to `.535 → .60`.
- Resolution influence release widened from `.945 → .965` to `.915 → .965`.
- late-story FOV transition was softened:
  - p=.945: `26.5 → 26.8`
  - p=1.0: `31 → 30`

Inspection changes:
- Front / Side / Rear now use a critically damped rotational spring.
- spring stiffness: `85`
- damping: `2 * sqrt(85)`
- internal integration substep: max `1/60 s`
- retargeting preserves rotational velocity instead of restarting a first-order ease.
- Reset now retargets Front instead of hard-zeroing the rendered model yaw.
- leaving Inspect returns toward Front smoothly rather than snapping the current model yaw.

The spring was intentionally substepped so the behavior remains stable under both normal frame cadence and the repository's coarse-`dt` contract tests.

### Measured motion behavior

Deterministic source-level simulation against the exact production bytes showed:
- Front / Side / Rear settle to within ~2° in roughly `0.75–0.88 s`.
- preset-view jerk reduced by roughly `86–88%` versus the prior controller.
- the two strongest scroll-camera jerk clusters reduced by roughly `89–94%`.

These measurements are diagnostic/supporting evidence; the release gates below remain authoritative.

### Exact site-source commit

Site-source commit:
`2283e56ef6dbadeec458e33a6d9e3249433c7859`

Commit message:
`fix(nova-v3): stabilize inspection spring across frame steps`

The two preceding motion commits in the same linear change set are:
- `c5c0912f790cb3538f40f264d63ea7d484d54ec6` — smooth section camera handoffs
- `a2598e76adc732932e5cfda236b0410c9f59402d` — smooth inspection view transitions

QA-trigger head after site source:
`abe52b802ba3b8b80c160c95e55f2cc36039b969`

Commit:
`test(nova-v3): verify motion fluidity interactions`

Comparison `2283e56... → abe52b8...` changes only `nova/hotspot-qa-trigger.txt`; therefore site bytes remain attributable to `2283e56...`.

### Release gates for motion source

Contracts:
- run: `36170205683`
- conclusion: SUCCESS
- head: `2283e56ef6dbadeec458e33a6d9e3249433c7859`
- URL: https://github.com/SaamVR/Portfolio/actions/runs/36170205683

Production Bundle:
- run: `36170205689`
- conclusion: SUCCESS
- head: `2283e56ef6dbadeec458e33a6d9e3249433c7859`
- artifact: `10879413678`
- name: `nova-production-site`
- digest: `sha256:e5ef6e4cbb4713024bb8e170ee1641b7febaeffdd8004739a05d140d3a982b06`
- URL: https://github.com/SaamVR/Portfolio/actions/runs/36170205689

Full Visual QA:
- run: `36170205708`
- conclusion: SUCCESS
- head: `2283e56ef6dbadeec458e33a6d9e3249433c7859`
- core artifact: `10880169615`
- core digest: `sha256:f2f713ed7759e046e5891de00467824296e8a12d77277b9bd8a25553bbcaadcd`
- extended artifact: `10879209312`
- extended digest: `sha256:ce08703e0c28ddb66c8582c09fd79789178f323c243fdd835c5a79c712feb35c`
- URL: https://github.com/SaamVR/Portfolio/actions/runs/36170205708

Focused Hotspot QA:
- run: `36171387857`
- conclusion: SUCCESS
- run head: `abe52b802ba3b8b80c160c95e55f2cc36039b969`
- artifact: `10881380285`
- digest: `sha256:15354fddbe562517265a65787b6ec45b697b0398a950933fb95ec7fb71cde498`
- URL: https://github.com/SaamVR/Portfolio/actions/runs/36171387857

Focused hotspot `result.json` confirms the Cushion, Hinge/headband, and Touch Controls anchors remain settled and visible on desktop and mobile.

Deployed V3 Public QA:
- run: `36171925153`
- conclusion: SUCCESS
- run head: `abe52b802ba3b8b80c160c95e55f2cc36039b969`
- artifact: `10880441663`
- digest: `sha256:a190278115a8ad1e1b75ffc17b5ffdedde832e7ea2064905b3392bef2fa93ed8`
- URL: https://github.com/SaamVR/Portfolio/actions/runs/36171925153

Public QA artifact `result.json`:
- target: `https://v3.nova-interactive-portfolio.pages.dev/`
- browser errors: `[]`

### Motion release deployment

Deployment method:
- exact GitHub Actions production artifact `10879413678`,
- no rebuild on deployment machine,
- Cloudflare Pages preview branch `v3`,
- source commit `2283e56ef6dbadeec458e33a6d9e3249433c7859`.

Deployment ID:
`3d4b29f3-569a-4040-a48f-85f99f7fe0fc`

Immutable URL:
https://3d4b29f3.nova-interactive-portfolio.pages.dev/

Branch alias:
https://v3.nova-interactive-portfolio.pages.dev/

Cloudflare deployment list confirms:
- environment: Preview
- branch: `v3`
- source: `2283e56`

Root production remains on branch `main` and was not changed.

### Byte-level provenance check

Motion-critical files were hashed across:
1. GitHub source at `2283e56...`,
2. the exact production artifact,
3. the live `v3` branch alias,
4. the immutable `3d4b29f3...` deployment.

All copies matched exactly.

`runtime/timeline.js`:
`sha256:eaf60132a768e21d796b2abb7ffc972c887e03fd03e287a6a0163b9430d872f0`

`interactions/inspection-controller.js`:
`sha256:5026875c150e7f026b670f4d694dfd8ad3d4e28bdf719616fb54cfdf5de0973e`

This proves the public V3 alias and immutable deployment are serving the audited motion revision rather than merely passing a health check.

### Canonical branch reconciliation

The canonical working branch `nova/v3-motion-polish` was fast-forwarded from:
`9558281927434eb15a267cf5451520deebff88fc`

to the proven QA-trigger head:
`abe52b802ba3b8b80c160c95e55f2cc36039b969`

without force.

Future V3 work must therefore start from the canonical branch and treat `2283e56...` as the exact currently deployed site-source revision.

Do not revert to `a85882be...`; that was the previous corrected-framing release and is now superseded by the motion-fluidity release.

