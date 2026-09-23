# NOVA V2 Product Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild NOVA as a premium interactive fictional headphone landing page with a continuous scroll-directed 3D product film, meaningful product controls, constrained direct manipulation, and a late portfolio/implementation reveal.

**Architecture:** Keep the proven Three.js/GLTF asset pipeline, but replace section-owned camera/pose presets with a global authored timeline and a visual-state composer. Product UI and 3D interactions live in separate modules with explicit contracts, so motion/runtime, UI/content, interactions, and QA can be developed in parallel and merged into a dedicated V2 integration branch before any deployment.

**Tech Stack:** Static HTML/CSS/ES modules, Three.js 0.180, GLTFLoader, existing optimized GLTF/WebP assets, Python contract tests, Node-based pure-runtime tests, Playwright visual/interaction QA in GitHub Actions, Cloudflare Pages for preview/production deployment.

**Spec:** `docs/superpowers/specs/2026-09-23-nova-v2-product-experience-design.md`

## Global Constraints

- Preserve rollback branch `backup/nova-interactive-v1-2026-09-23` at commit `9c5e084518f35d364fabc1d565ccb31a6e348eba`.
- Reuse the current Three.js 0.180 + GLTFLoader runtime and optimized GLTF/WebP asset pipeline unless a regression proves a change is necessary.
- Keep the verified upright presentation root at -90° X.
- Keep the long cable mesh hidden from showcase framing.
- Use plausible qualitative feature language only; do not invent numeric specifications, certifications, battery-hour figures, codec support, driver dimensions, or material trademarks.
- Product marketing dominates the first 85–95% of the experience; technical implementation facts appear only in the `Behind NOVA` reveal.
- Mobile is authored independently; it is not a scaled desktop layout.
- `samvr` is deployment-only. All development, debugging, design, asset processing, and QA stay in GPT runtime / hosted repository tooling.
- Do not touch the repository-root LeadFlow product except shared workflow paths explicitly named in this plan.
- Do not overwrite production until a V2 preview passes public verification.

## File Structure

### Runtime / Lane A

- Create `nova/site/runtime/timeline.js` — global scroll progress, named ranges, authored camera/product/light/environment keyframes, interpolation helpers.
- Create `nova/site/runtime/composer.js` — merges authored base state with interaction influences using explicit ownership/weights.
- Create `nova/site/runtime/render-adapter.js` — applies composed state to Three.js camera, product presentation group, lights, and environment uniforms/objects.
- Modify `nova/site/app.js` — orchestration only: load GLTF, wire modules, drive render loop, publish lightweight DOM state.
- Create `nova/tests/timeline_contract.mjs` — Node tests for timeline continuity and composer ownership rules.

### Product UI / Lane B

- Replace `nova/site/index.html` — product-first narrative, semantic controls, fallback content, Behind NOVA reveal.
- Replace `nova/site/styles.css` — premium consumer-product visual system, responsive layouts, control states, reduced-motion/fallback styling.
- Create `nova/site/ui/product-ui.js` — bind semantic controls to callbacks; update active/disabled/ARIA state from composed runtime state.
- Create `nova/tests/test_v2_content_contract.py` — verifies narrative order, semantic controls, prohibited fake-spec patterns, responsive/reduced-motion rules.

### 3D Interaction / Lane C

- Create `nova/site/interactions/fold-controller.js` — OPEN/FOLD ownership and blend-back behavior.
- Create `nova/site/interactions/inspection-controller.js` — constrained drag/swipe yaw/pitch and reset behavior.
- Create `nova/site/interactions/hotspot-controller.js` — 3D anchor projection and hotspot visibility/focus state.
- Create `nova/site/interactions/mode-controller.js` — Spatial/Focus/Ambient and Adaptive/Transparency state outputs.
- Create `nova/site/runtime/environment.js` — lightweight spatial/adaptive field geometry and state application.
- Create `nova/tests/interaction_contract.mjs` — pure-controller tests.

### QA / Lane D

- Update `nova/tests/test_contract.py` — retain GLTF/cable/orientation asset protections; remove V1 section-preset assertions.
- Update `.github/workflows/nova-qa.yml` — V2 viewport captures, interaction sequences, boundary captures, reduced-motion checks.
- Update `.github/workflows/nova-build.yml` — validate new module tree and exact asset/runtime requirements.
- Create `nova/qa-v2.mjs` only if the workflow becomes too large; otherwise keep script generation inline.

## Shared Interfaces

All lane work must honor these exact interfaces.

### `timeline.js`

```js
export const EXPERIENCE_RANGES = {
  hero: [0.00, 0.12],
  design: [0.12, 0.28],
  spatial: [0.28, 0.45],
  adaptive: [0.45, 0.58],
  form: [0.58, 0.72],
  inspect: [0.72, 0.86],
  resolution: [0.86, 0.96],
  behind: [0.96, 1.00],
};

export function getGlobalProgress(scrollY, scrollHeight, viewportHeight) {}
export function getRangeState(progress) {}
export function sampleTimeline(progress, viewportClass) {}
```

