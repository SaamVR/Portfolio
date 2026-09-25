# LeadFlow V3 — Production Preservation & New-Chat Recovery Handoff — 2026-09-25

## READ THIS FIRST

This handoff was created after the chat lost a large amount of execution history. It reconstructs the authoritative LeadFlow state from GitHub history, the existing durable handoff, recovered samvr tool history, and the verified production freeze already recorded in the repository.

Do not restart the project from an older V3 handoff and do not redo completed visual/product-motion work.

## Repository and authority

Repository: SaamVR/Portfolio

Current GitHub main at handoff creation:
d15682f5cc19566a003a11cd49a931572cbd8dd2
Commit message: document LeadFlow professional motion refinement.

Production application source:
4d2bb37cb282120b5d7791d838bd0dfbc5e05d9a
Commit message: refine LeadFlow story autoplay and reliability visuals.

The only commit between 4d2bb37c and d15682f5 is documentation-only:
docs/handoffs/leadflow-portfolio-refinement-handoff-2026-09-25.md.
No application bytes changed.

Dedicated production-preservation branch:
preserve/leadflow-v3-aa6c8f81-20260925
pointing exactly to:
4d2bb37cb282120b5d7791d838bd0dfbc5e05d9a.

This branch is the emergency source-of-truth copy of the currently deployed V3 application. Do not move, rewrite, force-push, or repurpose it.

## Production URLs

Canonical production:
https://leadflow-ai-bhy.pages.dev/

Verified immutable deployment:
https://aa6c8f81.leadflow-ai-bhy.pages.dev/

Versioned preserved experiences:
- V3: root / — source 4d2bb37c
- V2: /v2/ — frozen pre-V3 experience
- V1: /v1/ — legacy preserved experience

Do not alter V1 or V2 unless the user explicitly asks.

## Device recovery facts

Two Remote Desktop Commander devices were online when this handoff was created:
- samvr
- samai

Recovered LeadFlow work was on samvr, primarily:
/home/ubuntu/leadflow-v3-storytelling

Important: during recovery, Desktop Commander reported that the account's monthly remote-call allowance was exhausted. Do not repeatedly retry/reconnect in the current allowance window. GitHub is sufficient to recover the project state. When remote access becomes available again, reconcile the local worktree against GitHub before making any write.

Never expose device auth tokens, OAuth data, Cloudflare credentials, or other secrets in chat or handoff files.

## Current V3 product state

### Professional presentation

Root V3 is intentionally presented as a practical product, not a prototype/showcase.

User-visible copy avoids:
- demo
- demonstration
- showcase
- simulated
- illustrative
- prototype

Internal compatibility identifiers such as #demo, storage keys, seed IDs, and implementation test names may remain because they are not user-facing and changing them can break browser state or anchors.

Where functionality is not connected, state the operational boundary directly instead of pretending it exists. Example:
DELIVERY RETRY REQUIRES A CONNECTED CRM.

### Workflow story

The Workflow section is a semantic transformation story:
NEW INQUIRY → VERIFIED → score/status → SALES REVIEW / HUMAN REVIEW / NURTURE.

Semantic color system:
- incoming/request: blue
- verified/ready: emerald
- high priority: coral/red
- human review: amber
- nurture/neutral: sage

Connector trails inherit semantic state color.

Latest autoplay behavior:
- automatic playback does not start merely on page load;
- story sections use a central viewport arrival band;
- the latest refinement uses a 1000 ms dwell;
- leaving the arrival band before the dwell cancels the pending start;
- leaving the section and returning replays the section from the beginning;
- guided product story suppresses autonomous arrival playback;
- manual Replay cancels only the section's pending arrival timer and does not permanently disable later arrival replay.

### Lead Operations / Qualification workspace

Lead Operations is driven from the real browser-local CRM model.

Motion includes:
- qualification donut sweep;
- score-bar rise and score/name reveal;
- source-quality bar growth;
- urgency mix expansion;
- staggered supporting entries;
- truthful KPI/state transitions.

Pointer and keyboard emphasis cross-highlights related infographic categories without mutating/filtering the underlying data.

Truth constraint:
- inserted lead may increase pipeline count;
- duplicate/upsert must not fake a pipeline increment.

