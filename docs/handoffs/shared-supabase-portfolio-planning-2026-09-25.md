# Shared Supabase Portfolio Backend — Planning Pointer

Date: 2026-09-25

## User decision

Use **one shared Supabase project** to showcase all portfolio applications/sites.

Do not provision or connect Supabase yet.

The user will provide Supabase access only after the shared architecture plan is finalized.

## Canonical technical handoff

Repository:

`SaamVR/staypilot-hotel-os`

Read in full:

`docs/handoffs/staypilot-shared-supabase-planning-handoff-2026-09-25.md`

That handoff contains:

- exact StayPilot verified state
- current Portfolio repository state
- existing staged backend/security contracts
- stale PR warnings
- shared-project isolation questions
- Auth/RLS requirements
- app-specific versus shared schema planning
- demo reset/sandbox requirements
- Cloudflare/Supabase responsibility split
- secret namespace requirements
- cost/limits planning
- migration/repository ownership decisions
- exact next-chat prompt

## Non-negotiable planning constraints

- one Supabase project can host multiple portfolio apps only with explicit app/tenant isolation
- no cross-app data leakage
- no cross-tenant leakage
- client-supplied roles are never authoritative
- public demo visitors must not permanently corrupt shared demo state
- n8n / Make / Zapier remain optional integrations, not application core dependencies
- no unrelated existing Supabase project should be reused before the architecture is approved
- no real secrets should be configured before the rollout plan is approved

## Current Portfolio main at handoff creation

`28250fdff0a26408c6dbfba4ffa3c5cc234f2da1`

The Portfolio repository may continue receiving independent work after this pointer; always reconcile live `main` before writes.
