# Virtual Agent

> An embeddable 3D AI website receptionist.

**Repository:** private product development  
**Product direction:** receptionist-first SaaS  
**Core technologies:** Three.js · VRM/GLB · Web Components · structured AI/action adapters

## Product problem

Typical chat widgets are visually disconnected from the website and often stop at answering questions. Virtual Agent explores an embodied receptionist that can answer grounded questions, guide a visitor through a site and move a qualified visitor toward a real booking.

## Conversion loop

```text
visitor arrives
     ↓
lightweight greeting
     ↓
grounded question/answer
     ↓
website guidance
     ↓
real availability
     ↓
contact capture
     ↓
confirmed booking
```

## Architectural boundaries

### Avatar behavior is semantic

The language model does not directly control individual bones or animation frames. It produces higher-level intent/behavior that a deterministic avatar behavior layer can translate into presentation.

### Website context is structured

The system uses a controlled Context Bridge rather than indiscriminately sending an entire DOM to an AI model.

### Website actions are allowlisted

Navigation and site actions pass through a validated Action Bridge. The model is not granted arbitrary page execution authority.

### Providers are replaceable

LLM, voice and scheduling integrations are designed behind provider-neutral adapters. Scheduling remains the source of truth for availability and bookings.

## Product engineering constraints

- lightweight asynchronous embed;
- lazy 3D/runtime loading;
- host-page isolation through a Web Component/Shadow DOM approach;
- tenant isolation;
- capability-aware avatar runtime;
- performance and operating cost as product requirements.

## What this demonstrates

3D frontend engineering, AI product architecture, interaction design, controlled agent actions, website embedding and conversion-oriented product thinking.
