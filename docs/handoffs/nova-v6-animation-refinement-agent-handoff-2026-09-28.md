# NOVA V6 Animation Refinement — AI Agent Handoff

Date: 2026-09-28

Repository: `SaamVR/Portfolio`

## HARD SAFETY BOUNDARY — READ THIS FIRST

### V4 is frozen and read-only

The current approved visual reference is:

- Live V4: `https://v4.nova-interactive-portfolio.pages.dev/`
- GitHub V4 branch: `nova/v4-final-motion`
- V4 baseline head: `3c9b2d49d650503d3d0f3f693070615392a2eeb1`

**DO NOT COMMIT TO `nova/v4-final-motion`.**  
**DO NOT FORCE-PUSH, REBASE, RESET, OR DELETE V4.**  
**DO NOT DEPLOY ANY NEW WORK TO CLOUDFLARE BRANCH `v4`.**  
**DO NOT MODIFY THE EXISTING V4 ALIAS OR ITS deployment workflow as part of V6.**

V4 must remain available as the rollback/reference build.

### All new work goes to V6 only

A dedicated V6 branch has already been created from the exact V4 baseline:

`nova/v6-animation-refinement`

Do all source changes on that branch, or on temporary sub-branches created from it and merged back into it.

Recommended temporary lanes if parallel work is useful:

- `nova/v6-motion-runtime`
- `nova/v6-camera-story`
- `nova/v6-detail-motion`
- `nova/v6-qa`

The final integrated branch must remain:

`nova/v6-animation-refinement`

### Publish only as V6

When the new animation is verified, deploy it to the Cloudflare Pages preview branch:

`v6`

Expected branch alias:

`https://v6.nova-interactive-portfolio.pages.dev/`

Treat that URL as **expected, not verified**, until Wrangler/Cloudflare returns it and deployed public QA passes.

Create/adapt dedicated workflows:

- `.github/workflows/nova-v6-deploy-cloudflare.yml`
- `.github/workflows/nova-v6-public-qa.yml`

Do not reuse a workflow in a way that could deploy to `v4`.

---

# 1. Mission

Refine the existing NOVA V4 animation system into V6.

The V4 concept, product story, visual direction, source model, real-product disclosure, interaction model, and responsive structure are already good.

The main goal is:

**make the headphone feel larger, more detailed, more tactile, more premium, and more intentionally choreographed through motion.**

The next agent should focus primarily on:

- camera choreography
- product framing
- perceived scale
- detail reveal
- source-animation timing
- transition continuity
- lighting motion
- interaction-to-scroll reconciliation
- responsive motion
- motion QA

This is **not** a redesign-from-scratch task.

---

# 2. Read these files before writing code

Read in this order:

1. `docs/handoffs/nova-v4-final-motion-handoff-2026-09-27.md`
2. `docs/handoffs/nova-v3-real-product-motion-handoff-2026-09-25.md`
3. `docs/superpowers/specs/2026-09-23-nova-v2-product-experience-design.md`
4. `docs/superpowers/plans/2026-09-23-nova-v2-product-experience.md`
5. `nova/PROJECT_STATE.md`
6. `nova/VERIFIED_STATE.md`
7. `nova/site/runtime/timeline.js`
8. `nova/site/runtime/render-adapter.js`
9. `nova/site/runtime/composer.js`
10. `nova/site/app.js`
11. `nova/site/index.html`
12. `nova/site/styles.css`
13. `nova/site/interactions/inspection-controller.js`
14. `nova/site/interactions/fold-controller.js`
15. `nova/site/interactions/hotspot-controller.js`
16. `nova/site/interactions/mode-controller.js`
17. `nova/tests/motion-browser-audit.mjs`
18. `nova/tests/motion_control_contract.mjs`
19. `nova/tests/motion_handoff_contract.mjs`
20. `nova/tests/motion_pose_contract.mjs`
21. `nova/tests/render_adapter_contract.mjs`
22. `.github/workflows/nova-v4-public-qa.yml`
23. `.github/workflows/nova-v4-deploy-cloudflare.yml`

