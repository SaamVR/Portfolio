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

## Trust notes

This public endpoint is intentionally unauthenticated and therefore cannot perform
writes to private CRMs. A production provider adapter would require authenticated
access, allowlisted host, secret management, true durable idempotency, audit controls,
rate limiting and provider-verified receipts. Model-driven inference would require
secured model credentials, structured-output validation, and human-approved tools.
These are **not claimed as completed**.
