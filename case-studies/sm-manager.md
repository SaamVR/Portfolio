# SM Manager

> Conversational commerce for Bangladeshi f-commerce sellers.

**Repository:** private commercial development  
**Primary stack:** Node.js · Express · Supabase · React admin · OpenAI-assisted NLU · Facebook Messenger

## Product problem

Commerce conversations are not clean API requests. Customers mix Bangla, Banglish and English, make spelling mistakes, change quantities, refer to previous messages and revise product variants.

The conversational layer therefore needs flexibility, while price, stock, cart and order state require deterministic authority.

## Runtime architecture

```text
Facebook Messenger
       │
       ▼
 webhook normalization
       │
       ▼
conversation state router
       │
 ┌─────┼───────────────┐
 ▼     ▼               ▼
intent product/variant fallback/NLU
       │
       ▼
deterministic commerce services
       │
       ▼
 Supabase persistence
       │
 ┌─────┴─────┐
 ▼           ▼
reply     admin/ops
```

## Core engineering principle

**AI interprets language; the Commerce Engine owns commerce truth.**

A model can help understand what the customer meant. It does not become the authority for price, stock, cart mutations or order state.

## Reliability work

The product architecture emphasizes state-aware conversation handling, structured interactions, explicit expiration/recovery behavior, multi-variant cart correctness, operational logging, CI proof and stress testing.

Examples of difficult conversational behavior include requests such as multiple colors/sizes in one message, edits to an existing cart, ambiguous follow-ups and long typo-heavy conversations.

## What this demonstrates

- conversational system architecture;
- deterministic boundaries around LLM assistance;
- stateful commerce workflows;
- Supabase-backed operational state;
- React administration;
- reliability and regression testing;
- production/release discipline.

## Verification

Source remains private because this is commercial product development. The public portfolio documents the system boundary and engineering approach without exposing proprietary implementation.
