# NOVA V3 Real-Product + Motion Polish — Durable Handoff

Date: 2026-09-25

Repository:
`SaamVR/Portfolio`

## Primary active branch

`nova/v3-motion-polish`

### Exact current site source before this handoff

`eea599a9772a9a7427264c9f946fea4e2e8c6e81`

Commit:
`refine(nova-v3): hold Design close-up steady across detail sequence`

This is the current V3 site source candidate. This handoff commit is docs-only and must not be treated as a new site-source revision.

Do not restart the V3 work from V2/R13.
Do not discard the real-spec/product work.
Do not reintroduce the old fake/demo concept copy.
Do not deploy V3 until full Visual QA is GREEN on the exact site source.

---

# User objective

The user rejected demo/fake product content and specifically asked for:

1. real specifications and real-world practical details,
2. a portfolio project that reads like a credible product launch rather than a demo,
3. smoother headphone animation,
4. removal of scroll-driven glitches/snaps,
5. a better presentation of the three Design details / controls,
6. a refined V3 deployed separately as V3,
7. use of appropriate browser/UI verification skills.

The current V3 work addresses those goals.

---

# Skill / QA workflow used

The browser-verification skill was loaded:

`skills://plugins/vercel/agent-browser/skill.md`

Its core principles are being followed:
- verify the rendered page, not just source,
- inspect interactive states after DOM changes,
- use screenshots and browser assertions,
- treat browser QA as a release gate.

The repository currently uses Playwright-based GitHub Actions for authoritative browser QA. Continue using those Actions first; use agent-browser when a dev server/live preview is available and an additional manual browser pass is useful.

---

# V3 branch landscape

Do not assume every V3 branch is equally current.

## Active / newest motion lane

`nova/v3-motion-polish`

Current site source:
`eea599a9772a9a7427264c9f946fea4e2e8c6e81`

This is the branch to continue.

## Supporting historical V3 lanes

- `nova/v3`
  - early real-spec/detail-control foundation
  - head at recovery: `e4f4dacdba6c2885073be3d8e6582fe88b15a4e9`

- `nova/v3-real-product`
  - product-facing copy and detail/control work
  - head: `d570c9a57b95eae9edd0f0b3502b13a80c142a92`

- `nova/v3-refinement`
  - removed remaining demo-style copy, refined Hero/product-facing content
  - head: `78dcb83e3b0d24f5dbea289498f057c37143b67f`

- `nova/v3-real-product-motion`
  - major real-product + scroll-motion integration
  - scroll-synchronized source pose, stable detail sequence, render-adapter motion contracts
  - head: `8cf23b2bfad7278f163fbc99a5e33da8dbe395bb`

- `nova/v3-production-refinement`
  - older V3 deployment/QA plumbing
  - head: `a00adca67d7e64122a5f0bfc7c36684c5ab1ab3c`
  - IMPORTANT: its dedicated V3 public QA is now stale relative to the active V3 content model; do not copy it unchanged.

The current motion-polish branch diverged after the motion/product work and is the authoritative lane for the next chat.

---

# Real product / factual content currently in V3

The current V3 site explicitly discloses that NOVA is an independent interactive launch study using the Sony WH-1000XM6 official specification envelope as a real-world hardware benchmark.

Current factual product/reference content in `nova/site/index.html` includes:

- benchmark disclosure:
  `Sony WH-1000XM6`

- weight:
  `Approx. 254 g / 8.96 oz`

- driver:
  `30 mm / 1.18 in dynamic driver / closed over-ear format`

- wireless:
  `Bluetooth 5.3`
  `effective range approx. 10 m / 32.81 ft`

- codecs:
  `SBC / AAC / LDAC / LC3`

- battery:
  `AAC/SBC/LC3: up to 30 hrs NC on / 40 hrs NC off`
  `LDAC: up to 26 hrs NC on / 36 hrs NC off`

- multipoint:
  `2 devices`

- wired:
  `3.5 mm Stereo Mini Jack`
  `passive operation supported`

- practical wired caveat:
  `Bluetooth is unavailable while the supplied headphone cable is connected`

- physical controls:
  `Touch sensor panel`
  `NC/AMB button`

- practical control explanation:
  - double-tap play/pause
  - swipe forward/back for tracks
  - swipe up/down for volume
  - separate NC/AMB button for noise-control mode

Official links currently embedded in the site:

- Sony specifications:
  https://www.sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm6/specifications

- battery operating-time guide:
  https://helpguide.sony.net/mdr/2984/v1/en/contents/TP1001856818.html

- two-device multipoint guide:
  https://helpguide.sony.net/mdr/2984/v1/en/contents/TP1001863603.html

- wired headphone-cable guide:
  https://helpguide.sony.net/mdr/2984/v1/en/contents/TP1001856898.html

Do not replace these with invented NOVA specs.
Do not imply Sony affiliation.
Keep the independent-study disclosure visible.

---

# Product story / Design-detail presentation

The old simultaneous hotspot presentation was replaced.

Current Design sequence uses three stable detail controls:

