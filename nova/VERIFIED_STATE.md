# NOVA — Verified GLTF Landing Page State

Updated: 2026-09-23

## Verified source

Primary implementation commit:

`01efaa798dc8614b043d9cfffefdc3c8d963a5e7`

Repository path:

`SaamVR/Portfolio/nova/site/`

The current NOVA landing page is the editorial, GLTF-native implementation. Do not revert to the historical standalone Cloudflare design.

## 3D runtime

- Three.js 0.180
- GLTFLoader + BufferGeometryUtils
- source clip: `ArmatureAction`
- source clip duration: 27.71 seconds
- 14 meshes
- 36 skin joints
- 3 animation clips
- 12 optimized WebP material maps
- presentation root uses the verified upright -90° X axis
- long cable mesh is hidden in the showcase presentation and excluded from framing
- source animation, camera, light, typography and pointer response are controlled independently
- Mechanism includes a restrained live skeleton overlay
- animation poses are chosen from a real clip pose scan rather than arbitrary percentages

## Evidence-based pose choreography

- Hero: `0.24 → 0.32`
- Form: `0.16 → 0.24`
- Mechanism: `0.32 → 0.48` (intentionally crosses the folding transition)
- Choreography: `0.64 → 0.80`
- Interaction: `0.70 → 0.74`
- Closing: `0.16 → 0.08`

## Final browser QA

Successful run:

- GitHub Actions run: `35848135317`
- tested commit: `01efaa798dc8614b043d9cfffefdc3c8d963a5e7`
- artifact ID: `10743994927`
- artifact SHA-256: `fa14db3a3fdff824051d2e27248736cd3b159584c68bd991dc8b8c350051950a`
- result: success
- browser/runtime errors: none

Verified viewports:

- desktop: 1440 × 1000
- tablet: 1024 × 768
- mobile: 390 × 844

Every requested capture reported:
- `model = ready`
- runtime = `ArmatureAction / 27.71 SEC / LIVE`
- requested scene = active scene

Desktop captured and visually reviewed:
- Hero
- Form
- Mechanism early fold
- Mechanism later/open
- Choreography
- Interaction
- Closing

Tablet captured:
- Hero
- Form
- Mechanism
- Choreography
- Interaction

Mobile captured:
- Hero
- Form
- Mechanism
- Choreography
- Interaction
- Closing

## Final visual review

The final verified render fixes the issues that caused the rejected draft:

- headphone is upright and immediately recognizable
- hero/form use strong open product poses
- folded pose appears deliberately inside the Mechanism story instead of the hero
- cable no longer cuts through the composition
- early Mechanism product is isolated from the headline
- Interaction product is isolated in the right construction field
- dark Choreography chapter has clear product/type separation
- Closing keeps the product secondary to the implementation story
- desktop and mobile use different art-directed framing
- sticky editorial stages keep long scroll chapters compositionally controlled
- no screenshot was accepted unless the requested scene was actually active

## Next checkpoint

The source is ready for a deployment preview.

Deployment must not overwrite the old production alias blindly. First deploy a preview from this verified source, check the public URL, then promote/replace the old NOVA deployment only after public-browser verification.


## Deployment-ready artifact

Production bundle workflow:
- workflow: `.github/workflows/nova-build.yml`
- successful run: `35848847596`
- artifact: `nova-production-site`
- artifact ID: `10745090664`
- artifact size: 1,821,980 bytes
- artifact SHA-256: `4b00331f63fd17aa70fe74b325871be5ce93956056d94f870eabf6ead4e9b975`
- retention: 30 days

The bundle contains the verified HTML/CSS/JS, optimized GLTF/WebP assets, Three.js core/module files, GLTFLoader and BufferGeometryUtils.

## Cloudflare preview deployment status

Credential capability check:
- workflow run: `35848945057`
- result: blocked only by missing GitHub Actions secrets
- `CLOUDFLARE_API_TOKEN`: missing
- `CLOUDFLARE_ACCOUNT_ID`: missing