`sampleTimeline()` returns:

```js
{
  progress,
  range,
  rangeProgress,
  product: { pose, position:[x,y,z], scale, yaw, pitch },
  camera: { position:[x,y,z], target:[x,y,z], fov },
  lighting: {
    exposure, hemi, key, fill, rim, warm,
    keyColor, rimColor, keyPosition:[x,y,z]
  },
  environment: {
    tone, spatialAmount, spatialSpread,
    adaptiveAmount, openness, motion
  },
  ui: { range, dark, settled }
}
```

### `composer.js`

```js
export function createInteractionState() {}
export function composeVisualState(baseState, interactionState) {}
```

`interactionState` shape:

```js
{
  fold: { weight, targetPose, active },
  inspection: { weight, yaw, pitch, active },
  hotspot: { weight, id, cameraOffset:[x,y,z], targetOffset:[x,y,z] },
  listening: { mode: "spatial"|"focus"|"ambient", weight },
  noise: { mode: "adaptive"|"transparency", weight },
  pointer: { x, y, weight }
}
```

Ownership rules:

- fold may override `product.pose` only;
- inspection may offset camera orbit only;
- hotspot may offset camera/target/light emphasis only;
- listening/noise may influence environment and lighting only;
- pointer is lowest-priority and disabled/reduced during inspection;
- all weights are clamped to `0..1`.

### `product-ui.js`

```js
export function bindProductUI(actions) {}
export function updateProductUI(state) {}
```

`actions` shape:

```js
{
  setListeningMode(mode) {},
  setNoiseMode(mode) {},
  setFoldState(state) {},
  focusHotspot(id) {},
  clearHotspot() {},
  resetInspection() {},
  replay() {}
}
```

### Interaction controllers

Each controller exposes `update(dt, context)` and `getInfluence()`. Input handlers may be controller-specific, but no controller writes directly to Three.js camera/product/light objects.

## Review Focus

1. **Fast/reverse scroll at range boundaries:** camera/product pose must remain continuous and must not jump when progress crosses a named range.
2. **Fold/Open followed immediately by scrolling:** skeletal pose ownership must blend back to the timeline instead of snapping.
3. **Inspection drag plus hotspot selection:** hotspot focus must start from the current composed inspection camera and Reset must restore the authored inspection base.
4. **Mobile/touch interaction:** no hover dependency; tap/swipe controls remain usable and do not trigger page-selection/scroll fighting.
5. **WebGL/model failure and reduced motion:** marketing content and controls remain readable/semantic; reduced-motion uses settled states rather than a frozen or broken experience.

---

## Parallel Execution Strategy

### Foundation gate

Task 1 lands the shared contracts and creates the V2 integration branch. After Task 1, create four lane branches from the exact foundation commit:

- `nova/v2-runtime`
- `nova/v2-product-ui`
- `nova/v2-interactions`
- `nova/v2-qa`

Lane A, B, C, and D can then proceed concurrently. Lane D should pull interface names from Task 1, not wait for finished implementations.

Integration branch:

- `nova/v2-integration`

Merge order into integration:

1. Lane A
2. Lane B
3. Lane C
4. Lane D

This order minimizes overlap because Lane A owns `app.js`, Lane B owns HTML/CSS/UI, Lane C owns interaction/environment modules, and Lane D owns tests/workflows.

---

### Task 1: Establish V2 branch, contracts, and failing tests

**Lane:** Foundation / shared

**Files:**
- Create: `nova/site/runtime/timeline.js`
- Create: `nova/site/runtime/composer.js`
- Create: `nova/tests/timeline_contract.mjs`
- Modify: `nova/tests/test_contract.py`

**Interfaces:**
- Produces: the exact shared interfaces defined above.
- Consumes: current V1 runtime only as reference; no behavior from V1 section presets is preserved by contract.

- [ ] **Step 1: Create `nova/v2-integration` from current `main` and keep V1 backup untouched**

Expected branch base includes the approved spec and this plan, while `backup/nova-interactive-v1-2026-09-23` remains pinned to `9c5e084518f35d364fabc1d565ccb31a6e348eba`.

- [ ] **Step 2: Write the failing Node contract for global progress and continuity**

