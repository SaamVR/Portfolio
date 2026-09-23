# LeadFlow AI — Durable Project State

Updated: 2026-09-23

## Production
- Live: https://leadflow-ai-bhy.pages.dev/
- Cloudflare Pages project: leadflow-ai
- Production source directory: /home/ubuntu/leadflow-ai-live
- Repository: SaamVR/Portfolio
- Branch: main

## Current feature state
- Premium responsive landing experience
- Dark/light themes with hanging lamp pull-cord interaction
- Lead qualification workflow with timed stages
- Sarah / Acme Dental canonical 92/100 demo
- CRM with Leads, Analytics, Automations and Settings views
- Browser persistence for leads/settings/theme
- ROI calculator
- Suggested automation blueprint generator
- Responsive mobile treatment and reduced-motion support
- Production QA performed with headless Chrome

## Current visual direction
- Dark: charcoal / deep green / luminous mint
- Light: warm neutral canvas with green, blue, violet, gold and coral accents
- Lamp icon stays in navbar; pull cord hangs into hero and uses pendulum/rebound animation

## Completed after baseline
- Live CRM insertion with highlighted just-synced row
- CRM metric reaction and analytics refresh after each workflow run
- Real-time execution event stream with 14 observable events in the canonical run
- Editable workflow builder: select, rename, move, add and remove generated steps
- Sequential blueprint generation animation
- Verified canonical Sarah run: 92/100 HOT LEAD, 4 total leads, 2 hot leads
- Verified mobile width at 390px with no horizontal overflow

## Completed polish checkpoint
- ROI calculator now includes animated workload and labor-spend visualization
- Architecture now includes a four-stage production implementation proof
- Final CTA routes visitors into the editable workflow builder and live execution path
- Added SVG favicon and Open Graph / social metadata
- Regression QA: no JavaScript errors, no missing resources, no horizontal overflow at 390px

## Completed Upwork credibility checkpoint
- Durable rollback branch: backup/pre-upwork-upgrades-2026-09-23
- Real Cloudflare Pages Function at POST /api/qualify
- Server-side payload validation and deterministic qualification contract
- Live server trace surfaced in the UI with browser fallback
- Configurable lead-source / CRM / notification stack switcher
- Reliability lab for duplicate prevention, CRM timeout retry, and low-confidence human review
- Expandable API contract / production safeguards panel
- Production QA: Sarah returns 92 / hot from the server, 15 event-stream events including api.qualify
- Production QA: no browser errors, no failed resources, no mobile overflow at 390px

## Completed Upwork presentation checkpoint
- Added transparent Problem → System → Result client scenario using modeled workload inputs
- Added guided walkthrough from live qualification → CRM record → analytics → editable workflow blueprint
- Guided walkthrough verified against the production server-backed endpoint
- Production QA: 92/100 Sarah result, live server response, 15 workflow events, guided flow completes cleanly
- Mobile QA: 390px viewport remains overflow-free
- LeadFlow deployments now use a clean staging directory so the shared Portfolio/NOVA workspace is not bundled into Cloudflare Pages

## Next implementation checkpoint
1. Optional: add shareable workflow state / URL serialization
2. Optional: connect external CRM / AI credentials when a production service is selected
3. Prepare a concise Upwork media pack: cover image, 5–7 screenshots and a 60–90 second demo recording
4. Keep verified changes committed before/with deployment

## Finished product checkpoint
- Guided walkthrough camera now frames the active component instead of whole sections
- CRM record drawer remains correctly docked during tour highlighting
- Guided step transitions wait for scroll settling to avoid label/content mismatch
- Guided walkthrough can be cancelled cleanly with Escape
- Tour overlay now has progress indication and side-aware docking
- Hero CTA hierarchy refined so primary/secondary actions do not crush or wrap awkwardly
- Light and dark surface depth, focus states, card hierarchy and hover behavior normalized
- CRM qualification thresholds now change real workflow classification and server scoring
- CRM automation toggles now persist and alter follow-up / sales-routing execution
- Guided walkthrough intentionally uses canonical defaults so portfolio behavior stays deterministic
- Analytics now includes a stable recent-score activity chart
- Mobile regression verified at 390px with no horizontal overflow