No secret values were exposed.

Prepared guarded deploy workflow:
- `.github/workflows/nova-deploy-cloudflare.yml`
- target Pages project: `nova-interactive-portfolio`
- preview branch: `redesign`
- production branch is not touched
- workflow restores the exact GLTF cache and vendors the verified runtime before deploy
- deployment can be triggered later by updating `nova/deploy-trigger.txt` once credentials exist

Do not switch the old production alias until the public preview has been browser-verified.


## Live deployment — 2026-09-23

Deployment policy followed:
- samvr was used only to perform Cloudflare Pages deployment commands.
- no development, design, asset processing or QA was performed on samvr.
- all source work and verification remained in GPT-runtime tooling / the existing hosted QA pipeline.

Preview deployment:
- Cloudflare branch: `redesign`
- deployment URL: `https://b01f4b3e.nova-interactive-portfolio.pages.dev`
- branch alias: `https://redesign.nova-interactive-portfolio.pages.dev`

Production deployment:
- Cloudflare branch: `main`
- deployment URL: `https://9ef19cfc.nova-interactive-portfolio.pages.dev`
- primary project alias: `https://nova-interactive-portfolio.pages.dev/`

Cloudflare reported:
- 20 deploy files
- preview upload: 20 uploaded
- production upload: 20/20 already present, same verified payload
- both deployments completed successfully

Post-deploy GPT-runtime verification:
- the production alias resolves to `NOVA — Interactive 3D Product Film`
- the `redesign` alias resolves to the same redesigned NOVA content
- public HTML contains the verified editorial chapters and GLTF implementation facts
- public stylesheet is accessible and matches the verified editorial build
- the external crawler used for post-deploy verification does not expose JavaScript/GLTF bodies because of their content types; therefore runtime/visual verification continues to rely on the exact-bundle browser QA that passed before deployment
- the deployed bundle is the same production artifact built and validated in run `35848847596`


## NOVA V2 verified product-experience checkpoint — 2026-09-23

Verified source commit:

`265c033a5d229ad9141d26040545621ea1336cc2`

V2 architecture now verified:
- product-first fictional NOVA headphone campaign precedes the technical portfolio reveal
- one global authored motion timeline replaces V1 scene-switch choreography
- camera, product pose, lighting and environment are composed continuously
- Fold/Open owns skeletal pose temporarily and blends back to scroll
- constrained drag/swipe inspection works on desktop/mobile
- Spatial/Focus/Ambient and Adaptive/Transparency controls produce bounded environment/light state
- hotspot anchors resolve sanitized GLTF object names and attach to real animated earcup/headband geometry
- chapter background is driven by active product state rather than overlapping sticky section paint
- exact-position browser QA disables smooth scrolling in the harness and verifies requested normalized progress
- Notify interaction is visible and covered by desktop/mobile QA
- reduced-motion and GLTF failure fallback paths remain usable

Final hotspot correction:
- previous earcup anchors silently fell back because Three.js sanitized names such as `Circle.012_0` to `Circle012_0`
- resolver now checks sanitized names and finds the child SkinnedMesh
- obsolete 22%-viewport screen offsets were removed after the real mesh anchors became active
- focused hotspot QA now places Control Surface / Soft-touch Cushion on the physical earcups and Articulated Fit on the headband

Verification:
- V2 contract run: `35887935304` — success
- focused hotspot QA run: `35887935405` — success
- focused hotspot artifact: `10763801727`
- focused hotspot artifact SHA-256: `ae2b3d7ea8996ca3a09b45c3029848c10212f84d53e58bbdfd29a8fe1f6e42c6`
- full V2 visual QA run: `35887935332` — success
- full V2 visual QA artifact: `10763432202`
- full V2 visual QA artifact SHA-256: `135d6be23450a7b916134c1af97f398dcc039804ace15794008d0641757997a1`

