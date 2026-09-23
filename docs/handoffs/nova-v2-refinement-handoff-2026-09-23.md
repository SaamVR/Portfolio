# NOVA V2 Refinement Handoff — 2026-09-23

## READ THIS FIRST

Continue NOVA from the exact durable state in:

- repository: `SaamVR/Portfolio`
- primary development/integration branch: `nova/v2-integration`
- integration head at handoff: `4ca379173d218c038865e18a22e1b91f80c0b3d0`
- exact verified V2 site-source commit: `6a47d94d8938c9565536998b11eb108fa7937740`
- stable public V2 preview: `https://v2.nova-interactive-portfolio.pages.dev/`
- immutable verified V2 deployment: `https://54ccfee1.nova-interactive-portfolio.pages.dev`

Read this handoff in full before making any write.

Do **not** restart the project, redesign the narrative from scratch, re-audit the entire repo, or revert to the rejected V1/FBX-era architecture. First reconcile live GitHub branch/action state against this checkpoint, then continue actual refinement.

The user has already said the current V2 approach is nice. The **immediate new request** is:

> make the headphone feel bigger in the composition and present more product detail through motion.

This is the next development objective. Do not turn it into another broad redesign.

---

## 1. Operating rules

### Development / QA

Use GPT runtime + GitHub/GitHub Actions for all:

- source edits
- design changes
- timeline/camera work
- interaction work
- tests
- screenshot QA
- debugging
- artifact inspection

### Deployment

`samvr` is **deployment-only**.

Do not use samvr for:

- coding
- debugging
- asset editing
- browser QA
- design iteration
- source inspection

Use samvr only after an exact production artifact has passed GitHub/GPT-runtime verification and needs to be pushed to Cloudflare Pages.

Do not use samai or other user machines for NOVA.

### Repository safety

The repository root contains unrelated products and is actively used by other work.

Current `main` at handoff is unrelated to NOVA work and has continued moving:
- `main` head observed: `92a1168892c61dc39abf31e283e44e23b742d5b4`

Therefore:

- work only inside NOVA paths and NOVA workflows named in this handoff
- do not hard-reset `main`
- do not overwrite unrelated root files
- do not blindly merge `nova/v2-integration` into `main`
- production promotion happens only after the user accepts the final refined V2 preview

---

## 2. Protected rollback / verified baselines

### V1 rollback

Do not delete or rewrite:

- branch: `backup/nova-interactive-v1-2026-09-23`
- commit: `9c5e084518f35d364fabc1d565ccb31a6e348eba`

### V2 verified source

The exact publicly verified V2 source is:

- `6a47d94d8938c9565536998b11eb108fa7937740`

The current integration branch is two documentation commits ahead of that source:

- `51b4d4db0c058a6efe0d9fab18b162a752bccb0b` — record verified V2 public preview
- `4ca379173d218c038865e18a22e1b91f80c0b3d0` — mark V2 preview verified

A compare from `6a47d94...` to `nova/v2-integration` showed only:
- `nova/PROJECT_STATE.md`
- `nova/VERIFIED_STATE.md`

No site source differs between the verified public preview and the current integration head at this handoff.

---

## 3. Current public/deployment state

### V2 preview — VERIFIED

Stable alias:

`https://v2.nova-interactive-portfolio.pages.dev/`

Immutable deployment:

`https://54ccfee1.nova-interactive-portfolio.pages.dev`

Cloudflare project:

`nova-interactive-portfolio`

Preview branch:

`v2`

Deployed source metadata:

`6a47d94d8938c9565536998b11eb108fa7937740`

### Production — NOT V2-promoted

Do not assume V2 is production.

The primary production alias remains intentionally unpromoted from this V2 checkpoint:

`https://nova-interactive-portfolio.pages.dev/`

The earlier V1 deployment/rollback remains available.

Do not promote production until:
1. the new bigger-scale/detail-motion refinement is implemented,
2. exact bundle QA passes,
3. public V2 preview QA passes,
4. the user accepts the refined preview.

---

## 4. Verified V2 artifact and QA evidence

### Final verified source before preview

`6a47d94d8938c9565536998b11eb108fa7937740`

### Production bundle

Workflow:

`.github/workflows/nova-build.yml`

Run:

`35889178780`

Result:

`success`

Artifact:

`nova-production-site`