Do not start by rewriting `app.js`.

Understand the existing motion ownership first.

---

# 3. Current V4 release facts

Live preview:

`https://v4.nova-interactive-portfolio.pages.dev/`

Source branch:

`nova/v4-final-motion`

Current branch head:

`3c9b2d49d650503d3d0f3f693070615392a2eeb1`

The last deployed-public-QA source was:

`8805f02e392c5f4c4bbb15c798b668a888780c5e`

V4 public QA run:

`36274674274`

Conclusion:

`SUCCESS`

The commits after that public-QA source only normalized the V4 deployment workflow and added the final handoff document. The V4 site source itself remained the verified implementation.

---

# 4. What NOVA is

NOVA is a premium interactive 3D headphone product-launch experience that also acts as a portfolio piece.

The visitor should first experience:

- product desirability
- product form
- product details
- wireless/audio behavior
- noise-control behavior
- physical foldability
- direct inspection

Only later should the site reveal how it was engineered.

The 3D technology is the medium, not the headline.

The user specifically wants V6 to improve:

1. headphone scale
2. product presence
3. detail visibility
4. motion quality
5. transition quality
6. camera positioning
7. source-animation timing
8. interaction feel

---

# 5. Current product/reference policy

V4 uses an independent product-study approach using official Sony WH-1000XM6 specifications as a real-world reference envelope.

Do not imply Sony affiliation.

Do not replace the current factual reference content with invented NOVA specifications.

Current reference content includes:

- Sony WH-1000XM6 reference disclosure
- Approx. 254 g / 8.96 oz
- 30 mm / 1.18 in dynamic driver
- Bluetooth 5.3
- SBC / AAC / LDAC / LC3
- 30 hrs NC on / 40 hrs NC off for AAC/SBC/LC3
- 26 hrs NC on / 36 hrs NC off for LDAC
- multipoint: 2 devices
- 3.5 mm wired playback
- wired/Bluetooth caveat
- touch sensor controls
- NC/AMB button

Do not make the animation refinement depend on rewriting this product content.

---

# 6. Existing product story

The active V4 experience ranges are:

```
Hero        0.00–0.12
Design      0.12–0.28
Wireless    0.28–0.45
Adaptive    0.45–0.58
Form        0.58–0.72
Inspection  0.72–0.86
Resolution  0.86–0.96
Behind      0.96–1.00
```

Current section story:

## Hero

Headline:

`Hear beyond.`

Purpose:

Introduce NOVA as a premium object.

## Design

Headline:

`Made to disappear.`

Three sequential details:

- Cushion
- Hinge
- Touch controls

The three details must remain sequential.

Do not restore three simultaneous competing labels.

## Wireless

Headline:

`Choose the wireless link.`

Reference modes:

- LDAC
- AAC
- LC3

## Adaptive

Headline:

`Quiet when you need it.`

States:

- Noise Canceling
- Ambient Sound

## Form

Headline:

`Made to move.`

States:

- Open
- Fold

## Inspection

Headline:

`Look closer.`

Named views:

- Front
- Side
- Rear

Then direct drag/swipe fine-tuning.

## Resolution

Headline:

`Hear beyond.`

Practical summary:

- 30 hrs NC on
- 40 hrs NC off
- Bluetooth 5.3
- Multipoint
- 8.96 oz
- Specifications

## Behind

Headline:

`Designed like a launch. Built like a product.`

Only here does the page become an explicit case study.

---

# 7. Core 3D asset facts

Primary asset:

`nova/site/assets/headphones-web.gltf`

Runtime:

- Three.js 0.180
- GLTFLoader
- BufferGeometryUtils

Principal clip:

`ArmatureAction`

Principal clip duration:

approximately `27.71 sec`

Asset structure:

- 36 skeletal joints
- 14 skinned meshes
- 3 animation clips
- 12 optimized WebP texture maps

Presentation:

- correct upright root orientation is approximately `-90° X`
- long cable mesh `Circle.013_0` is hidden
- cable must remain excluded from camera-fitting bounds