The full browser matrix covers:
- desktop 1440 × 1000
- tablet 1024 × 768
- mobile 390 × 844
- exact timeline boundary captures
- Focus / Transparency modes
- Fold / fold release
- inspection drag / reset
- mobile Ambient / swipe
- Notify panel
- reduced motion
- GLTF failure fallback

Exact production artifact:
- production bundle run: `35887935309` — success
- artifact: `nova-production-site`
- artifact ID: `10763018698`
- artifact SHA-256: `566a18e53bd2c0f850ee9a380f4ff6851af50ebfba4fc484e1cf60345a9238a4`
- artifact size: 1,832,977 bytes

Deployment policy:
- all development/debugging/design/QA remains in GPT runtime / hosted GitHub Actions
- samvr is deployment-only
- deploy this exact artifact to a V2 preview branch first
- do not replace Cloudflare production until the V2 preview is publicly verified


## NOVA V2 verified preview — 2026-09-23

Status: preview verified; production not yet promoted.

Verified V2 source:
- source commit: `6a47d94d8938c9565536998b11eb108fa7937740`
- branch: `nova/v2-integration`
- key late refinements included:
  - animated skinned-surface/bone hotspot anchoring with obsolete earcup screen offsets removed
  - desktop Adaptive → Form framing release so the product clears “Made to move.” at chapter entry
  - visible literal escape artifact removed from Behind NOVA
  - state-driven chapter backdrop, accessible Notify concept panel, responsive direct interaction, and reduced-motion/fallback behavior

Exact production bundle:
- workflow run: `35889178780`
- artifact: `nova-production-site`
- artifact ID: `10763963322`
- artifact digest: `sha256:334cee5f9836b2c304f949916f3c9eb4e2df85903530d3b3011fdac84915323a`
- bundle source SHA: `6a47d94d8938c9565536998b11eb108fa7937740`

Current-head browser QA:
- visual QA run: `35889178713` — success
- visual QA artifact ID: `10763599280`
- visual QA artifact digest: `sha256:e3efd09a9012b96435b31b82c0a0c77ca87d117c2a875c0ffb5a830c187f68ec`
- desktop/tablet/mobile timeline, direct interactions, reduced motion, model fallback, and Notify panel paths passed
- manual review confirmed the corrected Form entry and clean Behind NOVA rendering

Focused hotspot QA:
- run: `35887935405` — success
- artifact ID: `10763801727`
- artifact digest: `sha256:ae2b3d7ea8996ca3a09b45c3029848c10212f84d53e58bbdfd29a8fe1f6e42c6`
- desktop/mobile earcup hotspot anchors track the rendered product without legacy screen-space offsets

Cloudflare V2 preview deployment:
- samvr was used only for the deployment command
- Cloudflare project: `nova-interactive-portfolio`
- branch: `v2`
- immutable deployment URL: `https://54ccfee1.nova-interactive-portfolio.pages.dev`
- stable preview alias: `https://v2.nova-interactive-portfolio.pages.dev/`
- deployed commit metadata: `6a47d94d8938c9565536998b11eb108fa7937740`
- Cloudflare upload: 29 files total; 2 uploaded, 27 already present; deployment completed successfully

Public preview QA:
- workflow run: `35889143030`
- rerun attempt: `2`
- result: success
- audited URL: `https://v2.nova-interactive-portfolio.pages.dev/`
- public QA artifact ID: `10763974588`
- public QA artifact digest: `sha256:4e477b4966b767b892b1abe4822ee8cbf9645c03561ee0433ca52b0b6e645c0a`
- browser errors: none
- public evidence includes desktop Design/Focus/Fold/Notify and mobile Design/Ambient/Notify states

Production safety:
- primary production alias remains intentionally unpromoted from this V2 checkpoint
- V1 rollback branch remains `backup/nova-interactive-v1-2026-09-23`
- rollback commit remains `9c5e084518f35d364fabc1d565ccb31a6e348eba`
- V2 should be promoted to production only after preview acceptance
