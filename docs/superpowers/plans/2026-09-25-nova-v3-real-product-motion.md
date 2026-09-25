# NOVA V3 Real Product + Motion Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a client-credible NOVA V3 with practical product specifications, buyer-facing content, and smooth scroll-driven 3D choreography, then deploy it to a separate Cloudflare `v3` branch.

**Architecture:** Preserve the current Three.js/runtime structure. Replace demo-style product content in `index.html`, add a focused Design detail rail through the existing UI/action system, and fix animation glitches at the render-adapter/source-pose boundary rather than hiding them with CSS. Keep R13 case-study/resilience behavior and V1 archive unchanged.

**Tech Stack:** HTML/CSS/ES modules, Three.js GLTF/AnimationMixer, GitHub Actions Playwright QA, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-09-25-nova-v3-real-product-motion-design.md`

## Global Constraints

- V3 must deploy only to Cloudflare branch `v3` until user review.
- Preserve `main`, `v2`, `/v1/`, and V1 rollback.
- Product-facing content must not say fictional/demo/concept preview.
- Product numeric values must match the V3 design specification exactly.
- Case study must disclose the specification is a project-defined engineering target.
- Do not claim measured ANC dB, lab certification, or manufactured-product certification.
- TDD RED → GREEN for every production behavior change.
- Keep `samvr` deployment-only.

## Review Focus

- Rapid wheel/touch scroll across Design→Sound must not snap the GLTF skeleton.
- Mobile Design detail rail must remain readable and not collide with the product.
- Fold interaction must still work after adding mixer-pose damping.
- Static/WebGL failure mode must still expose usable specs/product content.
- V3 product copy must remain internally consistent across hero, specs, FAQ and case study.

---

### Task 1: V3 content/specification contract

**Files:**
- Modify: `nova/tests/test_v2_content_contract.py`
- Modify: `nova/site/index.html`
- Modify: `nova/site/styles.css`

**Interfaces:**
- Consumes: existing R13 page structure and Product Facts drawer.
- Produces: V3 buyer-facing product content and exact specification fields.

- [ ] Write failing contract tests requiring all exact V3 design-spec values and rejecting demo/fake product-facing phrases.
- [ ] Run NOVA Contracts and verify RED.
- [ ] Replace Product Facts with Technical Specifications + practical FAQ; remove fake notify flow from product journey.
- [ ] Add compact hero spec proof row and practical box/compatibility content.
- [ ] Add case-study-only concept/engineering-target disclosure.
- [ ] Run contracts and verify GREEN.
- [ ] Commit.

### Task 2: Design detail rail

**Files:**
- Modify: `nova/tests/interaction_contract.mjs`
- Modify: `nova/tests/test_v2_content_contract.py`
- Modify: `nova/site/index.html`
- Modify: `nova/site/styles.css`
- Modify: `nova/site/ui/product-ui.js`
- Modify: `nova/site/app.js`

**Interfaces:**
- Consumes: existing hotspot controller actions `focusHotspot(id)` / `clearHotspot()`.
- Produces: synchronized `detailStep` state and three detail controls.

- [ ] Write failing tests for cushion/headband/controls rail and active hotspot synchronization.
- [ ] Verify RED.
- [ ] Add rail UI and state actions.
- [ ] Drive automatic active detail step from Design range progress only after product settle.
- [ ] Keep only active label expanded; inactive dots remain unobtrusive.
- [ ] Verify GREEN and commit.

### Task 3: Smooth source-animation clock

**Files:**
- Create: `nova/tests/render_adapter_contract.mjs`
- Modify: `nova/site/runtime/render-adapter.js`
- Modify: `.github/workflows/nova-v2-contracts.yml`

**Interfaces:**
- Consumes: `state.product.pose`.
- Produces: damped `poseClock` sent to `mixer.setTime()`.

- [ ] Write a failing fake-mixer test proving a target pose jump from .25→.75 cannot move the mixer by the full jump in one 1/60 s frame.
- [ ] Verify RED.
- [ ] Implement internal pose-clock damping.
- [ ] Verify pose converges over subsequent frames and fold interaction remains responsive.
- [ ] Add test to contract workflow.
- [ ] Verify GREEN and commit.

### Task 4: Re-author Design→Sound pose choreography

**Files:**
- Modify: `nova/tests/timeline_contract.mjs`
- Modify: `nova/site/runtime/timeline.js`

**Interfaces:**
- Consumes: V3 detail-rail settle region.
- Produces: stable Design pose and smooth Design→Sound bridge.

- [ ] Add failing timeline tests: Design pose spread ≤0.08; no adjacent test sample jump >0.08; large open-pose change occurs only after the detail region and across ≥0.05 progress.
- [ ] Verify RED.
- [ ] Replace R13 steep Design pose sequence with stable detail pose.
- [ ] Widen and smooth the transition to Sound.
- [ ] Verify GREEN and commit.

### Task 5: V3 browser/motion QA

**Files:**
- Modify: `.github/workflows/nova-qa.yml`
- Modify: `.github/workflows/nova-hotspot-qa.yml`
- Modify: `nova/tests/test_qa_contract.py`

**Interfaces:**
- Consumes: product specs, detail rail, damped pose, timeline.
- Produces: screenshots and motion assertions.

- [ ] Add RED QA contracts requiring V3 Technical Specs screenshots, Design detail sequence screenshots, Design→Sound transition samples and mobile checks.
- [ ] Verify RED.
- [ ] Add browser audit for detail rail click/scroll synchronization and specs accessibility.
- [ ] Add motion sampling assertion that hotspot movement is continuous and bounded.
- [ ] Verify GREEN and commit.

### Task 6: Exact-source verification and V3 deployment

**Files:**
- Modify only QA trigger/docs after source freezes.
- Create completion handoff after public V3 QA.

**Interfaces:**
- Consumes: exact green site source + GitHub Actions artifact.
- Produces: Cloudflare `v3` preview and durable handoff.

- [ ] Freeze site source SHA.
- [ ] Run Contracts, Production Bundle, full Visual QA, focused Hotspot QA on exact source.
- [ ] Manually inspect V3 visual artifacts.
- [ ] Download exact green bundle on `samvr`.
- [ ] Verify file count and hashes.
- [ ] Deploy exact artifact to Cloudflare branch `v3`.
- [ ] Run public V3 QA.
- [ ] Create `docs/handoffs/nova-v3-real-product-motion-complete-2026-09-25.md`.
