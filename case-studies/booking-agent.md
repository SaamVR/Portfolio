# Booking Agent

> Conversational booking and customer-growth SaaS for appointment businesses.

**Repository:** private product development  
**Initial stack:** Next.js · TypeScript · Supabase Auth/PostgreSQL/RLS · provider-neutral Semantic Gateway · official channel APIs · Railway

## Product boundary

Booking Agent is designed for the customer conversation → lead → booking → retention lifecycle. It is deliberately not intended to become a PMS, POS, ERP, EMR or accounting suite.

## Authority model

```text
customer language
      │
      ▼
Semantic Gateway / conversation
      │
      ▼
validated booking intent
      │
      ▼
deterministic reservation engine
      │
 ┌────┼─────┬──────────┐
 ▼    ▼     ▼          ▼
stock price resource  mutation
/slot       identity   rules
      │
      ▼
authoritative booking state
```

The governing rule is:

> **AI interprets the request. The reservation engine decides what is true and what may change.**

Availability, pricing, inventory/resource identity, booking creation, approval, cancellation and rescheduling stay behind deterministic authority.

## Product strategy

The architecture is multi-tenant and country/provider aware, while the initial sellable path is intentionally narrow: public web booking first, then additional messaging channels without allowing those integrations to block the core booking product.

## Engineering priorities

- tenant isolation and RLS;
- exact booking correctness;
- provider-neutral AI integration;
- official channel integrations;
- explicit deployment budget/authority;
- release tasks with concrete exit criteria;
- production state kept in durable systems rather than agent memory.

## What this demonstrates

SaaS product scoping, booking-domain authority, multi-tenant architecture, AI integration boundaries and production-oriented delivery planning.
