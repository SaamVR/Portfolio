# LeadFlow V2 — Verified Evidence Register

Scope: **isolated V2 portfolio preview**, never the original V1 production.
Git branch: feat/leadflow-v2-evidence-20261012
Review URL: https://evidence-review.leadflow-evidence-v2.pages.dev/
Original URL: https://leadflow-ai-bhy.pages.dev/
Draft PR: https://github.com/SaamVR/Portfolio/pull/35

## Verification observed 2026-10-12 (BDT)

### Edge HTTP acceptance
- GET / — 200
- GET /styles.css — 200
- GET /app.js — 200
- GET /api/execute — 200, mode=synthetic-sandbox; externalCrm=false; llm=false
- POST unknown scenario — 400 invalid_scenario
- POST qualified — 96/100 sales; sandbox adapter 1 attempt; 7 server events
- POST review — 60/100 review; sandbox adapter 1 attempt; 8 events
- POST nurture — 27/100 nurture; sandbox adapter 1 attempt; 8 events
- POST timeout — 81/100 sales; sandbox adapter 3 attempts; 11 events (two injected faults)
- Times observed: qualified 48ms, review 48ms, nurture 48ms, timeout 144ms. **These are single isolated server samples, not benchmark distributions.**

### Automated frontend acceptance (Chromium 154)
- Desktop HTML title, run control, API health
- Qualified scenario scored 96; one synthetic browser-local record stored; event stream rendered; sandbox payload visible
- Replaying same lead did not add another unique browser-local record
- Timeout scenario produced 2 visible fault events + 1 eventual sandbox acceptance
- 390px viewport: document and body scrollWidth = 390, no horizontal overflow
- Mobile review scenario scored 60, completed
- No uncaught browser JavaScript errors

### Node and GitHub
- 6/6 Node contract tests passed
- Syntax checks and isolated asset build passed
- GitHub V2 Evidence QA run 38264737129 PASS (source/test/build artifact)
- Draft PR #35 open; merge and original deployment unchanged

## Trust / limitations
- Server executes real API code. Qualification is deterministic, **not LLM-powered**.
- CRM output is a **contract-tested sandbox adapter**, not a third-party account.
- Faults are injected on the sandbox adapter, not actual provider downtime.
- CRM records and record deduplication are **browser-local**, not durable server-side operations.
- No outbound email, SMS, payment, CRM write or other paid provider call.
- Samples use generated/synthetic names and organizations; no client data.
- The review URL is a Cloudflare branch alias; no claim of an independent production launch or customer acquisition.

## Portfolio media order
1. \`portfolio-media/01-hero.png\` — original V2 product cover screenshot
2. \`portfolio-media/02-qualified-run.png\` — server-backed qualification and event stream
3. \`portfolio-media/03-timeout-recovery.png\` — injected failure and retry trace
4. \`portfolio-media/04-architecture.png\` — disclosed system responsibilities
5. \`portfolio-media/05-mobile.png\` — actual mobile interaction state

## Additional features that would require further development
- Authenticated and rate-limited public/API accounts
- Provider-verified CRM OAuth/token integration with write receipts
- Durable server-side idempotency and transactional outbox
- Bounded structured-output model inference with measured failure cases
- Sandbox integration acceptance, observability, and operations alerts

These are **future options** and must not be described as implemented.