```js
import assert from "node:assert/strict";
import {
  EXPERIENCE_RANGES,
  getGlobalProgress,
  getRangeState,
  sampleTimeline
} from "../site/runtime/timeline.js";

assert.deepEqual(EXPERIENCE_RANGES.hero, [0, 0.12]);
assert.equal(getGlobalProgress(0, 5000, 1000), 0);
assert.equal(getGlobalProgress(4000, 5000, 1000), 1);

for (const p of [0, .1199, .12, .1201, .2799, .28, .2801, .9599, .96, .9601, 1]) {
  const state = sampleTimeline(p, "desktop");
  assert.equal(Number.isFinite(state.camera.fov), true);
  assert.equal(state.product.position.length, 3);
  assert.equal(state.camera.position.length, 3);
}

for (const boundary of [.12, .28, .45, .58, .72, .86, .96]) {
  const a = sampleTimeline(boundary - 0.0001, "desktop");
  const b = sampleTimeline(boundary + 0.0001, "desktop");
  const delta = Math.hypot(
    a.camera.position[0] - b.camera.position[0],
    a.camera.position[1] - b.camera.position[1],
    a.camera.position[2] - b.camera.position[2]
  );
  assert.ok(delta < 0.08, `camera discontinuity at ${boundary}: ${delta}`);
}
```

- [ ] **Step 3: Run the Node contract and verify failure**

Run:

```bash
node nova/tests/timeline_contract.mjs
```

Expected: FAIL because `timeline.js` exports are not implemented yet.

- [ ] **Step 4: Implement the minimal timeline contract**

Implement:

```js
export const EXPERIENCE_RANGES = {
  hero:[0,.12], design:[.12,.28], spatial:[.28,.45], adaptive:[.45,.58],
  form:[.58,.72], inspect:[.72,.86], resolution:[.86,.96], behind:[.96,1]
};

const clamp01 = v => Math.max(0, Math.min(1, v));
const lerp = (a,b,t) => a + (b-a) * t;
const lerp3 = (a,b,t) => a.map((v,i) => lerp(v,b[i],t));
const smooth = t => t*t*(3-2*t);

export function getGlobalProgress(scrollY, scrollHeight, viewportHeight){
  return clamp01(scrollY / Math.max(1, scrollHeight - viewportHeight));
}

export function getRangeState(progress){
  const p = clamp01(progress);
  for (const [range,[start,end]] of Object.entries(EXPERIENCE_RANGES)) {
    if (p <= end || range === "behind") {
      return { range, progress: clamp01((p-start)/Math.max(.0001,end-start)) };
    }
  }
  return { range:"behind", progress:1 };
}
```

Add the first authored keyframe table and `sampleTimeline()` with continuous interpolation. Exact art-direction values are tuned later; the contract must already be continuous.

- [ ] **Step 5: Write the failing composer ownership test**

Append to `timeline_contract.mjs`:

```js
import { createInteractionState, composeVisualState } from "../site/runtime/composer.js";

const base = sampleTimeline(.65, "desktop");
const interaction = createInteractionState();
interaction.fold = { weight:1, targetPose:.40, active:true };
interaction.inspection = { weight:1, yaw:.2, pitch:.05, active:true };
interaction.listening = { mode:"focus", weight:1 };

const composed = composeVisualState(base, interaction);
assert.equal(composed.product.pose, .40);
assert.notEqual(composed.camera.position[0], base.camera.position[0]);
assert.notEqual(composed.environment.spatialSpread, base.environment.spatialSpread);
assert.deepEqual(composed.product.position, base.product.position);
```

- [ ] **Step 6: Run and verify the composer test fails**

Run: `node nova/tests/timeline_contract.mjs`

Expected: FAIL because composer functions are not implemented.

- [ ] **Step 7: Implement `createInteractionState()` and `composeVisualState()`**

Use plain objects and cloned arrays so interaction composition does not mutate the authored base state. Clamp every interaction weight to `0..1`.

- [ ] **Step 8: Replace V1 choreography contract assertions**

In `nova/tests/test_contract.py`, remove assertions requiring `sceneProgress(section)` and V1 `case 'hero'` pose mappings. Add:

```python
def test_v2_global_timeline_modules_exist():
    assert 'from "./runtime/timeline.js"' in js or "runtime/timeline.js" in js

def test_v2_does_not_restore_fbx():
    assert "GLTFLoader" in js
    assert "FBXLoader" not in js
```

Retain cable framing, GLTF asset, responsive, and reduced-motion protections.

- [ ] **Step 9: Run tests**

Run:

```bash
python3 -m pytest nova/tests/test_contract.py -q
node nova/tests/timeline_contract.mjs
```

Expected: PASS.

- [ ] **Step 10: Commit foundation**

```bash
git add nova/site/runtime nova/tests
git commit -m "refactor(nova): establish V2 timeline and state contracts"
```

Then create all four lane branches from this commit.

---

### Task 2A: Build the continuous motion/runtime foundation

**Lane:** A — Motion/runtime

**Files:**
- Modify: `nova/site/runtime/timeline.js`
- Modify: `nova/site/runtime/composer.js`
- Create: `nova/site/runtime/render-adapter.js`
- Modify: `nova/site/app.js`
- Modify: `nova/tests/timeline_contract.mjs`

