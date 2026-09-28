# LeadFlow V3 Storytelling Motion Design

## Intent

Preserve the current production LeadFlow experience exactly as V2, while evolving the root experience into V3 with state-driven storytelling motion. V3 must explain how the system works, how a new lead changes operational state, what happens when failures or edge cases occur, and how the architecture processes the same lead.

## Versioning

- /v1/ remains frozen and untouched.
- The current production root experience at the V3 branch base becomes /v2/.
- /v2/ preserves its HTML, JS, CSS, favicon, dashboard model, CRM behavior, and qualification scoring.
- Root / becomes V3.
- Root /api/qualify remains deterministic-qualification-v2.
- /v2/api/qualify preserves the current root qualification behavior under the V2 route.
- No existing scoring behavior may change.

## Creative Direction

Motion explains causality, not decoration.

Semantic motion language:
- Emerald: healthy flow and completed system state.
- Amber: intervention and human review.
- Red: failure, exception, or high-priority attention.
- Sage and charcoal: inactive context.

Explanation animations play, resolve, and settle. They do not loop forever. Every director supports prefers-reduced-motion.

## Story 1 — Workflow

The existing four-stage workflow becomes a single lead story:

1. A lead packet enters Capture.
2. Capture acknowledges receipt.
3. The packet travels to Validate; required fields are checked.
4. The packet travels to Qualify; score/status are revealed.
5. The packet travels to Prepare; routing result appears.
6. The story settles with final state visible.

Example hot-path captions:
- Lead received
- Required fields valid
- 92 / 100 · High priority
- Sales review prepared

Requirements:
- One protagonist packet/token.
- Connectors animate only while traversed.
- Stage emphasis follows the packet.
- Story plays once when substantially visible.
- Replay flow control allows manual replay.
- Story adapts to latest lead where available.
- Reduced motion uses highlight/crossfade states instead of travel.

## Story 2 — Lead Operations

The dashboard tells the truthful delta caused by the newest lead.

The director derives:
- beforeModel: dashboard model without the newest inserted record when applicable.
- afterModel: full current dashboard model.

Inserted-lead sequence:
1. New lead token enters.
2. Pipeline total changes.
3. Relevant status KPI changes.
4. Average score changes.
5. Distribution transitions.
6. New score trend point/bar appears.
7. Next Action queue highlights.
8. Matching row enters/highlights.
9. Recent Activity logs the action.
10. Narrative ribbon resolves to LATEST IMPACT · name → score/100 → next action.

Duplicate/upsert sequence:
- Do not fake a pipeline increment.
- Emphasize existing record updated.
- Pipeline total remains unchanged.
- Only changed charts/row/activity animate.

Requirements:
- Actual browser-local lead data only.
- No fabricated trends or deltas.
- One focal region at a time.
- Existing dashboard remains usable without motion.
- Reduced motion uses truthful before→after crossfades/count updates.

## Story 3 — Reliability

Primary explanation becomes a four-beat incident rail:

Trigger → Detection → Response → Final state

The existing technical event log remains available as evidence.

### Duplicate — implemented

- Normalize incoming identity.
- Match existing browser-local record.
- Upsert/update existing record.
- No second CRM row.
- Visual: incoming token merges with existing record; N → N records.

### Human review — implemented

- Score enters configured review range.
- Automatic sales handoff is not selected.
- Human-review route is selected.
- Lead remains visible in CRM.
- Visual: score enters amber band; sales path de-emphasizes; human path illuminates.

### CRM timeout — simulated

- Simulated external CRM request times out.
- Illustrative retry plan is shown.
- No retry job executes in the public demo.
- Production requires durable retry state and idempotent delivery.
- Visual: red connector breaks; amber dotted recovery path stops before fake retry.
- Persistent label: RETRY NOT EXECUTED IN THIS PUBLIC DEMO.

Requirements:
- Scenario click triggers matching story.
- Guided walkthrough may auto-run timeout because it demonstrates the implemented/simulated boundary.
- No animation implies a real retry or successful outbound CRM delivery.
- Reduced motion reveals beats sequentially without travel.

## Story 4 — Architecture

Trace the same lead through:

Lead form → POST → Cloudflare Pages Function → JSON → Rules + Demo CRM → STATE → Next Action

At the core the payload branches:
- Qualification Rules → score/status.
- Demo CRM → local record/state.

Branches reconverge before Next Action.

Requirements:
- Active node/connector follows each beat.
- Context subtitle changes by responsibility.
- Existing architecture copy and implementation honesty remain.
- Reduced motion highlights nodes in order without moving packets.

## Guided Walkthrough V3

Guided Walkthrough orchestrates the same reusable directors used during normal browsing.

Required interfaces:
- playWorkflowStory(options) → Promise
- playLeadOperationsStory(options) → Promise
- playReliabilityStory(scenario, options) → Promise
- playArchitectureStory(options) → Promise
- cancelAll() aborts transient motion and resolves active stories as cancelled.

Sequence:
1. Workflow story.
2. Real hot-preset execution; await six execution stages.
3. Result explanation.
4. Lead Operations truthful delta story.
5. Reliability timeout story with explicit simulation boundary.
6. Architecture trace.

Tour UI:
- Chapter number and chapter name.
- Current explanatory beat.
- Within-chapter progress.
- Cancel aborts all directors and restores settled controls.
- Reduced motion completes the same semantic chapters.

## Timing

- Micro response: 180–350ms.
- Connector/packet movement: 450–700ms.
- Major state transition: 500–800ms.
- Conclusion hold: 500–900ms.
- Full section story: about 4–6 seconds.
- No explanatory story loops indefinitely.

Use CSS + Web Animations API where useful. No GSAP or new animation runtime dependency.

## Accessibility and Truth

- Preserve readability floors and contrast.
- Motion is not required to understand data.
- Replay controls keyboard accessible and at least 44px high.
- Tour cancel remains available.
- No focus trapping.
- Sarah hot scenario remains 92.
- Review/nurture behavior remains unchanged.
- Browser-local CRM remains authoritative.
- Duplicate story matches real upsert behavior.
- Timeout remains explicitly simulated.
- No outbound message is sent.
