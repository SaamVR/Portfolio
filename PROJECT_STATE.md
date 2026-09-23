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

## Next implementation checkpoint
1. Optional: connect CRM settings/toggles to actual execution behavior
2. Optional: add shareable workflow state / URL serialization
3. Optional: add production backend integration when credentials/services are selected
4. Keep verified changes committed here before/with deployment

## Operating rule
From this checkpoint forward, production changes should be committed to this repository after verification and before/with deployment so the repository remains the durable source of truth.
