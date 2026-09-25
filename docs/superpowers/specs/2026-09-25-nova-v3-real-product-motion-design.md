# NOVA V3 Real Product + Motion Refinement Design

Date: 2026-09-25

Repository: `SaamVR/Portfolio`

Base branch: `nova/v2-integration`

V3 branch: `nova/v3-real-product-motion`

## Purpose

Turn NOVA from a visibly self-described portfolio demo into a credible premium-headphone product launch that can be shown to a client as finished product-design/web-development work, while retaining an honest portfolio disclosure in the case-study section.

V3 must also remove the visible scroll-animation glitches in the current R13 choreography and present the three product-detail callouts as a deliberate product-teaching sequence rather than three labels attached to a moving/deforming model.

## Product positioning

Product-facing pages treat NOVA as a premium wireless over-ear headphone named **NOVA**.

The main product journey must not use these phrases:
- fictional product
- demo only
- concept preview
- preview notification
- what the demo actually represents
- no data leaves this browser
- conceptual interaction state

The portfolio/case-study area may identify NOVA as an original concept project. That disclosure must be concise and separate from buyer-facing product content.

## Specification policy

NOVA V3 uses a **project design specification**, not a claim of manufactured/lab-certified hardware.

The numbers must be internally coherent and benchmarked against current premium wireless headphones.

Benchmark references used for V3:
- Sony WH-1000XM6 official specifications: approx. 254 g, 30 mm driver, Bluetooth 5.3, SBC/AAC/LDAC/LC3, up to 30 h NC on / 40 h NC off, ~3.5 h charge.
- Sennheiser MOMENTUM 4 official specifications: 293 g, 42 mm dynamic driver, Bluetooth 5.2, SBC/AAC/aptX/aptX Adaptive, up to 60 h with ANC, ~2 h charge, multipoint.
- Bose QuietComfort Ultra Headphones (2nd Gen) official specifications: approx. 264 g, Bluetooth 5.4, up to 30 h battery, USB-C audio, multipoint, 3.5 mm wired audio.

These references inform the NOVA design target; NOVA does not claim those products' laboratory certification.

## NOVA V3 design specification

Use these exact values consistently throughout the product page:

- Product type: closed-back, circumaural wireless over-ear headphone
- Target weight: 260 g
- Driver: 40 mm dynamic
- Frequency response target: 20 Hz – 40 kHz
- Wireless: Bluetooth 5.4
- Codecs: SBC, AAC, LDAC, LC3
- Multipoint: two active devices
- Noise control: hybrid adaptive ANC + transparency mode
- Battery design target: up to 30 h with ANC / 40 h with ANC off
- Charging: USB-C; approx. 2.5 h full charge
- Quick charge target: 10 min for up to 5 h playback
- Wired audio: USB-C digital audio + 3.5 mm analog
- Controls: right-ear physical control surface plus touch/gesture input
- Fit: articulated yokes, memory-foam circumaural cushions
- Materials: aluminum-reinforced hinge/yoke, soft-touch polymer earcups, protein-leather memory-foam cushions
- Included: hard carry case, USB-C cable, 3.5 mm audio cable
- Compatibility: iOS, Android, macOS, Windows; standard Bluetooth A2DP/HFP profiles
- Product colors shown in V3: Graphite / Sand / Copper accent as design-system swatches only. Do not attempt to recolor the GLTF unless the material map supports it cleanly.

The site must label this table **Design specification** or **Engineering target**, never “verified lab specification.”

## Buyer-facing content

### Hero
- Replace “Spatial wireless headphones” with a practical premium-product label.
- Keep “Hear beyond.”
- Add a compact proof row: 260 g / 30 h ANC / Bluetooth 5.4.
- Primary CTA: Explore NOVA.
- Secondary CTA: Specs.

### Design
Explain:
- memory-foam circumaural cushions
- articulated fit
- aluminum-reinforced hinge/yoke
- right-ear controls

The three product detail controls must be a deliberate rail:
1. Cushion
2. Hinge
3. Controls

