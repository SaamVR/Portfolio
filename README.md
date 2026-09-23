# Automation Portfolio

A two-project portfolio focused on practical business automation, observable workflows, operational dashboards and production-aware integration design.

## Work 01 — LeadFlow AI

Interactive lead qualification, CRM routing, workflow automation and sales handoff.

**Live:** https://leadflow-ai-bhy.pages.dev/

Highlights:
- live `POST /api/qualify` Cloudflare Pages Function
- deterministic qualification + configurable CRM thresholds
- CRM dashboard, analytics and automation controls
- realtime operations dashboard
- workflow builder and reliability lab
- desktop/mobile browser QA

## Work 02 — StayPilot Automation OS

Policy-aware hotel automation and operations layer for independent hotels.

**Live:** https://staypilot-hotel-os.pages.dev/  
**Source:** https://github.com/SaamVR/staypilot-hotel-os  
**Verified application release:** `145b6fde`

Highlights:
- 12 hotel automation workflows
- shared reservation / room / task / approval state
- Owner / Manager authority and approval thresholds
- automation execution traces and ROI/time-saved framing
- Integration Hub with inbound event lab and webhook architecture
- Event-ID idempotency with duplicate-suppression and paused-queue dedupe
- Auditable automation run inspector with Event ID, policy scope, autonomy and step trace
- Fail-closed production backend foundation with RLS, HMAC event ingestion and readiness health checks
- Dormant durable event worker with atomic claims, retries/dead-lettering and Event-ID-safe effects
- Durable outbound webhook outbox with endpoint/Event-ID dedupe for optional external automation consumers
- Safe signed webhook dispatcher with exact-host allowlisting, retries and dead-letter handling
- Safe verified-host outbound dispatcher with exact HTTPS allowlisting, HMAC signatures and bounded retry/dead-letter handling
- Fail-closed production backend boundary with RLS schema, signed event intake and explicit not-configured state
- Booking-derived channel mix and reservation-bound refund approvals
- Stateful Expense/Maintenance approval effects and exact 100% channel-share rounding
- global Owner automation pause with queue/defer/resume semantics
- live Cloudflare deployment and headless-browser production QA

## Portfolio presentation

LeadFlow remains the immersive Work #1 experience. Near the end of the live page, a dedicated StayPilot Work #2 handoff presents the second product and links directly to its verified source and Cloudflare demo.

## Stack

Across the two projects:
- HTML / CSS / JavaScript
- React + Vite
- Cloudflare Pages + Pages Functions
- browser-local prototype persistence
- REST/webhook integration patterns
- GitHub Actions build verification
- headless Chrome / Puppeteer production QA

See `PROJECT_STATE.md` for durable checkpoints and deployment notes.