## Production verification — finished product pass
- Deployed preview: https://fa0e6719.leadflow-ai-bhy.pages.dev
- Primary alias verified: https://leadflow-ai-bhy.pages.dev/
- Default server qualification: Sarah 92/100 → hot at thresholds 80/55
- Custom CRM threshold test: Sarah 92/100 → review at hot threshold 95
- Follow-up preference test: disabled setting skips follow-up and disables follow-up CTA
- Guided walkthrough production framing verified for execution, result, CRM drawer, analytics and workflow builder
- Guided CRM drawer remains right-docked and analytics chart renders correctly
- Guided canonical path remains 92/100 HOT LEAD with live server response
- Light mode verified after finished-product pass
- Mobile production QA: 390px viewport / 390px document width, no horizontal overflow
- Production browser QA: no JavaScript errors and no failed resources

## Homepage live dashboard checkpoint
- Added a full realtime operations dashboard directly to the homepage
- Dashboard demo input supports name, company, lead source, budget, timeline and need
- Demo input uses the same server qualification contract and CRM thresholds as the main workflow
- New dashboard leads persist into the same CRM / analytics state rather than an isolated mockup
- Existing live workflow runs also update the homepage dashboard
- Dashboard includes live KPI cards, qualification score trend, inbound-source mix, latest qualified pipeline and realtime activity feed
- New-row, KPI, chart, source and activity animations communicate realtime state changes
- Dashboard includes a direct Open full CRM action
- Guided walkthrough expanded from 4 to 5 steps and now showcases the homepage operations dashboard
- Dashboard core is framed as a viewport-safe tour target
- Responsive mobile table uses contained horizontal scrolling with no page overflow

## Production verification — homepage realtime dashboard
- Live deployment preview: https://8653fd97.leadflow-ai-bhy.pages.dev
- Primary alias verified: https://leadflow-ai-bhy.pages.dev/
- Dashboard initializes from the shared CRM lead store
- Production demo injection: Nadia Rahman / Harbor Dental / Meta Lead Ads → 96/100 HOT
- Dashboard input confirmed LIVE SERVER response through /api/qualify
- Pipeline count, hot count, average score, source mix, score trend and activity feed update after injection
- Streamed dashboard lead appears in the full CRM immediately
- Existing main workflow also updates the homepage dashboard
- Guided walkthrough verified across 5 stages including the operations dashboard
- Dashboard tour target fits desktop viewport cleanly
- Light mode verified after dashboard addition
- Mobile production QA: 390px viewport / 390px document width, no horizontal page overflow
- Production browser QA: no JavaScript errors and no failed resources



## Portfolio Work #2 — StayPilot Automation OS

Added and production-verified on 2026-09-23.

- StayPilot source: https://github.com/SaamVR/staypilot-hotel-os
- StayPilot live: https://staypilot-hotel-os.pages.dev/
- verified StayPilot application release: `5acade47`
- Portfolio Work #2 source merge: `8db4c466cf8061b7f1a54e0b9e43e3e4b4dd3da3`
- Portfolio Cloudflare preview with Work #2: https://c4b4254e.leadflow-ai-bhy.pages.dev
- primary Portfolio alias verified: https://leadflow-ai-bhy.pages.dev/
- Work #2 card verified at 1440px and 390px with no horizontal overflow
- production browser QA reported zero JavaScript/page errors
- existing LeadFlow `POST /api/qualify` remained healthy after the Work #2 deployment
- Sarah / Acme Dental production re-check remained 92/100 → hot

### StayPilot portfolio positioning

The card presents StayPilot as a hotel automation OS rather than another generic PMS dashboard:

```
Hotel event -> Policy check -> Action -> Audit
```

It highlights:
- 12 hotel workflows
- human-in-the-loop approvals
- Owner / Manager authority
- PMS / WhatsApp / accounting adapter strategy
- built-in webhooks/API as the long-tail integration surface
- Event-ID duplicate suppression and paused-queue dedupe
- Auditable automation run traces with contextual routing
- Fail-closed backend readiness surface and signed Event-ID ingestion foundation
- Fail-closed server foundation with signed Event-ID intake and multi-tenant RLS schema
- verified source and live-product CTAs

Rollback branch for the original pre-StayPilot Portfolio state remains:
`backup/pre-staypilot-work2-20260923`