### Scenario Story / Reliability

Scenario Story uses a four-beat narrative:
Trigger → Detection → Response → Final state.

The four beat cards are pointer- and keyboard-scrubbable.

Keyboard support includes:
- Enter / Space
- Arrow keys
- Home / End

Scenario visual language:
- duplicate: blue detection → green resolved state;
- CRM timeout: red failure → amber recovery requirement;
- human review: amber intervention → visible safe state.

Latest visual refinement:
- dimensional graphite/neutral cards;
- perspective/bevel/highlight treatment;
- semantic scenario palettes;
- dedicated light-theme active surfaces;
- final incident beat remains the focal state after story completion.

Timeout boundary must remain truthful:
DELIVERY RETRY REQUIRES A CONNECTED CRM.

Do not imply a retry job or outbound CRM delivery actually runs.

### Architecture / How It Works

Architecture state flow:
REQUEST → VALID → SCORE + CRM STATE → READY.

Color semantics:
- REQUEST: blue
- VALID: emerald
- SCORE: amber
- CRM STATE: blue
- READY: emerald

Branch tokens merge away before the final READY state.
READY settles so node copy remains readable; do not cover destination text.

### Guided product story

The guided experience is event-driven and uses the same shared story directors as manual browsing.

It must remain the sole animation director while active.

Normal guided run has been verified at roughly 25.7 seconds in the latest arrival/reliability refinement.

Do not regress it into independent fixed section timers.

## TRY THE WORKFLOW layout

Latest refinement makes the section viewport-aware.

Verified:
- 1440×900: section about 824 px high, workflow panel bottom around 840 px;
- 1024×900: section about 824 px high, workflow panel bottom around 827 px;
- no horizontal overflow;
- mid-width desktop execution rail reduces vertical chrome while keeping information text >= 12 px.

Do not reintroduce the older oversized execution rail.

## Current color / design direction

Maintain:
- forest / deep emerald;
- charcoal / graphite;
- cool white;
- restrained grey/sage neutrals;
- coral/red for priority/failure;
- amber for intervention/recovery;
- blue for incoming/request/detection.

Motion should explain causality and state change. Avoid random looping decoration, excessive glow, generic AI/network motifs, glass overload, or rainbow chart color.

The site should look like a practical product/business system, not an AI-generated SaaS template.

## Current functionality / API invariants

Root API: deterministic-qualification-v2
V2 API: deterministic-qualification-v2
V1 API: deterministic-qualification-v1

Canonical Sarah case:
- Sarah
- Acme Dental
- budget 5000
- timeline asap
- need: automated appointment lead follow-up
- expected score: 92

Other expected qualification outcomes:
- high/hot: 92
- review: 64
- nurture: 33

Missing required name remains HTTP 400.

Do not modify qualification scoring during visual/motion work.

Browser-local CRM remains the state authority for this product.

## Protected paths

Unless explicitly requested, do not change:
- v1/
- v2/
- functions/v1/
- functions/v2/
- root functions/api/qualify.js

The latest professional-motion refinements preserved those paths.

## Latest verified QA state

At production source 4d2bb37c:

- Node suite: 84/84 PASS
- guided product-tour runtime: PASS
- normal guided run: ~25.7 s
- arrival/re-entry runtime: first start after ~1 s; leave/return produces second start after same dwell
- professional polish runtime: PASS
- browser exceptions: 0 in verified production runtime
- story accessibility:
  - 0 visible story text below 12 px
  - 0 measured story contrast failures
  - no mobile document overflow
  - replay controls 44×44
- Reliability duplicate/review/timeout: PASS at 1440 and 390
- final incident beat remains focused
- public immutable + canonical runtime: PASS
- 1024 workflow layout fits a 900 px viewport
- public arrival counters verified 0→1 after first dwell and 1→2 after leave/return

Earlier final creative-director release also verified:
- dark/light × 390/768/1024/1440;
- whole-page visible text below 12 px = 0;
- whole-page contrast failures = 0 at audited dark/light desktop/mobile;
- no document-level mobile overflow;
- qualification outcomes 92 / 64 / 33 unchanged;
- public APIs remain correct;
- frozen V2 remains byte-identical to its preserved source.