Do not rebuild the asset pipeline unless there is evidence that it is necessary.

---

# 8. Existing animation architecture — preserve this separation

## A. Global authored timeline

File:

`nova/site/runtime/timeline.js`

This controls:

- product position
- product scale
- product yaw/pitch
- camera position
- camera target
- FOV
- lighting
- environment
- active chapter

Keep one continuous timeline.

Do not go back to:

`section -> hard camera preset -> hard model preset`

## B. Separate source-pose timeline

The file also contains:

`PRODUCT_POSE_KEYFRAMES`

This is deliberate.

The source GLTF animation tells the physical articulation story.

The camera tells the visual story.

Do not bind raw source-animation time directly to scroll.

## C. Visual-state composer

File:

`nova/site/runtime/composer.js`

The composer combines the authored base state with bounded interaction influences.

Ownership rules matter.

Examples:

- fold controller owns source pose temporarily
- inspection controller owns turntable/view influence
- hotspot focus owns bounded detail offsets
- codec/noise modes own environment/light behavior
- pointer is low priority

Do not allow controllers to write directly to camera/product state outside this system.

## D. Render adapter

File:

`nova/site/runtime/render-adapter.js`

Already includes damped:

- camera position
- camera target
- product position
- product rotation
- product scale
- source-pose time

The source-pose path also has a hard velocity cap.

Preserve the idea of bounded velocity.

Do not return to direct unsmoothed `mixer.setTime(targetPose * duration)` on every scroll frame.

## E. Inspection

Inspection has its own turntable-like transform.

Front / Side / Rear named views and manual fine-tuning must stay art-directed.

Do not replace this with unrestricted OrbitControls.

---

# 9. Main V6 visual objective: make the product larger

The V4 product is good but can still feel too conservatively framed in several chapters.

V6 should make the headphone own the page.

Use camera distance and FOV before using large model-scale changes.

Keep normalized product scale close to the current range unless a particular shot requires more.

Desired composition targets are visual targets, not rigid numerical tests:

- Hero resolved product: roughly 55–68% of viewport height
- Design close-up: roughly 70–88% of viewport height, intentional cropping allowed
- Wireless/Adaptive: roughly 58–72% of viewport height
- Form: roughly 62–76% of viewport height
- Inspection: roughly 65–78% of viewport height
- Resolution: roughly 62–76% of viewport height
- Behind: deliberately smaller/secondary

Mobile targets should be slightly smaller to protect copy and controls.

The important rule:

**do not make the product larger by causing product/copy collisions.**

If space is needed, move the camera composition and copy field deliberately.

---

# 10. Refined V6 motion story

This is the intended emotional and physical story.

Do not treat the percentages as immutable. They are authored beats.

## Beat 1 — Macro arrival

Approx. progress:

`0.00–0.035`

Story:

The visitor arrives inside the product rather than looking at a centered catalog render.

Show:

- earcup material
- hinge/headband geometry
- controlled highlight
- partial silhouette

Motion:

- very slow camera retreat
- subtle 3–5° change in angle
- small source-pose breathing only
- no decorative spin

Goal:

Create tactile curiosity.

The first frame should already feel premium.

## Beat 2 — Full Hero reveal

Approx. progress:

`0.035–0.12`

Story:

The details resolve into the complete headphone.

Motion:

- camera pulls back
- product becomes fully readable
- yaw eases toward a strong three-quarter hero
- key light broadens
- rim light reveals full outer silhouette

Important:

The product should become **larger than V4's conservative hero resolution**, but still leave a clean text field.

End with a real visual plateau.

Do not keep drifting after the Hero has resolved.

## Beat 3 — Enter the Design study

Approx. progress:

`0.12–0.16`

Story:

The camera commits to the hardware.

Motion:

- short deliberate dolly toward the near earcup
- yaw turns only enough to expose material depth
- product grows in frame primarily by camera movement
- background/lighting remain calm

This should feel like a product-film cut executed as continuous motion.

