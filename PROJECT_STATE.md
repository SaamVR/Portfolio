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

## Next implementation checkpoint
1. Live CRM insertion + analytics reaction after workflow completion
2. Editable generated workflow builder
3. Real-time execution event log
4. Preserve responsive behavior, accessibility and reduced-motion
5. Deploy to Cloudflare Pages and commit completed state here

## Operating rule
From this checkpoint forward, production changes should be committed to this repository after verification and before/with deployment so the repository remains the durable source of truth.