Artifact ID:

`10763963322`

Artifact digest:

`sha256:334cee5f9836b2c304f949916f3c9eb4e2df85903530d3b3011fdac84915323a`

### Full V2 visual QA

Workflow:

`.github/workflows/nova-qa.yml`

Run:

`35889178713`

Result:

`success`

Artifact ID:

`10763599280`

Artifact digest:

`sha256:e3efd09a9012b96435b31b82c0a0c77ca87d117c2a875c0ffb5a830c187f68ec`

Coverage includes:
- desktop 1440×1000
- tablet 1024×768
- mobile 390×844
- exact normalized timeline positions
- timeline-boundary states
- Focus mode
- Transparency mode
- Fold/Open and fold release
- desktop inspection drag/reset
- mobile Ambient/swipe
- Notify panel
- reduced motion
- GLTF failure fallback
- Design hotspot placement

### Focused hotspot QA

Workflow:

`.github/workflows/nova-hotspot-qa.yml`

Run:

`35887935405`

Result:

`success`

Artifact ID:

`10763801727`

Artifact digest:

`sha256:ae2b3d7ea8996ca3a09b45c3029848c10212f84d53e58bbdfd29a8fe1f6e42c6`

### Public deployed-preview QA

Workflow:

`.github/workflows/nova-public-preview-qa.yml`

Run:

`35889143030`

Successful rerun attempt:

`2`

Result:

`success`

Public QA artifact ID:

`10763974588`

Artifact digest:

`sha256:4e477b4966b767b892b1abe4822ee8cbf9645c03561ee0433ca52b0b6e645c0a`

Browser errors:

`none`

Evidence includes:
- desktop Design
- desktop Focus
- desktop Fold
- desktop Notify
- mobile Design
- mobile Ambient
- mobile Notify

---

## 5. Current V2 architecture

The V2 page is a premium fictional headphone landing page first and a portfolio proof second.

### Product narrative

Commercial journey:
1. Hero — “Hear beyond.”
2. Design — “Made to disappear.”
3. Spatial — “Your space becomes the soundstage.”
4. Adaptive — “Silence, on your terms.”
5. Form — “Made to move.”
6. Direct inspection — “Look closer.”
7. Product resolution — “Hear beyond.”
8. Behind NOVA — technical portfolio reveal

Do not move the technical implementation proof back into the early product journey.

### Runtime

Important files:

- `nova/site/app.js`
- `nova/site/runtime/timeline.js`
- `nova/site/runtime/composer.js`
- `nova/site/runtime/render-adapter.js`
- `nova/site/runtime/environment.js`
- `nova/site/interactions/fold-controller.js`
- `nova/site/interactions/inspection-controller.js`
- `nova/site/interactions/hotspot-controller.js`
- `nova/site/interactions/mode-controller.js`
- `nova/site/ui/product-ui.js`

Architecture:

`global scroll progress -> authored timeline -> bounded interaction influences -> composed visual state -> render adapter`

Do not restore the V1 “active section -> camera preset” architecture.

### Global ranges

Current ranges:

```
hero        0.00–0.12
design      0.12–0.28
spatial     0.28–0.45
adaptive    0.45–0.58
form        0.58–0.72
inspect     0.72–0.86
resolution  0.86–0.96
behind      0.96–1.00
```

### Product animation

Commercial chapters intentionally hold a strong open silhouette.

Current `sampleProductPose()` behavior:
- Hero: ~0.24 → 0.30
- Design: ~0.30 → 0.24
- fast transition ~0.24 → 0.72 around 28–32%
- commercial journey then holds ~0.72 through 96%
- Behind NOVA eases ~0.72 → 0.64

The folded/transition source poses are deliberately reserved for explicit Fold/Open interaction.

Do not reintroduce accidental folded silhouettes into Spatial/Adaptive/Inspection.

### Current scale / camera baseline

This is directly relevant to the user’s newest request.

In `timeline.js`, most commercial keyframes currently use:

`product.scale = 1`

Near the end:
- resolution keyframe at 0.96: `scale .98`
- Behind NOVA at 1.00: `scale .88`

Composition influences currently make the product smaller:
- resolution influence multiplies scale toward `.90`
- Behind NOVA multiplies scale toward `.72`