## Important commit chronology

- 5bdc2903 — verified first V3 storytelling release matrix
- cfac01cc — professionalize V3 motion and product copy
- 8efe9aaf — prevent manual Replay / observer restart races
- 6d9e49dd — creative-director product refinement
- 712c6f03 — delay stories until visitor arrival
- 4d2bb37c — latest production app: replay-on-return / 1000 ms arrival / reliability visual refinement
- d15682f5 — documentation-only handoff update on main

Do not accidentally downgrade from 4d2bb37c to an earlier V3 freeze.

## Deployment authority

Cloudflare Pages project: leadflow-ai
Canonical: leadflow-ai-bhy.pages.dev

The current verified immutable deployment is:
aa6c8f81.leadflow-ai-bhy.pages.dev.

Previous successful deployment work used Wrangler/Cloudflare Pages from the runtime machine. A shared npm cache had previously produced integrity problems, so isolated npm-cache/Wrangler execution is preferred when another deployment is needed.

Do not deploy merely to recover metadata. Only deploy a source SHA that has passed the fresh release gate.

## Required execution workflow for future changes

1. Read this handoff in full.
2. Fetch/reconcile GitHub main.
3. Confirm preserve/leadflow-v3-aa6c8f81-20260925 still points to 4d2bb37c.
4. If Desktop Commander is available, reconcile /home/ubuntu/leadflow-v3-storytelling against GitHub before writing.
5. Do not restart the full V3 audit from scratch.
6. Do not redo V1/V2 preservation.
7. For visual/motion changes, use relevant design/animation/browser-verification skills.
8. Use TDD for behavioral changes:
   - add/adjust focused contract test;
   - prove RED for missing behavior;
   - implement minimal change;
   - prove GREEN;
   - run full regression suite.
9. Runtime audit in a real browser:
   - dark + light;
   - 390 / 768 / 1024 / 1440;
   - reduced motion and normal motion where animation changes;
   - no horizontal overflow;
   - no browser exceptions;
   - no sub-12 px visible text regression;
   - contrast/accessibility check;
   - replay/re-entry/cancel interactions.
10. Keep motion state-driven and truthful.
11. Preserve APIs and qualification outputs.
12. Before push/deploy:
   - fresh full Node suite;
   - syntax checks;
   - git diff --check;
   - protected-path diff check;
   - runtime smoke.
13. Push exact verified source SHA.
14. Deploy exact verified SHA to Cloudflare Pages.
15. Verify canonical + immutable deployment.
16. Update the durable handoff with source SHA, immutable URL, exact QA evidence, and changed invariants.

## What NOT to do

- Do not restart planning/auditing from an older V3 state.
- Do not recreate /v2/.
- Do not touch /v1/ or /v2/ for routine V3 refinements.
- Do not change scoring while doing visual work.
- Do not reintroduce user-facing demo/showcase/prototype language.
- Do not fake CRM delivery/retries.
- Do not make the guided story compete with autonomous arrival playback.
- Do not turn explanatory animations into infinite decorative loops.
- Do not lower readability below the established 12 px visible-text floor.
- Do not replace the semantic color system with generic multicolor dashboard styling.
- Do not force-push over the production preservation branch.

## New-chat first message

Copy this into the next chat:

Continue LeadFlow from the durable production-preservation handoff in SaamVR/Portfolio:
docs/handoffs/leadflow-v3-production-preservation-handoff-2026-09-25.md

Read it in full before making any write.

Current deployed application source is 4d2bb37cb282120b5d7791d838bd0dfbc5e05d9a.
Current verified immutable deployment is https://aa6c8f81.leadflow-ai-bhy.pages.dev/.
Canonical production is https://leadflow-ai-bhy.pages.dev/.
Preservation branch is preserve/leadflow-v3-aa6c8f81-20260925.

Do not restart the V3 audit.
Do not redo V1/V2 preservation.
Do not downgrade to an earlier V3 freeze.
First reconcile GitHub main/current runtime worktree against this handoff and collect any newer progress before making changes.
Use relevant design/animation/browser-verification skills and continue with TDD + real-browser audit/fix loops.
