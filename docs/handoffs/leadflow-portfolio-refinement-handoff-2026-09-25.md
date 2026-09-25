# LeadFlow portfolio refinement handoff — 2026-09-25

## Durable repository state

Repository: `SaamVR/Portfolio`  
Branch: `main`  
Handoff head: `0fc6ee7a10b78394356886912968e52d37568103`

### Preserved legacy version

The pre-refinement LeadFlow build is frozen under:

- `/v1/index.html`
- `/v1/app.js`
- `/v1/styles.css`
- `/v1/favicon.svg`
- `/functions/v1/api/qualify.js`

Preservation commit: `eaad7722456aaf7e3bf8c0303da024423cee29fe`

The legacy browser code calls `/v1/api/qualify`, so future root API changes do not silently alter V1 scoring.

## Refined root

Primary refinement commits:

- `cde3bc1eafab165c06b15e479d1cc6b7c203f24c` — bootstrap refinement
- `b4dc258a7caa41838648d61a3728f1b4c0c1286c` — refined portfolio experience
- `d51735dd8947447b981af05c5283639383a00468` — tablet overflow fix
- `4e4ab2e8a0b5b02dcea0044c7b70fbe433351bcf` — durable Cloudflare deploy workflow
- `a482daf99fd177cf2e1649cc446dc18157ee13ae` — remotely triggerable deployment
- `0fc6ee7a10b78394356886912968e52d37568103` — normalize tablet media-rule formatting

Current refined implementation:

- no misleading AI-generated / connected / sent claims
- deterministic rules-based qualification
- explainable scoring factors and routing rationale
- real Cloudflare Pages Function contract at `/api/qualify`
- browser-local demo CRM
- a single lead-entry form shared with CRM/workspace outputs
- high-priority / review / nurture presets
- duplicate prevention by normalized name + company
- draft-only follow-up language
- explicit implemented vs simulated integration/reliability labels
- six-input ROI estimator with negative-value handling
- keyboard-operable CRM rows and dialog focus handling
- compact related StayPilot card
- clearer forest-emerald / charcoal / cool-white hierarchy
- larger readable form, CRM, architecture, and operational text

## GPT-runtime QA

All tests below were run in the GPT runtime, not on remote devices.

### Syntax

- `node --check app.js` — pass
- `node --check functions/api/qualify.js` — pass

### Qualification API module

Default thresholds: hot 80 / review 55.

- Sarah / Acme Dental → 92 → `hot` → Sales review
- Maya / Northstar Studio → 64 → `review` → Human review
- Jordan / Field Notes Co. → 33 → `nurture` → Nurture
- missing name → HTTP 400 `validation_error`
- API responses include `cache-control: no-store`
- engine: `deterministic-qualification-v2`

### Browser behavior

- high-priority preset → 92 / HIGH PRIORITY
- duplicate high-priority rerun → CRM count unchanged
- review preset → 64 / NEEDS REVIEW
- nurture preset → 33 / NURTURE
- invalid one-character name → blocked with `Enter a name.`
- score-factor breakdown renders
- negative ROI scenario renders `-$725` and negative state
- dark → light theme toggle works
- CRM table row opens lead drawer by keyboard Enter
- no browser page errors observed

### Responsive QA

No horizontal page overflow at:

- 390px
- 768px
- 834px
- 1024px
- 1440px

## Deployment state

Cloudflare Pages project: `leadflow-ai`  
Production URL: `https://leadflow-ai-bhy.pages.dev/`

Workflow: `.github/workflows/leadflow-deploy-cloudflare.yml`

Deployment trigger commit: `07ef94303b4b22e0019e14adbaa3f841381abffa`  
GitHub Actions run: `36069382000`

The workflow passed checkout + source verification, then failed at **Require Cloudflare credentials**. The following GitHub Actions secrets are not currently available to the workflow:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

No deployment was claimed as successful.

An external live fetch after the failed run still showed the legacy content at the root URL and `deterministic-qualification-v1` at `/api/qualify`, confirming the refined GitHub source has **not** reached Cloudflare production yet.

## Resume instructions

Do not rebuild or re-audit the refinement from scratch.

1. Reconcile `main` against this handoff.
2. Keep `/v1/` frozen unless a V1-specific fix is explicitly requested.
3. Add the two Cloudflare Actions secrets above through repository settings or another authorized Cloudflare/GitHub path.
4. Update `leadflow/deploy-trigger.txt` (or manually dispatch `LeadFlow Cloudflare Deploy`).
5. Require the workflow to pass:
   - source verification
   - clean Pages payload build
   - Cloudflare deploy
   - root and /v1 smoke tests
   - root API v2 and /v1 API v1 smoke tests
   - screenshot capture
6. Verify:
   - `/` shows refined “Turn incoming leads into qualified sales opportunities.”
   - `/v1/` shows legacy “Automate the work that slows your business down.”
   - `/api/qualify` reports `deterministic-qualification-v2`
   - `/v1/api/qualify` reports `deterministic-qualification-v1`

Do not report production complete until those checks pass.


## Production deployment update — samvr Cloudflare CLI

- Deployment path: authenticated Wrangler CLI on device `samvr`.
- Source deployed from clean Git worktree at GitHub `main` commit `d0b0d2aeb6121695a7f293cb83aacaf32e86bd0e`.
- Cloudflare Pages project: `leadflow-ai`.
- Immutable deployment URL: https://19180256.leadflow-ai-bhy.pages.dev
- Canonical production URL: https://leadflow-ai-bhy.pages.dev/
- Preserved legacy URL: https://leadflow-ai-bhy.pages.dev/v1/
- Verified root serves refined LeadFlow build.
- Verified `/v1/` serves legacy LeadFlow AI build.
- Verified `/api/qualify` reports `deterministic-qualification-v2`.
- Verified `/v1/api/qualify` reports `deterministic-qualification-v1`.
- Verified canonical Sarah / Acme Dental live POST returns score 92 and Sales review.
- GitHub Actions credential issue #24 remains an automation-only follow-up; it no longer blocks the live production deployment because samvr Wrangler OAuth was used.


## Visual refinement update — editorial green/red system

- GitHub main: `575cfd01e062eb7eb748f28f374dbbecae5e5c8d`
- Cloudflare deployment: https://5300491f.leadflow-ai-bhy.pages.dev
- Canonical production: https://leadflow-ai-bhy.pages.dev/
- Preserved legacy: https://leadflow-ai-bhy.pages.dev/v1/
- Added red action/urgency contrast while preserving forest/emerald system colors.
- Removed visible sparkle / magic-style motifs from the root build.
- Replaced glass/glow-heavy presentation with flatter editorial panels, sharper radii, ruled section markers, and restrained hover movement.
- Made `Run automation` a high-contrast red tactile CTA with reduced-motion fallback.
- Slowed hero flow animation to 9s and connector animation to 5.4s.
- Slowed interactive workflow nominal sequence from ~1.3s to ~5.71s for legibility.
- Replaced circular score-gauge presentation with an editorial score plate.
- Reserved red primarily for high-priority/action/failure states (high-priority status, simulated timeout, action CTA, workflow travel markers).
- Verified root remains qualification API v2 and `/v1` remains untouched with API v1.
- FreeFrontend was used only as interaction inspiration (button/card hover and timeline pacing), not as copied page/template code.
