# NOVA V3 Production Refinement — Design

Date: 2026-09-25

## Intent

Turn the current NOVA interactive headphone experience from a polished fictional demo into a credible portfolio case study that demonstrates product research, practical product thinking, smoother real-time motion, and stronger detail storytelling.

V3 remains an independent NOVA design study. It must not falsely claim that the rendered unit is physically manufactured or lab-tested.

## Product information strategy

The product-facing experience will use two explicit layers:

1. **Market benchmark — verified manufacturer specifications**
   - Sony WH-1000XM6
   - Sennheiser MOMENTUM 4 Wireless
   - Bose QuietComfort Ultra Headphones (2nd Gen)

   The site will show current official figures for weight, battery life, Bluetooth generation, codecs/connectivity, charging, wired fallback and multipoint where the manufacturers publish them. Every benchmark column links to the official source.

2. **NOVA design brief — research-derived targets**
   NOVA-specific values are written as engineering/design targets, not measured claims:
   - <=265 g target mass
   - >=35 h ANC playback target
   - Bluetooth 5.4 + dual-device multipoint target
   - USB-C digital audio + analog wired fallback target
   - fast-charge target
   - foldable travel form
   - removable/serviceable cushion target

This keeps the portfolio honest while demonstrating real product research.

## Motion architecture

Root causes to correct:
- camera position is damped but look-at target snaps;
- source GLTF clip time is assigned directly from scroll pose;
- hotspot camera offsets switch/clear abruptly;
- hotspot state can persist internally after leaving its scene;
- fold ownership can release on incidental scrolling inside the Form section;
- guided-tour delayed callbacks can fire after the visitor has selected another step.

V3 changes:
- damp camera target in render-adapter;
- damp source clip pose before AnimationMixer.setTime;
- smooth hotspot camera/target offsets and fade them instead of snapping;
- clear hotspot ownership when leaving Design/Inspect;
- release Fold ownership only when leaving Form rather than on every scroll event;
- cancel stale guided-tour scheduled actions.

## Design detail presentation

The Design close pass will become a sequenced product-detail story:
1. Cushion / seal and comfort contact zone
2. Hinge / folding and travel geometry
3. Earcup controls / tactile control surface

Only the active floating callout is emphasized during the scroll-driven Design scene. A bottom detail rail shows all three steps and the active step. Inspect mode continues to support direct exploration.

## Portfolio/content refinement

Remove or replace demo-like UI:
- remove the fake local email notify flow;
- replace Concept Product Facts with Market Benchmark + NOVA Design Brief;
- replace vague promotional copy with practical scenarios: commute, office, travel, wired fallback, multipoint switching, serviceability;
- keep the case-study disclosure that NOVA is an independent design study;
- retain V1/V2 history and all resilience/accessibility work.

## Verification

V3 must pass:
- existing contracts;
- new V3 content contracts;
- motion smoothing unit contracts;
- full desktop/tablet/mobile Visual QA;
- focused hotspot QA;
- V3 public preview QA after deployment.

Deployment target:
- Cloudflare Pages branch: `v3`
- Stable expected alias: `https://v3.nova-interactive-portfolio.pages.dev/`
- Do not update `main`, `v2`, or `/v1/`.