**Interfaces:**
- Consumes: shared timeline/composer contracts from Task 1.
- Produces: `createRenderAdapter(deps)`, `adapter.apply(state, dt)`, and body datasets `data-model-state`, `data-range`, `data-range-progress`, `data-settled`.

- [ ] **Step 1: Extend the failing continuity test to camera target, FOV, product pose, and scale**

Add checks around every range boundary:

```js
for (const boundary of [.12,.28,.45,.58,.72,.86,.96]) {
  const a = sampleTimeline(boundary - .0001, "desktop");
  const b = sampleTimeline(boundary + .0001, "desktop");
  assert.ok(Math.abs(a.camera.fov-b.camera.fov) < .25);
  assert.ok(Math.abs(a.product.pose-b.product.pose) < .04);
  assert.ok(Math.abs(a.product.scale-b.product.scale) < .04);
  assert.ok(Math.hypot(...a.camera.target.map((v,i)=>v-b.camera.target[i])) < .08);
}
```

- [ ] **Step 2: Run contract and verify any discontinuous fields fail**

Run: `node nova/tests/timeline_contract.mjs`

Expected: at least one new assertion fails until all authored keyframes interpolate continuously.

- [ ] **Step 3: Implement the authored keyframe table**

Create a compact table keyed by global progress. Include keyframes at minimum around:

```js
[0.00, 0.04, 0.10, 0.12, 0.20, 0.28, 0.36, 0.45, 0.58, 0.65, 0.72, 0.79, 0.86, 0.92, 0.96, 1.00]
```

Use the verified pose scan as the source of valid pose windows. Keep actual model scale near `1` and use camera distance for most perceived zoom.

- [ ] **Step 4: Add viewport-class keyframe adjustments**

`sampleTimeline(progress, viewportClass)` must support `desktop`, `tablet`, and `mobile`. Mobile keeps shallower lateral offsets/orbits and product primarily centered/upper-center.

- [ ] **Step 5: Run timeline tests**

Run: `node nova/tests/timeline_contract.mjs`

Expected: PASS.

- [ ] **Step 6: Create the Three.js render adapter**

Export:

```js
export function createRenderAdapter({
  THREE, camera, presentation, mixer, clipDuration,
  renderer, lights, environment
}) {
  return {
    apply(state, dt) {
      // damp camera/product/light values toward composed state
      // set mixer time from state.product.pose * clipDuration
      // update environment through environment.apply(...)
    }
  };
}
```

No scroll, DOM query, or UI logic belongs in this file.

- [ ] **Step 7: Refactor `app.js` into orchestration**

`app.js` must:

- compute global progress using `getGlobalProgress(scrollY, document.body.scrollHeight, innerHeight)`;
- call `sampleTimeline(progress, viewportClass)`;
- update interaction controllers when present;
- call `composeVisualState(base, interaction)`;
- call `adapter.apply(composed, dt)`;
- expose `data-range`, `data-range-progress`, and `data-settled`;
- preserve GLTF loading, cable hiding, bounds normalization, -90° X orientation, asset-query debugging support.

Remove V1 `resolveScene()`, `sceneProgress()`, `sampleCamera(scene,p)`, and `sampleAnimation(scene,p)`.

- [ ] **Step 8: Run static + timeline tests**

Run:

```bash
python3 -m pytest nova/tests/test_contract.py -q
node nova/tests/timeline_contract.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit Lane A**

```bash
git add nova/site/app.js nova/site/runtime nova/tests/timeline_contract.mjs
git commit -m "feat(nova): add continuous V2 motion runtime"
```

---

### Task 2B: Replace the portfolio-first page with the product-first NOVA campaign

**Lane:** B — Product narrative/UI

**Files:**
- Replace: `nova/site/index.html`
- Replace: `nova/site/styles.css`
- Create: `nova/site/ui/product-ui.js`
- Create: `nova/tests/test_v2_content_contract.py`

**Interfaces:**
- Consumes: `bindProductUI(actions)` and `updateProductUI(state)` contract.
- Produces DOM IDs/data attributes used by Lane C: `data-hotspot`, `data-listening-mode`, `data-noise-mode`, `data-fold-state`, `#inspectionReset`.

- [ ] **Step 1: Write failing product-content tests**

```python
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1] / "site"
html = (ROOT/"index.html").read_text()
css = (ROOT/"styles.css").read_text()

def test_product_story_precedes_technical_story():
    assert html.index("Hear beyond") < html.index("Behind NOVA")

def test_required_product_controls_are_semantic_buttons():
    for value in ["spatial","focus","ambient"]:
        assert f'data-listening-mode="{value}"' in html
    for value in ["adaptive","transparency"]:
        assert f'data-noise-mode="{value}"' in html
    for value in ["open","fold"]:
        assert f'data-fold-state="{value}"' in html
    assert "<button" in html

def test_no_fake_numeric_product_specs():
    banned = ["40-hour", "50-hour", "mm driver", "Bluetooth 5.", "Hi-Res Certified", "$399", "$499"]
    assert not any(term.lower() in html.lower() for term in banned)

def test_mobile_and_reduced_motion_are_authored():
    assert "@media (max-width: 700px)" in css
    assert "prefers-reduced-motion" in css
```

