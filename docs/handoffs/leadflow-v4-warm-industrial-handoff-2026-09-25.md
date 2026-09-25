# LeadFlow V4 warm-industrial handoff — 2026-09-25

## Authoritative V4 repository state

Repository: `SaamVR/Portfolio`

V4 feature branch:
- `leadflow/v4-warm-industrial`
- final reviewed head: `21bf8fec1cc934e814afc449e54cf414f8eff6cc`

Merged V4 source:
- PR #27: https://github.com/SaamVR/Portfolio/pull/27
- squash merge commit: `54bb13ca316d04f51a266c2e513ed66c49b01e7d`
- preservation branch: `preserve/leadflow-v4-warm-industrial-20260925`
- preservation branch head: `54bb13ca316d04f51a266c2e513ed66c49b01e7d` (the V4 squash merge commit)
- the preserved root V4 application blobs match reviewed feature head `21bf8fec1cc934e814afc449e54cf414f8eff6cc` for `index.html`, `styles.css`, `app.js`, `dashboard.js`, `storytelling.js`, and the hardened LeadFlow deploy workflow

Production-trigger commit on main:
- `0aaa860dcfbafb3c0e0cf29abb0af89819515eb1`

Do not rebuild V4 from scratch. Do not alter V1/V2/V3 unless a version-specific fix is explicitly requested.

## Version topology

- root `/` in GitHub main = LeadFlow V4
- `/v3/` = preserved V3 from application source `4d2bb37cb282120b5d7791d838bd0dfbc5e05d9a`
- `/v2/` = frozen pre-V3 experience
- `/v1/` = legacy preserved experience

V3 preservation integrity:
- `v3/index.html`, `v3/dashboard.js`, `v3/storytelling.js`, `v3/styles.css`, `v3/favicon.svg`, and `functions/v3/api/qualify.js` match the V3 source blobs exactly.
- `v3/app.js` is the V3 app byte-for-byte after the intentional route substitution `/api/qualify` → `/v3/api/qualify`.
- V1 and V2 files were not modified by V4.

## V4 art direction

V4 is a warm-industrial refinement of the verified V3 product presentation.

Colour hierarchy:
- forest / emerald green remains the dominant system colour and owns successful flow, primary product identity, positive state, and the majority of core interaction language
- warm yellow is expanded for review, attention, live-state, annotation, and secondary information accents
- graphite / concrete grey gives neutral surfaces, chrome, dividers, and cards more visual weight
- brick red is expanded for action, urgency, high-priority emphasis, and failure/recovery states

The palette is deliberately semantic rather than four equal colours.

Key dark tokens:
- `--v4-green: #78D39C`
- `--v4-yellow: #E2B64B`
- `--v4-grey: #848C86`
- `--v4-brick: #C65D49`

The light theme uses darker accessible equivalents while preserving the same roles.

## V4 presentation changes

The V4 palette is distributed through:
- hero and browser/product panel
- sticky navigation and action CTA
- system capabilities / trust band
- problem / brief cards
- workflow cards and connectors
- live qualification form / execution / result surfaces
- Lead Operations KPIs and charts
- Reliability scenarios
- Architecture nodes
- ROI calculator
- final CTA and footer

Important presentation constraints preserved:
- green remains visually dominant
- no return to generic glass/glow-heavy styling
- existing product structure and copy remain intact
- current V3 animation/story directors remain intact
- 12px visible-text floor remains intact
- 44px audited control floor remains intact
- light and dark semantic status distinctions remain intact

## QA evidence

Primary final V4 QA run:
- https://github.com/SaamVR/Portfolio/actions/runs/36164622709
- result: SUCCESS

Final gates:
- V4 palette/preservation contract: 4/4 PASS
- deployment preservation contract: 3/3 PASS
- full Node regression suite: 91/91 PASS
- JavaScript syntax checks: PASS
- real-browser release matrix: PASS
- dark/light × 390 / 768 / 1024 / 1440: PASS
- no page-level horizontal overflow
- no visible audited text below 12px
- audited controls >= 44px
- qualification presets remain 92 / 64 / 33
- execution remains 16 events for each canonical preset
- whole-page contrast: 0 failures at dark/light 1440 and 390
- visual-review render capture: PASS

Visual-review artifact:
- GitHub Actions artifact `leadflow-v4-visual-review`
- artifact ID: `10877605460`
- generated from final feature head `21bf8fec...`

## Deployment workflow hardening

`.github/workflows/leadflow-deploy-cloudflare.yml` was corrected before V4 merge.

The clean Pages payload now includes:
- `index.html`
- `app.js`
- `dashboard.js`
- `storytelling.js`
- `styles.css`
- `favicon.svg`
- `v1/`
- `v2/`
- `v3/`
- `functions/`

The deploy workflow now smoke-checks:
- root V4
- root `dashboard.js`
- root `storytelling.js`
- `/v3/`
- `/v2/`
- `/v1/`
- root qualification API v2
- V3 qualification API v2
- V2 qualification API v2
- V1 qualification API v1

Do not revert this workflow to the older root+V1-only payload.

## Current deployment status

Canonical production before this V4 release attempt:
- https://leadflow-ai-bhy.pages.dev/

Previously verified immutable V3 deployment:
- https://aa6c8f81.leadflow-ai-bhy.pages.dev/

V4 deployment attempt:
- GitHub Actions run: https://github.com/SaamVR/Portfolio/actions/runs/36165187748
- trigger SHA: `0aaa860dcfbafb3c0e0cf29abb0af89819515eb1`

Result:
- checkout: PASS
- V4 source verification: PASS
- Require Cloudflare credentials: FAIL
- Pages payload build: skipped
- Wrangler deploy: skipped
- production smoke tests: skipped

Therefore no V4 bytes were sent to Cloudflare in this run. The previously verified V3 production remains the safe live state.

## Current blocker

GitHub Actions still lacks:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Tracking issue:
- https://github.com/SaamVR/Portfolio/issues/24

Never paste either credential into chat, source, an issue, or a handoff.

## Exact resume instructions

1. Do not redo V4 design/audit work.
2. Reconcile current `main` against this handoff.
3. Confirm the two Cloudflare GitHub Actions secrets exist.
4. Rerun failed deployment run `36165187748` or update `leadflow/deploy-trigger.txt`.
5. Require every deployment step to pass, including all root/V1/V2/V3 smoke checks and screenshot capture.
6. Record the new immutable Cloudflare deployment URL.
7. Verify canonical production points to V4.
8. Verify `/v3/`, `/v2/`, and `/v1/` all remain independently functional.
9. Only then update this handoff/issue and call V4 production-complete.

If remote Desktop Commander access becomes available before GitHub credentials are added, the previous authenticated Wrangler path on `samvr` can be used, but first reconcile that runtime worktree against GitHub main and use an isolated npm cache as documented in the V3 handoff.
