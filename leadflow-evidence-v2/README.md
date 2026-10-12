# LeadFlow V2 — Evidence-Led Automation Case Study

## Why this exists

The original [LeadFlow](https://leadflow-ai-bhy.pages.dev/) is a visually polished workflow and CRM story.
This **separate** project is an evidence-first technical case study for evaluating automation engineers.
No V1 assets, live production deployment, or original Upwork portfolio listing are replaced.

## Scope and truth boundaries

| Capability | Status | Proof |
| --- | --- | --- |
| Edge API | Implemented | GET health / POST execute with server-side validation, real timed response |
| Qualification | Implemented | Deterministic rule engine with explainable factors |
| CRM integration contract | Sandbox | Payload validation and bounded simulated retries, no external CRM request |
| CRM state | Browser-local | Stored in localStorage; unique synthetic records upserted on replays |
| Idempotency | Browser-local only | Duplicate updates same synthetic ID in browser; not distributed durable dedupe |
| AI/LLM | Not configured | No model call or fabricated LLM result |
| Webhooks | Not connected | No external outbound write |
| Email/SMS | Disabled | Next-action drafts require manual approval |
| Fault injection | Testable sandbox | Two simulated adapter timeouts, third attempt accepted |
| Privacy | Synthetic | Four allowlisted examples; no custom personally identifying payloads |

## Stack

Browser-native HTML/CSS/ES modules, Cloudflare Pages Functions, browser-local CRM adapter and
Node built-in contract tests. No runtime frontend framework, API keys or build-time services required.

## Local

Run from this directory:

    npm test
    npm run check
    npx wrangler@3 pages dev . --port 8788

The Pages Functions route is at /api/execute. GET returns service capabilities. POST accepts:

    {"scenario":"qualified","idempotencyKey":"some-unique-demo-key"}

Allowlisted scenarios: qualified, review, nurture, timeout.

## Release strategy

Deploy this directory as a **separate Cloudflare Pages preview/project**. Do not use
the existing leadflow-ai project's main deployment or the archived /v2 path.
The original Upwork portfolio project must remain published. A new *unpublished*
Upwork entry can be prepared for side-by-side evaluation.

## Browser proof and evidence

Capture desktop and 390px screenshots of the new landing page.
Run each of the four scenarios and export one JSON receipt for qualified and timeout.
Run replay of a sample lead and verify unique record count does not increase.
Keep test output + browser console screenshots dated with the commit SHA.


## V2 motion experience (implemented and browser-verified)

The motion director `motion.js` and stylesheet `motion.css` are optional
presentation layers over the same working Cloudflare Pages Function.

- Animated hero arrival, scroll reveals, pointer-responsive pipeline depth
- Accessible keyboard/click stage explorer and manual stage walkthrough
- Four-phase execution timeline **only confirmed after server success**
- API-derived animated score bars and timed trace replay
- Browser-local upsert feedback and curved confirmation packet
- Explicit fault/retry animation only for the synthetic timeout scenario
- Failure path suppresses success choreography and receipt export
- Visual replay does **not** send another API request
- Motion ON/OFF and automatic reduced-motion support; zero horizontal overflow at 390px in tested viewports

All original V1 paths and deployment remain unchanged.

The browser QA is in `tests/browser-motion-qa.cjs`. To run it on an
authorized local/browser testing machine:

    npm install --no-save puppeteer-core@24
    CHROMIUM_PATH=/usr/bin/chromium LEADFLOW_QA_OUTPUT_DIR=/tmp/leadflow-motion npm run test:browser

You can override `LEADFLOW_QA_URL` for a local or branch preview.
The existing `npm test` remains independent of external browsers and providers.
`docs/motion-browser-qa.json` records one accepted browser run.
Motion screenshots under `portfolio-media/06-*.png` to `09-*.png` are
actual rendered captures, not generated mockups.

## Trust notes

This public endpoint is intentionally unauthenticated and therefore cannot perform
writes to private CRMs. A production provider adapter would require authenticated
access, allowlisted host, secret management, true durable idempotency, audit controls,
rate limiting and provider-verified receipts. Model-driven inference would require
secured model credentials, structured-output validation, and human-approved tools.
These are **not claimed as completed**.

## Director's Cut — authored motion narrative

The page now features a **24.4-second five-act cinematic playback** of an actual verified server receipt, launched by the visitor. It is separate from API execution time and expressly labeled that way. The entire story is reproducibly sampled from `storyboard-core.mjs`, and choreography lives in `storyboard.js`/`storyboard.css`.

Narrative: arrival → request verification → explainable decision → sandbox handoff (optional real-trace-confirmed simulated retries) → human review and follow-up draft.

Visitors can pause, seek, replay, skip, change speed, or jump between the five chapters. Browser tab changes pause the film. Reduced-motion visitors see the final confirmed result directly and have a full text transcript. Storyboard core has unit tests for accurate timing, fact gating, fault branching, and endpoint-verification requirements.

See `docs/directors-treatment.md` for choreography and animation principles.

**Truth constraint:** the movie only starts after receiving a server receipt; timed beats are authored *post-result* narration, not a real-time progress representation. CRM remains a sandbox and follow-ups remain unsent drafts.