Desktop camera Z is generally around:
- Hero start: 4.45
- Hero resolved: 5.55
- Design: ~5.08
- Spatial: ~5.22 + spatial influence
- Adaptive: ~5.18 + adaptive influence
- Form/Inspect: ~5.10–5.25
- Resolution: ~5.25–5.55 + resolution influence

Mobile additionally pushes camera Z back by `+1.0`.

This is why the user now wants more product presence.

---

## 6. Current interactions

Verified:

- Spatial / Focus / Ambient
- Adaptive / Transparency
- real source-animation Fold/Open
- scroll reconciliation after fold
- constrained desktop drag
- constrained mobile swipe
- Reset view
- product hotspots
- local-only Notify concept panel
- Replay
- reduced motion
- model failure fallback

### Hotspots

The hotspot system went through extensive correction. Do not replace it casually.

Current verified behavior:
- attachment to actual rendered/animated product surfaces
- Three.js-sanitized object names handled
- earcup hotspot screen-space hacks removed
- focused desktop/mobile QA is green

Important historical bug:
Three.js sanitized GLTF names such as:
- `Circle.012_0` -> `Circle012_0`

The resolver was updated accordingly.

Do not reintroduce legacy fixed-screen earcup offsets.

---

## 7. New user request — immediate next objective

The user’s latest visual feedback after seeing the current V2 was:

> it’s nice, but refine the scale of the headphone to be bigger and present more details with motion

Interpret this as:

- preserve the current product-first direction
- preserve current sections/interactions
- make the headphone feel more dominant
- bring the camera closer in appropriate chapters
- create intentional detail passes through motion
- reveal earcup, cushion, headband, articulation, control surface with authored camera/yaw/pitch/dolly movement
- keep the product readable and premium
- do not simply apply one global CSS/Three.js scale multiplier
- do not create decorative spinning
- do not cause product/headline collisions

### Motion principle

Prefer increasing perceived scale through:
1. camera dolly / camera-target choreography,
2. FOV refinement,
3. controlled detail framing,
4. small deliberate yaw/pitch arcs,

before relying on large changes to normalized model scale.

Actual `product.scale` can be adjusted where useful, but the object should not feel like a UI element being resized.

### Desired refinement character

The user wants **more visible product detail through motion**, not more text.

Good examples:
- Hero begins on a larger crop/detail and resolves into full product.
- Design moves into a larger three-quarter earcup/cushion view before settling.
- Spatial can preserve an oversized product while the environment opens around it.
- Adaptive can shift focus from earcup detail toward a clearer full silhouette.
- Form can move camera closer during Open/Fold, then settle.
- Inspection should be the closest controlled product study.
- Resolution should return to a strong, larger hero scale.
- Behind NOVA remains secondary/smaller because technical explanation is the focus.

Avoid:
- constant zooming
- random scale pulses
- fast spins
- unrestricted orbit
- product covering copy
- mobile product occupying the entire viewport with no breathing room

---

## 8. Prepared multi-lane refinement branches

All were created from the exact verified-preview integration head:

Base:

`4ca379173d218c038865e18a22e1b91f80c0b3d0`

### Lane A — scale + motion

Branch:

`nova/v2-scale-motion`

Owns primarily:
- `nova/site/runtime/timeline.js`
- only necessary motion-side changes in `render-adapter.js`
- timeline contract additions in `nova/tests/timeline_contract.mjs`

Objective:
- larger perceived product scale
- stronger camera dolly
- detail-specific motion arcs
- better settle/plateau timing
- desktop/tablet/mobile-specific camera refinement

Do not own content/CSS unless a tiny interface change is unavoidable.

### Lane B — product detail / visual polish

Branch:

`nova/v2-detail-polish`

Owns primarily:
- `nova/site/styles.css`
- `nova/site/index.html`
- `nova/site/ui/product-ui.js`
- optional lightweight environment/detail-light refinements that do not conflict with Lane A

Objective:
- improve detail presentation around close views
- refine lighting/readability/material emphasis
- improve micro-copy/hotspot presentation only if necessary
- keep no fake numeric product specifications
- keep current narrative

Do not rewrite camera choreography in this lane.

### Lane C — refinement QA

Branch:

`nova/v2-refinement-qa`

Owns:
- `nova/tests/**`
- `.github/workflows/nova-qa.yml`
- optional focused QA workflow additions
- no product redesign