## Beat 4 — Cushion detail

Approx. progress:

`0.16–0.195`

Story:

Show comfort/contact geometry.

Motion:

- mostly settled
- micro camera arc only
- light glides across cushion material
- active annotation stays physically attached
- do not move the product enough to make the annotation chase it

Desired feeling:

macro product photography, but live.

## Beat 5 — Hinge detail

Approx. progress:

`0.195–0.235`

Story:

Move the viewer's attention from cushion to articulation.

Motion:

- camera pans/orbits to hinge, not a whole-page model translation
- 6–12° controlled angular travel is enough
- very small dolly correction
- lighting follows the hinge
- inactive annotation fades rather than flying away

The source skeletal pose should stay stable.

Do not fold here.

## Beat 6 — Touch-control detail

Approx. progress:

`0.235–0.28`

Story:

Finish the Design chapter on the earcup control surface.

Motion:

- small controlled orbit to make the touch surface readable
- light/specular highlight moves more than the model
- settle before leaving Design

The Design sequence should feel like:

`Cushion -> Hinge -> Control surface`

not:

`three labels appearing around a spinning model`.

## Beat 7 — Wireless transition

Approx. progress:

`0.28–0.34`

Story:

The page leaves physical construction and enters signal/audio space.

Motion:

- camera eases back enough to restore the full silhouette
- source rig opens once into the strong listening pose
- environment darkens
- spatial field becomes visible
- product remains large

This is the main physical opening action.

Do not repeat the fold/open cycle elsewhere unless the user explicitly uses the Fold control.

## Beat 8 — Wireless listening state

Approx. progress:

`0.34–0.45`

Story:

The product is now in a confident listening state.

Motion:

- hold strong open pose
- gentle 2–4° breathing motion allowed
- codec selection changes environment/light character
- avoid changing product geometry for codec buttons

The headphone should occupy more screen area than V4 if copy clearance permits.

Use lighting/environment for LDAC/AAC/LC3 differentiation.

## Beat 9 — Noise control

Approx. progress:

`0.45–0.58`

Story:

Explain isolation vs awareness without cutting to another composition.

Motion:

- retain mostly the same camera family as Wireless
- small lateral orbit toward control surface
- NC compresses the environment
- Ambient opens the environment
- product size remains large and stable

Do not make the camera reset just because the chapter changed.

## Beat 10 — Prepare to fold

Approx. progress:

`0.58–0.62`

Story:

Move from listening into physical portability.

Motion:

- camera goes to a more useful three-quarter side
- slight dolly in
- product remains open
- settle before the fold begins

## Beat 11 — Fold demonstration

Approx. progress:

`0.62–0.69`

Story:

The real rig demonstrates packability.

Motion:

- use the real source animation
- let the fold happen clearly enough to read the hinge
- camera compensates for changing bounds
- avoid rapid source-time scrubbing
- no camera spin while the rig is folding

This needs to feel mechanical and physical.

## Beat 12 — Folded plateau / reopen

Approx. progress:

`0.69–0.72`

Story:

Let the visitor understand the folded state.

Motion:

- hold for a short plateau
- if authored scroll needs to reopen, do it deliberately and smoothly
- if the user manually selected Fold/Open, preserve interaction ownership and reconcile back to timeline without snapping

## Beat 13 — Inspection arrival

Approx. progress:

`0.72–0.76`

Story:

The product moves from film direction into user control.

Motion:

- camera centers the product
- product grows slightly
- rotation velocity drops
- UI appears only when the product is nearly settled

The site should communicate:

`Now you can control it.`

## Beat 14 — Front / Side / Rear

Approx. progress:

`0.76–0.86`

Story:

Give controlled industrial-design inspection.

Motion:

- named views use the existing spring/turntable architecture
- front -> side -> rear should feel like rotating a real object on a premium turntable
- manual drag is fine-tuning, not unrestricted exploration
- keep product large
- preserve full headband/earcups unless a specific close-up is intentional

Reset should clear manual offsets without a snap.

