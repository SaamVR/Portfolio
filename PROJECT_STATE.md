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
1. Optional: connect CRM settings and automation toggles to actual execution behavior
2. Optional: add shareable workflow state / URL serialization
3. Optional: connect external CRM / AI credentials when a production service is selected
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