- [ ] **Step 2: Run and verify failure**

Run: `python3 -m pytest nova/tests/test_v2_content_contract.py -q`

Expected: FAIL against V1 content.

- [ ] **Step 3: Replace HTML narrative**

Use eight semantic anchors:

```html
<section id="hero" data-range-anchor="hero">...</section>
<section id="design" data-range-anchor="design">...</section>
<section id="sound" data-range-anchor="spatial">...</section>
<section id="control" data-range-anchor="adaptive">...</section>
<section id="form" data-range-anchor="form">...</section>
<section id="experience" data-range-anchor="inspect">...</section>
<section id="discover" data-range-anchor="resolution">...</section>
<section id="behind" data-range-anchor="behind">...</section>
```

Required primary copy:

- `NOVA`
- `Hear beyond.`
- `Made to disappear.`
- `Your space becomes the soundstage.`
- `Silence, on your terms.`
- `Made to move.`
- `Behind NOVA.`

Move the real 36/14/3/42 implementation facts into `#behind` only.

- [ ] **Step 4: Add semantic product controls**

All selectors are `<button type="button">` with `aria-pressed` or appropriate radio semantics. Hotspots are buttons with descriptive `aria-label` values.

- [ ] **Step 5: Implement `product-ui.js`**

```js
export function bindProductUI(actions){
  document.querySelectorAll("[data-listening-mode]").forEach(button => {
    button.addEventListener("click", () => actions.setListeningMode(button.dataset.listeningMode));
  });
  document.querySelectorAll("[data-noise-mode]").forEach(button => {
    button.addEventListener("click", () => actions.setNoiseMode(button.dataset.noiseMode));
  });
  document.querySelectorAll("[data-fold-state]").forEach(button => {
    button.addEventListener("click", () => actions.setFoldState(button.dataset.foldState));
  });
  document.querySelectorAll("[data-hotspot]").forEach(button => {
    button.addEventListener("click", () => actions.focusHotspot(button.dataset.hotspot));
  });
  document.querySelector("#inspectionReset")?.addEventListener("click", actions.resetInspection);
}

export function updateProductUI(state){
  document.body.dataset.range = state.ui.range;
  document.body.dataset.theme = state.ui.dark ? "dark" : "light";
}
```

Also update `aria-pressed`/active classes based on state.

- [ ] **Step 6: Replace visual styling**

Implement:

- warm bone/stone opening and resolution;
- gradual dark immersive middle;
- product-first typography;
- compact premium segmented controls;
- restrained copper accents;
- reduced decorative construction geometry;
- product-aware leader-line/hotspot styles;
- mobile-authored layouts and tap targets;
- graceful `body[data-model-state="error"]` fallback;
- focus-visible states.

- [ ] **Step 7: Run content tests**

Run:

```bash
python3 -m pytest nova/tests/test_v2_content_contract.py nova/tests/test_contract.py -q
```

Expected: PASS after shared runtime branch is merged; on the isolated UI lane, only content-contract tests must pass.

- [ ] **Step 8: Commit Lane B**

```bash
git add nova/site/index.html nova/site/styles.css nova/site/ui nova/tests/test_v2_content_contract.py
git commit -m "feat(nova): build product-first V2 campaign UI"
```

---

### Task 2C: Implement meaningful 3D product interactions

**Lane:** C — 3D interaction systems

**Files:**
- Create: `nova/site/interactions/fold-controller.js`
- Create: `nova/site/interactions/inspection-controller.js`
- Create: `nova/site/interactions/hotspot-controller.js`
- Create: `nova/site/interactions/mode-controller.js`
- Create: `nova/site/runtime/environment.js`
- Create: `nova/tests/interaction_contract.mjs`

**Interfaces:**
- Consumes: Task 1 interaction-state shape.
- Produces controller influences only; never writes Three.js camera/product/light state directly.

- [ ] **Step 1: Write failing Fold/Open controller tests**

```js
import assert from "node:assert/strict";
import { createFoldController } from "../site/interactions/fold-controller.js";

const fold = createFoldController({ openPose:.20, foldedPose:.40, duration:.7 });
fold.begin("fold", .24);
fold.update(.35, { scrollActive:false, timelinePose:.25 });
let influence = fold.getInfluence();
assert.equal(influence.active, true);
assert.ok(influence.weight > 0);
assert.ok(influence.targetPose > .24);

fold.update(.5, { scrollActive:true, timelinePose:.28 });
influence = fold.getInfluence();
assert.ok(influence.weight < 1, "scroll resumption must release fold ownership");
```

- [ ] **Step 2: Write failing inspection clamp/reset tests**