Objective:
- pin larger-product/detail-motion intent in automated checks
- add exact captures around new close/detail moments
- protect no-collision behavior
- protect mobile framing
- preserve Fold/Open, hotspot, reduced-motion, fallback tests

### Integration target

`nova/v2-integration`

Do not use a second integration branch unless a conflict makes it necessary.

Merge only green lane commits.

Recommended merge order:
1. Lane A
2. Lane B
3. Lane C
4. full integration browser QA
5. exact artifact
6. V2 preview redeploy
7. public preview QA
8. user acceptance
9. production promotion

---

## 9. GitHub Actions workflow

### Fast lane contracts

Workflow:

`.github/workflows/nova-v2-contracts.yml`

Branch filter:

`nova/v2-*`

Therefore all three prepared refinement branches automatically receive contract CI when `nova/site/**` or `nova/tests/**` change.

Use TDD:
1. write a failing contract,
2. confirm RED,
3. implement,
4. confirm GREEN,
5. commit durable checkpoint.

### Full browser visual QA

Workflow:

`.github/workflows/nova-qa.yml`

Automatically runs on:
- `main`
- `nova/v2-integration`

It does **not** automatically run on the individual refinement branches.

Therefore:
- use fast contracts on lane branches
- merge tested lanes into `nova/v2-integration`
- let the full exact-position browser matrix run on integration

### Production bundle

Workflow:

`.github/workflows/nova-build.yml`

Runs on:
- `main`
- `nova/v2-integration`

Builds:
- `nova-production-site`

Requires exact GLTF asset cache and Three.js 0.180 vendor runtime.

### Focused hotspot QA

Workflow:

`.github/workflows/nova-hotspot-qa.yml`

Runs on `nova/v2-integration` when:
- workflow changes
- `nova/site/app.js` changes
- `nova/site/interactions/hotspot-controller.js` changes

Do not unnecessarily modify hotspot code during scale work. If camera changes reveal detached hotspot placement, use this workflow before touching hotspot anchors.

### Public preview QA

Workflow:

`.github/workflows/nova-public-preview-qa.yml`

Target URL:

`https://v2.nova-interactive-portfolio.pages.dev/`

After a new V2 preview deploy, trigger it by updating:

`nova/public-preview-qa-trigger.txt`

It verifies the **deployed public preview**, not just the workspace source.

---

## 10. Suggested scale/motion QA targets

Do not blindly encode these as hard limits without first reviewing current screenshots, but use them as art-direction targets.

### Desktop

The product should usually occupy more of the frame than current V2:

- Hero opening/detail: intentionally oversized crop is allowed.
- Hero resolved: strong full silhouette with meaningful negative space.
- Design: larger than current; earcup/cushion detail should be unmistakable.
- Spatial: large suspended product, environment secondary.
- Adaptive: maintain product dominance while clearing right-aligned copy.
- Form: close enough to read physical folding movement.
- Inspect: closest controlled study.
- Resolution: stronger/larger hero than current.
- Behind: keep product secondary.

### Mobile

Increase product presence more carefully:
- do not simply copy desktop dolly values
- preserve copy below/around product
- keep touch controls readable
- avoid clipping the headband/earcups unless the crop is intentionally a detail shot
- use shallower yaw/pitch than desktop
- verify 390×844 specifically

### New captures to add

At minimum consider exact captures around:
- Hero detail opening
- Hero resolved
- Design earcup close pass
- Design settled
- Spatial early/settled
- Adaptive detail transition
- Form pre-fold
- Form folded
- Inspect base
- Inspect max constrained drag
- Resolution hero
- mobile equivalents for Hero/Design/Form/Inspect/Resolution

---

## 11. Current verified workflows and IDs

Use these as the known-good baseline when diagnosing regressions.

### Contracts

Run:
`35889178558`

Result:
`success`

Source:
`6a47d94d8938c9565536998b11eb108fa7937740`

### Full visual QA

Run:
`35889178713`

Result:
`success`

### Production bundle

Run:
`35889178780`

Result:
`success`

### Hotspot QA

Run:
`35887935405`

Result:
`success`

### Public preview QA

Run:
`35889143030`

Successful attempt:
`2`

Result:
`success`

---

## 12. Deployment procedure after the refinement is verified

Do not deploy from a working tree or an arbitrary branch snapshot.

