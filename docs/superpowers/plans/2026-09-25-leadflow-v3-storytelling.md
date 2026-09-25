# LeadFlow V3 Storytelling Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: use superpowers:executing-plans or subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Preserve the current production experience as /v2/ and ship V3 on / with reusable state-driven storytelling directors for Workflow, Lead Operations, Reliability, Architecture, and Guided Walkthrough.

**Architecture:** Keep the existing static HTML/CSS/JavaScript application and dashboard model. Add storytelling.js as the single animation/state director module. app.js continues to own data, workflow execution, and orchestration. Guided Walkthrough calls the same directors used by normal browsing instead of maintaining duplicate animation logic.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Web Animations API/CSS keyframes, Cloudflare Pages Functions, Node built-in tests, headless Chrome/CDP runtime audits.

**Spec:** docs/superpowers/specs/2026-09-25-leadflow-v3-storytelling-design.md

## Global Constraints

- /v1/ remains frozen.
- Current root is preserved as /v2/ before V3 source edits.
- Sarah scoring remains 92; scoring rules do not change.
- Timeout recovery remains explicitly simulated.
- Browser-local CRM remains authoritative.
- No GSAP/new animation runtime dependency.
- Every director supports reduced motion and cancellation.
- Existing dark/light readability and mobile containment remain intact.

## Review Focus

1. V2 isolation: preservation must remain functionally equivalent to the pre-V3 root and not affect V1.
2. Duplicate updates: Lead Operations must never animate a fake pipeline increment for an upsert.
3. Cancellation: cancelling during any chapter restores stable state and controls.
4. Reduced motion: same semantic end state, no packet travel or indefinite animation.
5. Re-entrancy: Replay/scenario clicks serialize or cancel prior stories instead of overlapping.

---

### Task 1: Preserve current root as V2

**Files:**
- Create: v2/index.html, v2/app.js, v2/dashboard.js, v2/styles.css, v2/favicon.svg
- Create: functions/v2/api/qualify.js
- Test: tests/leadflow-v2-preservation.test.js
- Test: tests/leadflow_v2_runtime_audit.py

**Interfaces:**
- Consumes: current root at execution base.
- Produces: frozen /v2/ build and /v2/api/qualify.

- [ ] Write preservation tests for current root branding, CRM, navbar, walkthrough markers, dashboard.js, V2 API route, and unchanged V1.
- [ ] Run the tests and verify RED because /v2/ does not exist.
- [ ] Copy current root into v2/ and adjust only API routing required by V2.
- [ ] Copy current qualification function into functions/v2/api/qualify.js without changing scoring behavior.
- [ ] Run Node + Chrome V2 audits: V2 loads, CRM opens, Sarah=92, V1 unchanged.
- [ ] Commit: preserve LeadFlow current experience as v2.

### Task 2: Storytelling controller foundation

**Files:**
- Create: storytelling.js
- Modify: index.html, styles.css
- Test: tests/leadflow-storytelling-contract.test.js

**Interfaces produced:**
- window.LeadFlowStorytelling.createController(options)
- playWorkflowStory(options)
- playLeadOperationsStory(options)
- playReliabilityStory(scenario, options)
- playArchitectureStory(options)
- cancelAll()
- Each play method resolves with status complete or cancelled plus story name.

- [ ] Write failing contract tests for module loading, four directors, cancellation and reduced-motion markers.
- [ ] Run and verify RED.
- [ ] Implement cancellation tokens, wait helper, animation helper and Promise completion contract.
- [ ] Add base story CSS hooks and load storytelling.js before app.js.
- [ ] Run focused tests and verify GREEN.
- [ ] Commit: add LeadFlow storytelling director foundation.

### Task 3: Workflow lead-story director

**Files:**
- Modify: index.html, storytelling.js, styles.css, app.js
- Test: tests/leadflow-workflow-story.test.js
- Test: tests/leadflow_workflow_story_runtime_audit.py

- [ ] Write failing tests for lead packet, four captions, Replay flow, active-stage states and one-shot viewport trigger.
- [ ] Verify RED.
- [ ] Implement Capture → Validate → Qualify → Prepare choreography using current lead score/status when available.
- [ ] Add reduced-motion semantic sequence.
- [ ] Runtime-audit final settled state, replay keyboard access, cancellation, and no infinite explanatory loop.
- [ ] Commit: animate LeadFlow workflow as a lead story.