- Cushion
- Hinge
- Touch controls

Markup uses:
`data-detail-id="cushion"`
`data-detail-id="hinge"`
`data-detail-id="controls"`

The stable detail cards drive selection.
3D hotspots are annotations, not the primary controls.

Important behavior:
- on desktop, detail cards remain stable while the close product shot is shown,
- on mobile, the detail controls use a swipeable rail,
- inactive annotations are visually reduced,
- the selected detail annotation remains the single strong emphasis.

Do not revert to three simultaneous floating labels competing for attention.

---

# Motion architecture already implemented

## Timeline

File:
`nova/site/runtime/timeline.js`

The V3 design keeps the product pose controlled during the Design explanation and lets camera/lighting do most of the visual storytelling.

A separate `PRODUCT_POSE_KEYFRAMES` sequence controls the source GLTF pose.

Design philosophy already encoded:
- hold the physical rig steady while Cushion/Hinge/Controls are explained,
- source clip begins opening more strongly after the detail sequence,
- retain V1-style breathing/source animation in Sound, Adaptive, Form, Inspect and Resolution,
- avoid decorative full-product spinning.

## Render adapter

File:
`nova/site/runtime/render-adapter.js`

Already includes:
- damped camera position,
- damped camera target,
- damped product position,
- damped rotation,
- damped scale,
- damped source-pose time,
- bounded per-frame pose delta.

Do not restore direct `mixer.setTime(targetPose * duration)` on every scroll frame without damping; that was a source of animation snapping.

## Controller conflict prevention

Existing composer/interaction work prevents:
- hotspot camera offsets fighting direct inspection,
- fold controller and scroll pose ownership fighting each other,
- abrupt offset hard-resets.

Continue respecting controller ownership.

---

# Latest motion-polish work

## 1. Bounded Design settle yaw

RED contract commit:
`62e981984d158a42216c151174c7b2aefa55797b`

Implementation:
`96edba13874972c71367306cf27f666f7dd66b3a`

Change:
- Design peak yaw was flattened between the 19% and 22% samples.
- This reduced the headband annotation drift from the earlier ~28px bounded-motion failure.

## 2. Near-edge annotation behavior

Problem:
At the Hinge moment, the annotation could reach the top safe edge and disappear even though its label could be represented safely at 16px inset.

RED tests:
- `0c4db180a36b26191acc367fd3f6832096f8ce71`
- `bace746670882a27c999fbb487b9a0e8f169d009`

Implementation:
`64701a4611b639c73f07c07eeef85f7e90332a26`

Hotspot projection visibility now permits a controlled near-edge margin:
`projectionMargin = 1.35`

The UI still clamps annotation position to the safe viewport inset.

Contract also ensures genuinely far-offscreen annotations remain hidden.

## 3. Steady Design close-up / latest source

Latest site-source implementation:
`eea599a9772a9a7427264c9f946fea4e2e8c6e81`

Commit:
`refine(nova-v3): hold Design close-up steady across detail sequence`

This deliberately flattens the 0.16–0.28 Design close-up:
- smaller camera travel,
- smaller yaw variation,
- smaller product-position drift,
- retains close framing,
- retains product dominance,
- leaves detail-card state changes to communicate Cushion → Hinge → Controls.

This was done because prior Visual QA reported:
`V3 Design motion discontinuity maxJump = 92.03px`

The user specifically complained about animation glitches and the three-controller/detail presentation, so do not undo this steady-detail-table approach unless new browser evidence proves a better motion solution.

---

# Latest CI state

## Exact current candidate

Site source:
`eea599a9772a9a7427264c9f946fea4e2e8c6e81`

### Contracts

Run:
`36122298043`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36122298043

Conclusion:
SUCCESS

### Production Bundle

Run:
`36122298075`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36122298075

Conclusion:
SUCCESS

Artifact:
`10857573191`

Name:
`nova-production-site`

Digest:
`sha256:e1bf90529765781ba5114138360f2ce8314bba1709064fe80a47e8fcb4b8dfb7`

### Full Visual QA

Run:
`36122298046`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36122298046

Status at handoff creation:
IN PROGRESS

IMPORTANT:
Poll this exact run first in the next chat.

If it is GREEN:
- do not rebuild the site,
- continue with focused Hotspot QA,
- manually inspect the artifact,
- then deploy the exact bundle artifact to Cloudflare branch `v3`.

If it is RED:
- inspect the final assertion and artifact,
- keep the existing strict motion/collision bounds,
- fix the site rather than relaxing QA unless the assertion is demonstrably stale or incorrect.

---

# Recent Visual QA failures and what they taught us

## Run 36120147385

Failure:
Headband annotation movement ~28.22px exceeded the 24px bounded Design-motion envelope.

This led to the bounded-yaw settle work.

## Run 36121407845

Failure:
At progress 0.22 the Hinge/headband annotation reached the top safe edge and became invisible.

This led to the near-edge projection visibility + safe-clamp behavior.

## Run 36121904913

Failure:
Design motion continuity reported a max screen-space jump of ~92.03px.