## Beat 15 — Commercial resolution

Approx. progress:

`0.86–0.96`

Story:

The visitor leaves inspection and returns to a launch-poster hero.

Motion:

- release inspection ownership
- camera pulls into the strongest open silhouette
- product should become one of the largest clean full-product compositions in the site
- warm studio tone returns
- motion slows to near stillness

This needs a strong final product image.

Do not let inspection damping trail across the `Hear beyond.` headline.

## Beat 16 — Behind the build

Approx. progress:

`0.96–1.00`

Story:

Only now does the product become secondary.

Motion:

- product recedes
- move slightly to a construction-field position
- lower motion amplitude
- technical/case-study content gains hierarchy

This is the only chapter where aggressively reducing product scale is desirable.

---

# 11. Motion principles

## Product owns the composition

The headphone is not a floating decoration.

Every camera move must answer one of these questions:

- what product detail are we revealing?
- what physical action are we explaining?
- what feature state are we communicating?
- are we entering/exiting interaction?
- are we restoring the commercial hero?

If the move does none of those, remove it.

## Camera first, scale second

Prefer:

- camera dolly
- camera orbit
- camera target
- FOV

before large changes to product scale.

Large scale interpolation can look like a DOM transform rather than a photographed object.

## Stable product, moving light

When explaining materials/details, moving the light is often more premium than moving the headphone.

Use this especially for:

- cushion
- hinge
- touch surface

## One physical action at a time

Do not:

- fold while camera makes a large orbit
- rotate inspection while source pose changes dramatically
- move product position while camera pans strongly in the opposite direction

Layered motion should be complementary, not competitive.

## Settle moments are mandatory

Each chapter needs a readable plateau.

A premium product film does not move everything all the time.

## Motion hierarchy

Preferred response speed:

1. direct UI feedback — fastest
2. direct manipulation — responsive but damped
3. source mechanical action — medium
4. camera — cinematic
5. environmental atmosphere — slowest

## Reverse scroll matters

Every authored sequence must also look acceptable in reverse.

Do not author a forward-only transition that breaks when the user scrolls upward.

---

# 12. Technical refinement recommendations

These are recommended directions, not permission to rewrite the entire runtime.

## A. Refine keyframes before adding conditionals

First improve:

`nova/site/runtime/timeline.js`

Prefer additional meaningful authored beats over adding many `if(range===...)` patches.

Use keyframes for:

- hero macro
- hero settle
- cushion
- hinge
- control
- wireless opening
- NC/Ambient
- pre-fold
- folded plateau
- inspection entry
- resolution hero
- behind recession

## B. Consider a shot-level abstraction

If `KEYFRAMES` becomes hard to maintain, a light abstraction is acceptable:

```js
{
  progress,
  camera,
  target,
  fov,
  productPosition,
  productYaw,
  productPitch,
  productScale,
  lighting,
  environment,
  intent
}
```

The runtime should still interpolate continuously.

Do not add a large animation framework just to avoid simple interpolation.

## C. Improve scale through optics

To make the headphone larger:

- reduce camera Z where safe
- narrow FOV slightly for premium/product-photography compression
- use target offset to create negative space for copy
- avoid large product `scale` jumps

A larger object with controlled perspective will look more expensive than a uniformly scaled mesh.

## D. Preserve source-pose velocity protection

The existing render adapter caps source-pose movement.

Keep that.

If refining it, use a critically damped or velocity-limited solution with explicit max velocity/acceleration.

Do not allow a large scroll delta to scrub through ugly intermediate rig states in one frame.

## E. Camera target and camera position need separate damping

V4 already treats look-target convergence separately.

Keep that separation.

For V6, consider tuning per beat:

- Design target: responsive enough to follow details
- Fold: slower target to avoid visual chatter
- Inspection exit -> Resolution: target must reclaim the headline field quickly
- Behind: slower, calmer

## F. Detail motion should be anchor-aware

Do not move a detail annotation independently of the product.

Use existing 3D hotspot/anchor projection.

