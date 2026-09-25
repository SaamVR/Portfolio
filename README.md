# SaamVR — Product Engineering & Automation Portfolio

I build practical digital products at the intersection of **AI automation, SaaS, commerce, interactive web experiences, and product design**.

Most of my production product repositories are private. This portfolio is the public evidence layer: it explains the products, architecture, responsibilities, live demonstrations, and engineering decisions without publishing commercial source code.

## Selected work

| Project | Focus | What it demonstrates | Access |
| --- | --- | --- | --- |
| **EZComo / EcomCMS** | Multi-tenant commerce SaaS | Next.js, TypeScript, Supabase, RLS, merchant admin, CMS/page builder, storefront runtime, onboarding, media and platform operations | Private commercial repository |
| **SM Manager** | Conversational commerce AI | Messenger commerce, stateful conversation pipeline, deterministic cart/order authority, OpenAI-assisted NLU, Supabase, React admin, reliability tooling | Private commercial repository |
| **Virtual Agent** | Embeddable 3D AI receptionist | Three.js/VRM, semantic avatar behavior, grounded business answers, website navigation/actions, scheduling architecture, tenant isolation | Private product repository |
| **Booking Agent** | Conversational booking SaaS | Multi-tenant booking architecture, deterministic reservation authority, Supabase/RLS, provider-neutral AI, web-first booking | Private product repository |
| **LeadFlow AI** | Lead qualification & CRM automation | Qualification workflow, CRM routing, analytics, operations dashboard, workflow/reliability presentation | [Live demo](https://leadflow-ai-bhy.pages.dev/) |
| **StayPilot Automation OS** | Hotel operations automation | Policy-aware workflows, approvals, event idempotency, audit traces, webhook architecture, durable processing | [Source](https://github.com/SaamVR/staypilot-hotel-os) · [Live demo](https://staypilot-hotel-os.pages.dev/) |
| **NOVA** | Interactive 3D product web experience | Product storytelling, motion/interaction design, 3D presentation and frontend engineering | Private source / live showcase |
| **EZComo Homepage** | SaaS product storytelling | Responsive product marketing, animated merchant story/demo and iterative UI/UX refinement | [Public preview repository](https://github.com/SaamVR/ezcomo-homepage-v6-preview) |

## Engineering areas

**AI & automation** — conversational systems, deterministic action boundaries, LLM integrations, agent workflows, workflow orchestration, webhooks, reliability and failure handling.

**Web & SaaS** — React, Next.js, TypeScript, Supabase/PostgreSQL, authentication, RLS, APIs, multi-tenant product architecture, Cloudflare and Railway/Vercel-style deployment workflows.

**Interactive product experiences** — Three.js, VRM/GLB, 3D product presentation, motion systems, responsive UI/UX and product storytelling.

**Product engineering** — requirements → architecture → implementation → QA/stress testing → deployment evidence → iterative refinement.

## Private engineering work

A large part of my substantial engineering work lives in private repositories because it contains product IP, infrastructure details, credentials/configuration boundaries, or commercial implementation.

I do **not** publish private source merely to make the profile look active. Instead:

- GitHub's private-contribution visibility can show activity without exposing repository contents.
- The case studies here identify the product, problem, architecture, stack and my responsibilities.
- Public demos and sanitized showcase material provide inspectable evidence where appropriate.
- Detailed private repository history can be demonstrated during a serious technical review when appropriate.

## Project snapshots

### EZComo / EcomCMS

Bangladesh-first multi-tenant commerce CMS and storefront platform.

**Core stack:** Next.js App Router · React · TypeScript · Tailwind · Supabase Postgres/Auth/RLS/Edge Functions · Cloudinary.

**Product surface:** merchant administration, page-builder CMS, onboarding, media management, tenant storefront rendering, store-scoped commerce data and platform lifecycle/entitlement logic.

**Engineering evidence:** active issue/PR-driven development, production-aware migrations, accessibility work, responsive merchant UI, validation/error-state hardening and release reconciliation.

### SM Manager

Facebook Messenger commerce assistant designed for Bangladeshi f-commerce sellers.

**Core stack:** Express · Supabase · React admin · OpenAI-assisted NLU · Facebook Messenger integration.

**System design:** webhook intake → normalized events → stateful conversation pipeline → deterministic product/cart/order services → persistence → Messenger response and operational admin surfaces.

AI interprets messy customer language; authoritative commerce operations remain deterministic.

### Virtual Agent

Receptionist-first embeddable 3D AI website agent.

**Core concepts:** Three.js + VRM/GLB rendering, lazy embeddable runtime, semantic avatar behavior engine, structured website context, allowlisted website actions and provider-neutral AI/scheduling adapters.

The product direction is a practical receptionist loop: greet → answer grounded questions → guide the visitor → show availability → capture contact details → confirm booking.

### Booking Agent

Multi-tenant conversational booking and customer-growth SaaS for appointment businesses.

**Architecture rule:** AI handles language and conversation; a deterministic reservation engine remains authoritative for availability, inventory/resource identity, pricing, booking, cancellation and rescheduling.

**Initial stack:** Next.js · TypeScript · Supabase Auth/PostgreSQL/RLS · provider-neutral LLM gateway · official channel APIs · Railway.

### LeadFlow AI

Automation-focused portfolio product demonstrating lead qualification, configurable CRM routing, analytics, operational visibility and workflow design.

**[Open the live experience](https://leadflow-ai-bhy.pages.dev/)**

### StayPilot Automation OS

Hotel automation prototype centered on operational workflows rather than static dashboard mockups.

It demonstrates shared operational state, role-aware approvals, execution traces, idempotent event handling, safe webhook patterns, retry/dead-letter concepts and production-aware backend boundaries.

**[View source](https://github.com/SaamVR/staypilot-hotel-os)** · **[Open live demo](https://staypilot-hotel-os.pages.dev/)**

## How I work

My projects generally move through:

**Product problem → system boundaries → architecture → implementation → integration → adversarial/stress testing → release evidence → UX refinement.**

For visual/product work, I iterate from rough direction through approval, implementation and detailed refinement rather than treating the first render as final.

## Public repositories

This account intentionally mixes public demonstrations with private production work. The strongest public-facing entry points are:

- [Portfolio](https://github.com/SaamVR/Portfolio)
- [StayPilot Automation OS](https://github.com/SaamVR/staypilot-hotel-os)
- [EZComo Homepage V6 Preview](https://github.com/SaamVR/ezcomo-homepage-v6-preview)
- [VR / interactive work](https://github.com/SaamVR/vr)

## Verification

Claims in this portfolio should be treated as project documentation, not as a substitute for repository evidence. Where source is private, I can demonstrate appropriate repository history, architecture and implementation evidence during a technical review without exposing commercial IP publicly.

---

**GitHub:** [@SaamVR](https://github.com/SaamVR)

> This portfolio is being expanded with sanitized case studies, architecture diagrams and project-specific engineering evidence.