```js
import { createInspectionController } from "../site/interactions/inspection-controller.js";
const inspect = createInspectionController({ maxYaw:.52, maxPitch:.12 });
inspect.setActive(true);
inspect.dragBy(500, 300, { width:1000, height:800 });
let i = inspect.getInfluence();
assert.ok(Math.abs(i.yaw) <= .52);
assert.ok(Math.abs(i.pitch) <= .12);
inspect.reset();
i = inspect.getInfluence();
assert.equal(i.yaw, 0);
assert.equal(i.pitch, 0);
```

- [ ] **Step 3: Write failing mode-controller tests**

Verify allowed values and weights:

```js
import { createModeController } from "../site/interactions/mode-controller.js";
const modes = createModeController();
modes.setListening("focus");
modes.setNoise("transparency");
modes.update(.2);
const m = modes.getInfluence();
assert.equal(m.listening.mode, "focus");
assert.equal(m.noise.mode, "transparency");
assert.ok(m.listening.weight > 0);
assert.ok(m.noise.weight > 0);
```

- [ ] **Step 4: Run and verify failure**

Run: `node nova/tests/interaction_contract.mjs`

Expected: FAIL because controllers do not exist.

- [ ] **Step 5: Implement Fold/Open ownership and blend-back**

Controller must:

- start from current pose;
- interpolate to open/fold target;
- hold after completion;
- detect deliberate scroll resumption from context;
- reduce ownership weight smoothly toward 0;
- never mutate mixer/camera directly.

- [ ] **Step 6: Implement constrained drag/swipe inspection**

Controller must support:

```js
setActive(active)
pointerDown(x,y,pointerId)
pointerMove(x,y,pointerId, viewport)
pointerUp(pointerId)
dragBy(dx,dy,viewport)
reset()
update(dt)
getInfluence()
```

Disable ambient pointer influence while active drag weight is non-zero.

- [ ] **Step 7: Implement mode controller**

Listening values: `spatial|focus|ambient`.

Noise values: `adaptive|transparency`.

Unsupported values are ignored rather than corrupting state.

- [ ] **Step 8: Implement hotspot controller with 3D projection**

API:

```js
export function createHotspotController({ THREE, camera, anchors, elements }) {
  return {
    focus(id) {},
    clear() {},
    update({ modelRoot, composedState }) {},
    getInfluence() {}
  };
}
```

Use reusable `THREE.Vector3` instances. Anchor definitions are resolved from real model-space points/bones after GLTF inspection. DOM elements receive `transform: translate3d(...)` only when visible.

- [ ] **Step 9: Implement lightweight environment system**

`createEnvironment(scene, THREE)` returns:

```js
{
  apply(environmentState, dt) {},
  resize(width,height) {},
  dispose() {}
}
```

Keep geometry lightweight. Spatial field and adaptive/open field may share geometry/materials; decoration must not outrank product rendering.

- [ ] **Step 10: Run controller tests**

Run: `node nova/tests/interaction_contract.mjs`

Expected: PASS.

- [ ] **Step 11: Commit Lane C**

```bash
git add nova/site/interactions nova/site/runtime/environment.js nova/tests/interaction_contract.mjs
git commit -m "feat(nova): add guided and direct V2 interactions"
```

---

### Task 2D: Upgrade QA to validate V2 continuity and interaction

**Lane:** D — QA/performance/integration

**Files:**
- Modify: `nova/tests/test_contract.py`
- Modify: `.github/workflows/nova-qa.yml`
- Modify: `.github/workflows/nova-build.yml`

**Interfaces:**
- Consumes: body datasets and DOM selectors defined in Tasks 1 and 2B.
- Produces: browser artifacts and hard failure on runtime/interaction/continuity regressions.

- [ ] **Step 1: Add static regression assertions**

Retain:

- GLTFLoader present;
- FBXLoader absent;
- `Circle.013_0` framing exclusion;
- optimized GLTF path;
- responsive/reduced-motion CSS;
- no cable presentation regression.

Add assertions for V2 runtime modules and product-first content.

- [ ] **Step 2: Replace V1 scene capture logic with global-progress capture logic**

The QA script must scroll to normalized progress by:

```js
await page.evaluate(progress => {
  const max = document.documentElement.scrollHeight - innerHeight;
  scrollTo(0, Math.max(0, max * progress));
}, progress);
```

Capture at minimum:

```js
[.02,.10,.119,.121,.20,.279,.281,.36,.449,.451,.57,.579,.581,.65,.719,.721,.79,.859,.861,.92,.959,.961,.985]
```

- [ ] **Step 3: Assert boundary continuity instrumentation**

At each capture read:

```js
{
  range: document.body.dataset.range,
  progress: document.body.dataset.rangeProgress,
  model: document.body.dataset.modelState,
  settled: document.body.dataset.settled
}
```