Each rail item can focus the matching hotspot. The current “three floating dots while the product deforms” presentation must be removed.

### Sound / ANC
Replace concept disclaimers with practical descriptions:
- Spatial: wider presentation / immersive profile
- Focus: reduced environmental animation and a tighter presentation
- Ambient: more open presentation
- Adaptive ANC: noise control reacts to changing surroundings
- Transparency: outside sound awareness

Do not claim measured dB attenuation.

### Portability
Explain folding geometry and carry case. Keep Open/Fold interaction.

### Inspection
Keep Front / Side / Rear, drag/swipe. Add small practical annotations for ports/control side if the 3D geometry supports the existing anchor.

### Product summary
Add a compact technical-spec table and FAQ:
- battery
- charging
- wired use
- multipoint
- codecs
- weight
- box contents
- compatibility

Remove the local fake email/notify interaction from the product journey. It reads as a demo. Replace it with:
- “View full specs”
- “See what’s included”

## Portfolio/case-study disclosure

Case study must state:
“NOVA is an original portfolio product concept. The V3 specification is a project-defined engineering target benchmarked against current premium wireless headphones; it is not a manufactured-product certification.”

This is the only place where concept status needs to be explicit.

## Motion architecture

### Root cause to fix

Current R13 directly calls:
`mixer.setTime(state.product.pose * clipDuration)`

while camera/product transforms are damped. Rapid scroll changes therefore hard-jump the skeleton animation while the camera is still easing. R13 also contains steep pose changes around the Design → Sound boundary. Hotspot anchors remain attached during this motion, making the detail callouts appear to jitter or drift.

### V3 motion rules

1. Add a damped animation clock in `render-adapter.js`.
   - Maintain internal `poseClock`.
   - Dampen toward `state.product.pose`.
   - Use a stable lambda appropriate for scroll scrubbing.
   - Fold interaction remains responsive but must not snap.

2. Design scene must use a stable product pose while detail callouts are presented.
   - No large source-pose expansion while hotspots are visible.
   - Camera orbit/dolly carries the detail storytelling.
   - Pose variation across p=.16-.26 must remain small.

3. Move the large source-pose transition into the Design → Sound bridge only after detail labels have cleared.
   - Transition must be smooth over a wider progress interval.
   - No abrupt 0.24 → 0.46 → 0.70 jump over 4% progress.

4. Hotspot presentation:
   - Introduce `detailStep`: cushion / headband / controls.
   - Only the active detail label is expanded.
   - Non-active anchors may retain small dots only after the product has settled.
   - Scroll can advance the active detail step; clicking the rail overrides/focuses it.

5. Form section owns the obvious fold/open product transformation.
   - Design and Sound should not visually mimic folding.

6. Named inspection views operate from a stable open pose.

7. Reduced-motion mode uses settled poses only.

## Animation quality thresholds

Add tests for:
- Maximum source-pose delta between adjacent Design samples.
- No Design pose jump greater than 0.08 between sample points.
- Design → Sound transition spreads the pose change across at least 0.05 global progress.
- Damped mixer clock does not reach a 0.5 pose jump in one 60 Hz frame.
- Hotspot anchors remain in viewport during Design detail steps.
- Active detail rail and hotspot focus remain synchronized.
- Fold interaction remains functional and clears back to timeline after scroll resumes.

## V3 branch/deployment

- Preserve `main`, `v2`, `/v1/`, and the V1 rollback.
- Build V3 on branch `nova/v3-real-product-motion`.
- Cloudflare Pages branch: `v3`.
- Stable target: `https://v3.nova-interactive-portfolio.pages.dev/`
- Do not replace production/root or V2 while V3 is being evaluated.

## Verification

Required before V3 deployment:
- Contracts GREEN
- Production Bundle GREEN
- Full Visual QA GREEN
- Focused Hotspot QA GREEN
- V3-specific motion QA GREEN
- Manual inspection of Design detail sequence, Design→Sound transition, Fold, Inspect, mobile Hero, specs panel
- Public V3 browser QA GREEN after deployment