Largest samples included:
- Cushion .18 → .20: ~92.0px
- Hinge .18 → .20: ~78.3px
- Cushion .26 → .279: ~76.7px
- Hinge .26 → .279: ~68.2px

This led to latest site source `eea599a9…`, which converts the Design detail section into a much steadier close product study.

---

# Older V3 public QA warning

An older branch contains:

`.github/workflows/nova-v3-public-qa.yml`

Source branch:
`nova/v3-production-refinement`

Do NOT copy this workflow unchanged.

It expects obsolete content:
- a three-brand benchmark panel,
- `Sennheiser MOMENTUM 4`,
- `Bose QuietComfort Ultra 2nd Gen`,
- old `data-detail-card` markup,
- button wording such as `benchmark design brief`.

The current active V3 instead uses:
- Sony WH-1000XM6 factual reference specifications,
- `Specifications` button,
- `data-detail-id` stable controls,
- current sequential Design-detail behavior.

Before V3 public deployment QA, create/adapt a V3 public workflow for the current product model.

Recommended deployed-public checks:

1. model reaches `ready`,
2. title/headline loads,
3. no fake notify/demo form is present,
4. Design detail buttons select Cushion/Hinge/Controls,
5. active detail annotation is visible,
6. Specifications opens,
7. Specifications contains:
   - Sony WH-1000XM6
   - Approx. 254 g
   - 30 mm
   - Bluetooth 5.3
   - SBC / AAC / LDAC / LC3
   - 30 / 40 hr AAC/SBC/LC3 battery values
   - 26 / 36 hr LDAC battery values
   - Multipoint
   - wired cable caveat
   - official source links
8. mobile navigation opens,
9. V1 archive still loads,
10. browser errors array remains empty.

---

# V3 deployment status

V3 is NOT approved for deployment at this handoff point because the latest exact-source full Visual QA run is still in progress.

Do not deploy a failed/intermediate V3 source.

Once `36122298046` is GREEN:

1. Trigger/run focused Hotspot QA on the exact site source.
2. Inspect the exact Visual QA artifact manually.
3. Use the already-built production artifact:
   `10857573191`
4. Use `samvr` for deployment only.
5. Do not code, inspect source, or run browser QA on `samvr`.
6. Deploy exact artifact to Cloudflare Pages branch:
   `v3`
7. Supply exact commit hash:
   `eea599a9772a9a7427264c9f946fea4e2e8c6e81`
8. Verify the deployment URL from Wrangler output.
9. Then run the updated V3 public browser QA against the actual V3 alias.
10. Do not replace `main`, `v2`, or `/v1/` unless the user separately asks.

Expected branch alias is likely:
`https://v3.nova-interactive-portfolio.pages.dev/`

Do not state that as verified until Wrangler/public QA confirms it.

---

# Existing production / rollback preservation

Do not destroy:
- root production,
- V2 preview,
- `/v1/` archive,
- original V1 rollback branch.

Original V1 rollback:
branch:
`backup/nova-interactive-v1-2026-09-23`

commit:
`9c5e084518f35d364fabc1d565ccb31a6e348eba`

V3 must remain an additional version/preview until explicitly promoted.

---

# Next-chat execution order

1. Read this handoff in full.
2. Reconcile:
   - `nova/v3-motion-polish`
   - current branch head
   - Visual QA run `36122298046`
3. Verify whether any `nova/site/**` changes landed after `eea599a9…`.
4. If only docs/tests changed, exact site source remains `eea599a9…`.
5. If Visual QA is red:
   - inspect the exact final assertion,
   - inspect artifact/screenshots,
   - use TDD RED → implementation → GREEN,
   - do not loosen visual bounds just to pass.
6. If Visual QA is green:
   - run focused Hotspot QA,
   - inspect screenshots manually,
   - adapt current V3 public QA workflow,
   - deploy artifact `10857573191` to branch `v3` from `samvr` only,
   - run deployed V3 public QA.
7. Save a completion handoff after successful V3 deployment.

---

# User-facing design constraints to preserve

- no generic AI-template aesthetic,
- large product presence,
- readable typography,
- product-first storytelling,
- real practical specs instead of fake product claims,
- no demo/fake notify experience,
- smooth product motion,
- no sudden skeletal/source-pose snaps,
- no camera/hotspot/fold controller fighting,
- Design details presented sequentially, not three labels at once,
- mobile detail rail remains usable,
- no product/copy collisions,
- hotspot annotations stay inside safe viewport edges,
- reduced-motion and GLTF/WebGL fallbacks remain functional,
- V1 archive remains intact.

---

# Summary for the next agent

The active task is no longer “make V3 real.” That product/spec work is already substantially complete.

The immediate task is:

**Finish the final V3 Design-motion browser gate on `nova/v3-motion-polish`, then deploy the exact verified artifact to Cloudflare branch `v3` and run a current-content V3 public QA.**

Do not restart the design audit from scratch.
Do not reintroduce demo copy.
Do not use the stale older V3 deployed-public-QA workflow without adapting it.