No capture may report model error/loading after startup.

- [ ] **Step 4: Add interaction sequence tests**

Implement Playwright sequences:

```js
// listening
await page.getByRole('button',{name:/focus/i}).click();

// adaptive/transparency
await page.getByRole('button',{name:/transparency/i}).click();

// fold/open
await page.getByRole('button',{name:/fold/i}).click();
await page.mouse.wheel(0, 600);

// inspection
const canvas = page.locator('#webgl');
const box = await canvas.boundingBox();
await page.mouse.move(box.x+box.width*.5, box.y+box.height*.5);
await page.mouse.down();
await page.mouse.move(box.x+box.width*.72, box.y+box.height*.52,{steps:8});
await page.mouse.up();
await page.getByRole('button',{name:/reset view/i}).click();
```

Save screenshots after each meaningful state.

- [ ] **Step 5: Add mobile tap/swipe path**

Viewport: `390x844`.

Use touchscreen context and verify controls respond without hover.

- [ ] **Step 6: Add reduced-motion QA**

Create page/context with `reducedMotion: "reduce"`. Verify:

- model reaches ready or fallback;
- controls remain focusable/clickable;
- body exposes a settled range state;
- no endless CSS animations are required to understand content.

- [ ] **Step 7: Add model-failure fallback check**

Intercept `**/headphones-web.gltf` and abort. Verify marketing headline, navigation, and at least one product control remain visible; body becomes `data-model-state="error"`; no uncaught page exception from the fallback path.

- [ ] **Step 8: Update build validation**

Require:

```bash
test -f nova/site/runtime/timeline.js
test -f nova/site/runtime/composer.js
test -f nova/site/runtime/render-adapter.js
test -f nova/site/runtime/environment.js
test -f nova/site/ui/product-ui.js
test -f nova/site/interactions/fold-controller.js
test -f nova/site/interactions/inspection-controller.js
test -f nova/site/interactions/hotspot-controller.js
test -f nova/site/interactions/mode-controller.js
```

Continue validating GLTF mesh/skin/animation/image counts.

- [ ] **Step 9: Commit Lane D**

```bash
git add nova/tests .github/workflows/nova-qa.yml .github/workflows/nova-build.yml
git commit -m "test(nova): add V2 continuity and interaction QA"
```

---

### Task 3: Integrate lanes on `nova/v2-integration`

**Lane:** Integration

**Files:**
- Modify: `nova/site/app.js`
- Potentially modify only small interface mismatches in lane-owned files.
- Update: `nova/PROJECT_STATE.md`

**Interfaces:**
- Consumes all Lane A/B/C/D outputs.
- Produces one runnable V2 source tree with no duplicate ownership paths.

- [ ] **Step 1: Merge Lane A into integration**

Run full static/Node tests.

- [ ] **Step 2: Merge Lane B**

Resolve only orchestration imports/selectors. Do not rewrite B styling/content during conflict resolution.

- [ ] **Step 3: Merge Lane C**

Wire controllers into `app.js`:

```js
const actions = {
  setListeningMode: mode => modes.setListening(mode),
  setNoiseMode: mode => modes.setNoise(mode),
  setFoldState: state => fold.begin(state, currentPose),
  focusHotspot: id => hotspots.focus(id),
  clearHotspot: () => hotspots.clear(),
  resetInspection: () => inspection.reset(),
  replay: () => scrollTo({ top:0, behavior: reducedMotion ? "auto" : "smooth" })
};
bindProductUI(actions);
```

The render loop aggregates controller influences into the Task 1 `interactionState`, then composes once.

- [ ] **Step 4: Merge Lane D**

Run:

```bash
python3 -m pytest nova/tests -q
node nova/tests/timeline_contract.mjs
node nova/tests/interaction_contract.mjs
```

Expected: PASS.

- [ ] **Step 5: Add progressive model-failure fallback**

If GLTF loading errors, set `data-model-state="error"`, keep all product-copy/UI DOM rendered, hide controls that require model manipulation only when their action cannot work, and preserve navigation/product story.

- [ ] **Step 6: Update project state**

Record:

- V2 integration branch;
- lane commit SHAs;
- runtime architecture;
- unfinished visual-QA issues if any;
- explicit statement that production still points at V1 until preview acceptance.

- [ ] **Step 7: Commit integration**

```bash
git add nova/site nova/tests nova/PROJECT_STATE.md .github/workflows
git commit -m "feat(nova): integrate V2 product experience"
```

---

### Task 4: Run browser QA, inspect artifacts, and refine motion values

**Lane:** D + targeted owner fixes

**Files:**
- Modify only files implicated by observed QA defects.
- Update `nova/VERIFIED_STATE.md` after passing.

**Interfaces:**
- Consumes integrated V2 branch.
- Produces verified screenshots/artifacts and exact tested commit SHA.

- [ ] **Step 1: Trigger V2 GitHub Actions QA on integration branch**