The Design controls remain stable DOM UI; projected labels are supporting annotations.

## G. Mobile gets its own motion values

Do not simply multiply desktop values.

Mobile needs:

- smaller yaw
- shallower dolly
- slightly more camera distance
- smaller copy/product overlap risk
- larger touch targets
- shorter visual travel

The story stays the same.

The composition can differ.

---

# 13. Things that have already failed historically

Do not reintroduce these.

## Raw scroll -> raw source animation

Problem:

visible rig scrubbing and snaps.

## Global decorative spinning

Problem:

product stops looking premium.

## Large product translations used only to make room for text

Problem:

model feels like a DOM card sliding around.

## Three simultaneous Design hotspots

Problem:

visual competition and unstable annotations.

## Section-specific independent camera presets

Problem:

hard transitions and chapter snaps.

## Large inspection freedom

Problem:

art direction disappears.

## Cable included in bounds

Problem:

camera framing becomes incorrect.

## Constant animation

Problem:

visitor never gets a readable product moment.

---

# 14. V6 initial implementation plan

## Phase 1 — Preserve baseline

1. Confirm `nova/v6-animation-refinement` is based on V4 SHA `3c9b2d49...`.
2. Do not write to `nova/v4-final-motion`.
3. Capture a baseline V4 screenshot/contact sheet at the current QA landmarks.
4. Record current motion metrics.

## Phase 2 — Motion audit

Audit these separately:

- product screen occupancy
- product/copy collision
- camera velocity
- camera-target velocity
- source-pose velocity
- scale velocity
- rotation velocity
- Design annotation movement
- Form fold readability
- Inspection spring behavior
- Resolution handoff

Do not mix all problems into one patch.

## Phase 3 — Larger product framing

Refine Hero, Design, Wireless, Form, Inspection, Resolution in that order.

For each:

1. adjust camera path
2. adjust target
3. adjust FOV
4. only then adjust product scale if still needed
5. run browser capture
6. compare against V4 baseline

## Phase 4 — Detail choreography

Implement the Cushion -> Hinge -> Controls motion story.

Keep source pose steady.

Use:

- small camera arcs
- controlled dolly
- lighting emphasis
- projected annotation

## Phase 5 — Physical articulation

Refine:

- one authored opening action entering Wireless
- Fold/Open interaction
- folded plateau
- smooth ownership release

## Phase 6 — Inspection

Refine:

- arrival
- Front/Side/Rear spring
- manual drag
- reset
- exit to Resolution

Do not allow inspection state to leak into Resolution.

## Phase 7 — Transition pass

Audit every boundary:

- Hero -> Design
- Design -> Wireless
- Wireless -> Adaptive
- Adaptive -> Form
- Form -> Inspect
- Inspect -> Resolution
- Resolution -> Behind

Fix continuity in the authored timeline before adding special-case CSS/JS.

## Phase 8 — Responsive pass

Repeat the full story on:

- desktop 1440×1000
- desktop ~1280 width
- tablet 1024×768
- mobile 390×844

Mobile is a separate composition pass.

## Phase 9 — QA

Run:

- contract tests
- motion control tests
- pose tests
- browser motion audit
- product framing audit
- public-preview QA after deployment

Do not loosen an existing strict assertion simply to make CI green unless the assertion is demonstrably stale and you document why.

## Phase 10 — V6 deployment

Only after exact-source QA is green:

1. build exact production artifact
2. create/use V6-only Cloudflare workflow
3. deploy to Cloudflare branch `v6`
4. verify actual deployment URL
5. run V6 public browser QA
6. inspect screenshots manually
7. record exact commit/artifact/deployment in a V6 completion handoff

Never deploy the new build to `v4`.

---

# 15. Suggested V6 QA landmarks

Capture exact progress around:

```
0.02
0.06
0.10
0.12
0.16
0.18
0.205
0.235
0.255
0.28
0.30
0.32
0.34
0.36
0.41
0.45
0.49
0.54
0.58
0.62
0.65
0.69
0.72
0.76
0.79
0.83
0.86
0.90
0.945
0.96
0.985
```