### Task 4: Lead Operations truthful delta story

**Files:**
- Modify: storytelling.js, app.js, index.html, styles.css
- Test: tests/leadflow-operations-story.test.js
- Test: tests/leadflow_operations_story_runtime_audit.py

**Interfaces:**
- Consumes LeadFlowDashboard.buildDashboardModel.
- Produces buildOperationsStoryContext(leads, latestEvent).

- [ ] Write failing tests for inserted hot lead delta, review delta, and duplicate/upsert where pipeline total stays unchanged.
- [ ] Verify RED.
- [ ] Implement before/after context derivation and narrative ribbon without fabricated deltas.
- [ ] Animate KPI → donut → score trend → queue → row → activity sequentially from actual model state.
- [ ] Add reduced-motion and replay-after-workflow audit.
- [ ] Verify hot 92, review/nurture behavior, and duplicate count truthfulness.
- [ ] Commit: tell the Lead Operations dashboard delta story.

### Task 5: Reliability incident director

**Files:**
- Modify: index.html, storytelling.js, app.js, styles.css
- Test: tests/leadflow-reliability-story.test.js
- Test: tests/leadflow_reliability_story_runtime_audit.py

- [ ] Write failing tests for Trigger → Detection → Response → Final state and scenario-specific truth copy.
- [ ] Include literal RETRY NOT EXECUTED IN THIS PUBLIC DEMO assertion.
- [ ] Verify RED.
- [ ] Implement duplicate merge/count-stable story.
- [ ] Implement review-band/human-route story.
- [ ] Implement simulated timeout broken-connector/recovery-plan story.
- [ ] Keep existing event log as technical evidence.
- [ ] Audit scenario clicks, cancellation, re-entrancy and reduced motion.
- [ ] Commit: animate LeadFlow reliability incident stories.

### Task 6: Architecture trace director

**Files:**
- Modify: index.html, storytelling.js, styles.css
- Test: tests/leadflow-architecture-story.test.js
- Test: tests/leadflow_architecture_story_runtime_audit.py

- [ ] Write failing tests for payload trace, responsibility subtitle, branch-to-rules, branch-to-CRM, reconvergence and final Next Action state.
- [ ] Verify RED.
- [ ] Implement node/connector trace and payload branch/rejoin without altering architecture truth/copy.
- [ ] Add reduced-motion ordered highlights.
- [ ] Run Chrome runtime audit.
- [ ] Commit: animate LeadFlow architecture trace story.

### Task 7: Guided Walkthrough V3

**Files:**
- Modify: app.js, index.html, styles.css
- Test: tests/leadflow-guided-story.test.js
- Test: tests/leadflow_guided_story_runtime_audit.py

- [ ] Write failing tests proving Guided Walkthrough calls shared directors rather than duplicate section timers.
- [ ] Assert chapter/beat/progress UI, real workflow completion wait, and cancelAll cleanup.
- [ ] Verify RED.
- [ ] Refactor sequence to Workflow Story → real hot execution → Result → Operations Story → timeout Reliability Story → Architecture Story.
- [ ] Implement within-chapter progress/beat updates and immediate cancel cleanup.
- [ ] Run normal-motion timing audit and reduced-motion six-chapter audit.
- [ ] Commit: direct LeadFlow walkthrough with shared story animations.

### Task 8: Whole-product QA and release

**Files:**
- Modify only for verified defects.
- Update durable LeadFlow handoff.
- Test all Node and Chrome audits.

- [ ] Run full Node suite plus JS syntax and git diff checks.
- [ ] Audit 390/768/1024/1440 in dark/light under normal and reduced motion.
- [ ] Verify visibility floor, contrast, no document overflow, keyboard replay/cancel, and no browser exceptions.
- [ ] Verify root Sarah=92, V2 Sarah=92, V1 API v1 behavior, and V1/V2 source isolation.
- [ ] Review whole branch against spec; Critical/Important findings require RED→GREEN fixes.
- [ ] Push exact verified source SHA to main.
- [ ] Deploy exact SHA through authenticated Cloudflare Pages CLI.
- [ ] Verify immutable + canonical URLs in browser.
- [ ] Update durable handoff with V3 SHA, deployment URL, and V1/V2 state.