Required sequence:

1. Merge green refinement lanes into `nova/v2-integration`.
2. Wait for:
   - V2 Contracts success
   - Visual QA success
   - Production Bundle success
   - Hotspot QA if hotspot/app anchor code changed
3. Record exact integration source SHA.
4. Record exact `nova-production-site` artifact ID + digest.
5. Use **samvr only** to download that exact artifact and deploy to Cloudflare branch `v2`.
6. No source editing/debugging on samvr.
7. Trigger `NOVA Public Preview QA`.
8. Inspect public screenshot evidence from GPT runtime.
9. Present the updated V2 preview to the user.
10. Do not promote production until the user accepts it.

Cloudflare project:
`nova-interactive-portfolio`

Preview branch:
`v2`

Stable V2 preview alias:
`https://v2.nova-interactive-portfolio.pages.dev/`

---

## 13. Exact known asset/runtime facts — preserve

- Three.js: 0.180
- loader: GLTFLoader + BufferGeometryUtils
- source clip: `ArmatureAction`
- duration: 27.71 sec
- meshes: 14
- skin joints: 36
- source clips: 3
- principal animation channels: 42
- optimized material maps: 12 WebP
- upright presentation root: verified -90° X
- long cable mesh: hidden and excluded from framing
- exact GLTF cache key:
  `nova-gltf-assets-v1-b7ab75e30bb2b8a665b95e6b2105172892d7ec0c02c7e395fd8ce427add92ecc`

Do not restore the historical FBX runtime unless explicitly asked.

---

## 14. Important resolved bugs — do not regress

- wrong product orientation
- cable corrupting framing bounds
- generic dark-tech/AI-template styling
- global whole-page V1 scene switching
- source animation accidentally showing folded silhouettes in commercial chapters
- product/headline collisions
- blank sticky-stage boundary frames
- browser QA smooth-scroll capture drift
- canvas intercepting product controls
- overlapping stages intercepting inactive controls
- pointer-capture exceptions on synthetic/mobile flows
- detached/fake CSS hotspot positions
- sanitized GLTF object-name mismatch
- legacy earcup screen-space offsets
- Adaptive → Form entry collision
- Behind NOVA literal escape artifact
- invisible/nonfunctional Notify CTA

---

## 15. Historical lane branches

These are superseded by `nova/v2-integration` and should not be used as the base for new work:

- `nova/v2-runtime`
- `nova/v2-product-ui`
- `nova/v2-interactions`
- `nova/v2-qa`
- `nova/v2-product-polish`
- `nova/v2-visual-polish`

A stale product-polish PR was closed as superseded:
- PR #6
- do not reopen/merge it

Use the three new refinement branches from section 8 instead.

---

## 16. First actions for the next chat

1. Read this handoff in full.
2. Reconcile:
   - `nova/v2-integration`
   - `nova/v2-scale-motion`
   - `nova/v2-detail-polish`
   - `nova/v2-refinement-qa`
   - latest GitHub Action runs
3. Confirm public V2 preview still loads, but do not re-audit the entire site from scratch.
4. Start three lanes in parallel:
   - A: scale/camera/detail motion
   - B: visual/detail polish
   - C: regression/visual QA
5. Make the headphone more visually dominant **without** sacrificing copy separation, mobile readability, hotspot attachment, or interaction ownership.
6. Push small durable checkpoints frequently.
7. Integrate only green lane commits.
8. Run exact-position browser QA and manually inspect screenshots.
9. Build exact artifact.
10. Use samvr only to redeploy V2 preview.
11. Run public preview QA.
12. Show user the refined preview before any production promotion.

---

## 17. Short directive for continuation

Continue NOVA V2 from `SaamVR/Portfolio` using `docs/handoffs/nova-v2-refinement-handoff-2026-09-23.md` and branch `nova/v2-integration`.

The current V2 preview is verified and directionally accepted. The next task is **not** a redesign: increase headphone presence and reveal more physical detail through refined camera scale, dolly, FOV, yaw/pitch and motion choreography, while preserving the verified product narrative, interaction systems, hotspots, accessibility, mobile framing, and QA coverage.

Work in the prepared multi-lane branches, use GitHub Actions continuously, keep samvr deployment-only, and do not promote production until the refined V2 preview is publicly verified and accepted.