The workflow must run the exact integrated source with restored GLTF cache and Three.js 0.180 vendor files.

- [ ] **Step 2: Inspect every required desktop/tablet/mobile screenshot**

Reject captures with:

- product/type collision;
- unreadable product orientation;
- abrupt framing changes;
- excessive product translation;
- feature graphics overpowering product;
- clipped controls;
- hotspot detachment;
- mobile copy/product overlap.

- [ ] **Step 3: Inspect all transition-boundary captures**

Compare pairs around `.12/.28/.45/.58/.72/.86/.96`. Fix timeline keyframes rather than adding special-case DOM hacks whenever the issue is camera/product continuity.

- [ ] **Step 4: Inspect interaction artifacts**

Confirm:

- Spatial/Focus/Ambient visibly differ through environment/light;
- Adaptive/Transparency visibly differ without camera reset;
- Fold/Open uses real source animation;
- scrolling after Fold/Open does not snap;
- drag is constrained;
- Reset returns to authored inspection;
- hotspot focus remains attached to the product.

- [ ] **Step 5: Repeat QA until clean**

Each refinement commit names the actual defect, for example:

```bash
git commit -m "fix(nova): smooth design to spatial camera handoff"
git commit -m "fix(nova): separate mobile inspection copy from product"
```

- [ ] **Step 6: Record verified state**

Update `nova/VERIFIED_STATE.md` with:

- tested commit;
- workflow run ID;
- artifact ID/SHA;
- viewport matrix;
- interaction matrix;
- known accepted limitations.

---

### Task 5: Build exact production artifact and deploy preview

**Lane:** Deployment (samvr only for deploy command)

**Files:**
- No source changes unless public verification discovers a production-only defect.

- [ ] **Step 1: Run production-bundle workflow**

Require successful exact asset/runtime validation and artifact upload.

- [ ] **Step 2: Download/inspect artifact in GPT runtime**

Verify module tree, HTML/CSS/JS, GLTF, WebP maps, and Three.js vendor runtime are present.

- [ ] **Step 3: Use samvr only to deploy the exact verified artifact to Cloudflare preview branch**

Target:

`redesign` (or a new `v2` preview alias if preserving redesign alias is useful).

Do not edit source on samvr.

- [ ] **Step 4: Publicly verify preview from GPT runtime**

Verify:

- production HTML/CSS reachable;
- model/runtime loads through browser QA where available;
- desktop/mobile public screenshots match the verified artifact;
- no missing module/asset paths.

- [ ] **Step 5: Record preview URL and deployment ID**

Update `nova/VERIFIED_STATE.md` on the integration branch.

---

### Task 6: Promote V2 only after preview acceptance

**Lane:** Deployment

**Files:**
- Update `nova/VERIFIED_STATE.md` and `nova/PROJECT_STATE.md` after deployment.

- [ ] **Step 1: Confirm preview acceptance**

Do not infer approval from a successful deploy alone.

- [ ] **Step 2: Merge `nova/v2-integration` to `main`**

Preserve the V1 backup branch.

- [ ] **Step 3: Build exact `main` production artifact**

Confirm it matches the accepted integration source.

- [ ] **Step 4: Use samvr only to deploy the verified artifact to Cloudflare production branch `main`**

No source edits or QA on samvr.

- [ ] **Step 5: Verify primary production alias from GPT runtime**

Primary alias:

`https://nova-interactive-portfolio.pages.dev/`

Verify product-first copy, critical controls, model load, and public asset availability.

- [ ] **Step 6: Record final durable state**

Record final production commit, artifact hash, Cloudflare deployment URL, preview URL, and rollback branch.

---

## Execution Checkpoints

### Checkpoint A — Foundation
- shared interfaces committed;
- four lane branches created;
- V1 rollback untouched.

### Checkpoint B — Parallel lane completion
- Lane A runtime tests pass;
- Lane B content tests pass;
- Lane C interaction tests pass;
- Lane D QA workflow compiles against shared contracts.

### Checkpoint C — Integration
- all static/Node tests pass;
- no duplicate state ownership;
- no V1 active-scene choreography remains.

### Checkpoint D — Visual acceptance
- browser QA clean at required viewports;
- boundary transitions visually continuous;
- interaction sequences work without snapping.

### Checkpoint E — Deployment
- exact bundle built;
- preview publicly verified;
- production promoted only after preview acceptance.

## Definition of Done

The plan is complete only when NOVA V2:

- markets the fictional product before explaining implementation;
- provides meaningful interaction through modes, Fold/Open, hotspots, and constrained inspection;
- uses one continuous authored timeline with clean interaction reconciliation;
- passes desktop/tablet/mobile browser QA and reduced-motion/fallback checks;
- keeps the existing GLTF facts/orientation/cable protections;
- is deployed from the exact verified artifact;
- preserves the V1 rollback branch.