Also capture:

- Cushion active
- Hinge active
- Touch Controls active
- LDAC
- AAC
- LC3
- Noise Canceling
- Ambient Sound
- Open
- Fold
- Front
- Side
- Rear
- manual drag left/right
- Reset
- Specifications
- mobile nav
- reduced-motion
- GLTF fallback

---

# 16. Visual acceptance criteria

The V6 animation is ready only if:

- the headphone looks larger and more premium than V4 without crowding copy;
- the product remains readable through every transition;
- no headband/earcup clipping occurs unintentionally;
- Design details are easier to understand than V4;
- source animation never visibly scrubs or snaps;
- Fold/Open feels mechanical and intentional;
- camera motion has acceleration/deceleration rather than constant velocity;
- camera and source pose do not fight;
- direct inspection feels responsive;
- Resolution regains a clean hero composition;
- mobile preserves the same story;
- reverse scrolling is acceptable;
- V4 remains completely untouched;
- V6 has its own public URL and QA evidence.

---

# 17. Deployment rules

## Never touch V4 deployment

Do not run:

```
wrangler pages deploy ... --branch v4
```

Do not edit the live V4 alias.

## V6 deployment target

Use:

```
--project-name nova-interactive-portfolio
--branch v6
```

The exact source commit used in deployment must be the verified V6 commit.

Recommended workflow naming:

`.github/workflows/nova-v6-deploy-cloudflare.yml`

Recommended public QA workflow:

`.github/workflows/nova-v6-public-qa.yml`

Recommended public QA URL after verified deployment:

`https://v6.nova-interactive-portfolio.pages.dev/`

Again: confirm the actual URL from Cloudflare before recording it as verified.

---

# 18. Git discipline

V4:

`nova/v4-final-motion`

is immutable for this task.

V6:

`nova/v6-animation-refinement`

is the integration target.

Commit motion fixes with narrow messages, for example:

```
refine(nova-v6): enlarge hero framing without copy collision
refine(nova-v6): choreograph cushion to hinge camera arc
refine(nova-v6): preserve open pose through wireless chapter
refine(nova-v6): slow fold camera while rig articulates
refine(nova-v6): tighten inspection turntable spring
refine(nova-v6): restore resolution hero after inspection
test(nova-v6): enforce product occupancy at motion landmarks
ci(nova-v6): add V6 public preview QA
```

Do not bundle unrelated motion, copy, CSS, and deployment changes into one commit.

---

# 19. Recommended working method

Use a browser-first TDD/refinement loop:

1. observe exact defect;
2. write/extend a motion or framing contract when practical;
3. make the smallest authored-motion change;
4. run pure contracts;
5. run browser QA;
6. inspect screenshots manually;
7. keep or revert based on evidence.

For visual work:

**a green test run is necessary but not sufficient.**

Always inspect rendered frames.

---

# 20. What success should feel like

V4 currently feels like a technically strong interactive product page.

V6 should feel like a **directed product film that happens to be rendered live and interactive**.

The visitor should notice:

- scale
- form
- material
- hinge
- controls
- physical fold
- listening state
- inspection

before noticing the code.

The product should feel heavy, physical, premium, and deliberately photographed—even though it is live Three.js.

That is the target.

---

# 21. First action for the new agent

Do this before any write:

1. checkout/read `nova/v6-animation-refinement`;
2. verify its base ancestry includes V4 head `3c9b2d49d650503d3d0f3f693070615392a2eeb1`;
3. open `https://v4.nova-interactive-portfolio.pages.dev/` as the visual reference;
4. read this handoff completely;
5. read the listed runtime/tests;
6. create a **V6 baseline motion report** covering:
   - Hero scale
   - Design detail motion
   - Wireless framing
   - Adaptive framing
   - Fold readability
   - Inspection
   - Resolution handoff
   - Mobile
7. only then begin the V6 motion refinement.

Do not ask to modify V4.

Do not use V4 as the deployment target.

The work product is V6.
