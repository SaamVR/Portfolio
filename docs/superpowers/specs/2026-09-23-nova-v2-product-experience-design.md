# NOVA V2 — Interactive Product Experience Design

Date: 2026-09-23  
Status: Design approved in conversation; written-spec review pending  
Repository: `SaamVR/Portfolio`  
Project path: `nova/`

## 1. Durable baseline and rollback

NOVA V2 evolves the currently deployed and browser-verified NOVA implementation.

The exact pre-V2 rollback point is preserved on:

- branch: `backup/nova-interactive-v1-2026-09-23`
- commit: `9c5e084518f35d364fabc1d565ccb31a6e348eba`

V2 must not delete or rewrite that backup.

The proven runtime baseline includes:

- Three.js 0.180
- GLTFLoader + BufferGeometryUtils
- real animated GLTF source
- principal clip: `ArmatureAction`
- clip duration: 27.71 seconds
- 36 skin joints
- 14 skinned meshes
- 3 source clips
- 12 optimized WebP material maps
- verified upright presentation root at -90° X
- cable hidden from the showcase and excluded from camera fitting
- working desktop/tablet/mobile browser QA
- successful Cloudflare deployment

V2 reuses this runtime and asset pipeline unless a regression proves a change is necessary.

## 2. Product and portfolio objective

NOVA V2 is first a convincing premium consumer headphone landing page and second an interactive portfolio case study.

The product experience must make a visitor think:

1. this is a desirable, thoughtfully art-directed headphone product;
2. the page itself is interactive and unusually polished;
3. only after experiencing it, the visitor can discover how the experience was built.

The implementation technology is the medium, not the subject of the first 85–95% of the journey.

### Primary audience

- potential freelance/agency clients evaluating creative web-development capability;
- design-conscious visitors who should understand the fictional NOVA product without technical context;
- technical reviewers who need credible evidence of real 3D/browser work.

### Success criteria

A successful V2:

- reads as a real premium product campaign before it reads as a portfolio case study;
- keeps the 3D headphone as the dominant visual object;
- uses meaningful interaction rather than decorative pointer effects alone;
- maintains continuous visual motion across section boundaries;
- avoids abrupt model translation/scale/camera changes;
- gives desktop, tablet, and mobile their own authored compositions;
- reveals real implementation facts only after the commercial product journey;
- remains responsive and usable when WebGL interaction is reduced or unavailable.

## 3. Product-content policy

NOVA is a fictional premium wireless headphone.

The page may use plausible qualitative feature language such as:

- Spatial Audio
- Adaptive Noise Control
- Transparency
- Multipoint
- premium construction
- articulated fit
- soft-touch comfort
- touch controls

The page must not invent numeric specifications, certifications, laboratory claims, battery-hour figures, driver dimensions, codec support, material trademarks, or other engineering claims that could read as factual product specifications.

The fictional nature of the campaign should remain clear in the portfolio reveal / project context without undermining the main experience.

## 4. Experience structure

V2 behaves as one continuous product film with content anchors rather than a collection of visually disconnected scenes.

Approximate global experience ranges are design guides, not hard-coded final values. Browser QA may tune them.

### 4.1 Hero — 0% to ~12%

Purpose: desire and first impression.

Core copy:

- NOVA
- `Hear beyond.`
- supporting line describing immersive listening, adaptive quiet, and effortless movement
- primary CTA: `Explore NOVA`
- optional secondary affordance once settled: `Drag to feel the form` or equivalent

Visual behavior:

- begin on an intentional close crop of the earcup/headband;
- camera pulls back rather than scaling the object like UI;
- source animation resolves toward a strong open silhouette;
- key/fill lighting expands from detail-focused to full studio;
- large NOVA typography yields visual priority to the product;
- end in a clear full-product pause state.

The opening must not mention GLTF, Three.js, source clips, bones, or browser rendering.

### 4.2 Design / materials — ~12% to ~28%

Purpose: communicate physical design, comfort, and construction.

Core content:

- eyebrow: `SCULPTED COMFORT`
- headline: `Made to disappear.`
- concise qualitative explanation of articulated form and soft-touch contact surfaces

Visual behavior:

- camera shifts into a controlled three-quarter view;
- product remains mostly spatially stable;
- perceived size comes primarily from camera distance;
- three-dimensional anchors appear only when the referenced feature is readable.

Guided interactions:

- ear cushion / acoustic chamber
- headband / articulation
- control surface / earcup exterior

Hover/tap responses may temporarily influence:

- camera target / minor camera offset;
- key-light emphasis;
- hotspot label/card visibility.

They must not seize unrelated properties such as skeletal fold state.

### 4.3 Spatial sound — ~28% to ~45%

Purpose: communicate immersive listening.

Core content:

- eyebrow: `IMMERSIVE AUDIO`
- headline: `Your space becomes the soundstage.`

Transition:

- warm studio gradually loses ambient light;
- background moves toward near-black;
- copper/warm rim strengthens;
- subtle cool secondary light adds depth;
- spatial field/rings appear only as the environment darkens;
- product remains continuous on screen rather than cutting to a new composition.

Mode selector:

- `SPATIAL`
- `FOCUS`
- `AMBIENT`

These are conceptual experience modes, not claims that the browser reproduces physical headphone DSP.

Mode selection controls environmental presentation such as:

- field spread;
- lighting distribution;
- field motion;
- restrained camera breathing;
- background tonal balance.

### 4.4 Adaptive listening — ~45% to ~58%

Purpose: communicate user-controlled awareness/isolation.

Core content:

- eyebrow: `ADAPTIVE LISTENING`
- headline: `Silence, on your terms.`

Control:

- `ADAPTIVE`
- `TRANSPARENCY`

Adaptive visual response:

- surrounding field compresses;
- background information reduces;
- light becomes more isolated/focused.

Transparency response:

- field opens outward;
- environmental lines become more visible;
- lighting broadens.

The camera should remain close to the Spatial composition so the chapter feels like an evolution rather than a reset.

UI feedback should be immediate; environmental transition may be slower (~500–700 ms) for cinematic feel.

### 4.5 Form / fold interaction — ~58% to ~72%

Purpose: turn the real skeletal animation into a product feature.

Core content:

- headline direction: `Made to move.`

Controls:

- `OPEN`
- `FOLD`

Behavior:

- interaction starts from the model's current source-animation time;
- selected target state is reached through the real clip;
- while fold/open interaction owns pose time, scroll influence on skeletal animation is reduced;
- the final interaction state may persist;
- on resumed scrolling, pose ownership blends back into the authored timeline rather than snapping.

The camera may compensate slightly during the fold so framing remains deliberate.

### 4.6 Direct inspection — ~72% to ~86%

Purpose: provide unmistakable hands-on 3D interaction.

Entry:

- scroll settles the object into a deliberately authored inspection composition;
- UI communicates `Drag to inspect` / mobile equivalent only after motion is nearly settled.

Desktop:

- horizontal drag controls constrained yaw around the authored base angle;
- vertical movement influences a much smaller pitch range.

Mobile:

- horizontal swipe controls constrained yaw;
- pitch is smaller or disabled if it compromises readability.

Constraints:

- no unrestricted orbit;
- desktop yaw target roughly ±25–30°;
- mobile yaw target roughly ±18–22°;
- user-selected angle may remain after pointer release;
- `Reset view` returns to the authored inspection base.

Hotspot selection from inspection drives the current view into a predefined detail camera without discontinuity.

Leaving inspection fades user offsets back into the master timeline.

### 4.7 Product resolution — ~86% to ~96%

Purpose: commercial ending.

Visual behavior:

- interaction ownership releases;
- camera pulls back into the strongest hero silhouette;
- environment returns toward a warm neutral, not necessarily the exact opening tone;
- product becomes fully legible and calm.

Core copy:

- `Hear beyond.`

Feature strip:

- Spatial Audio
- Adaptive Noise Control
- Transparency
- Multipoint
- Premium Construction

Primary conceptual CTA:

- `Discover NOVA` or `Experience NOVA`

Optional `Notify me` may open a fictional concept panel but must not pretend to process a real purchase.

### 4.8 Portfolio reveal — ~96% to 100% and/or content below product resolution

Purpose: prove implementation after the visitor has experienced it.

Section identity:

- `Behind NOVA.`
- `A product campaign built around a live animated 3D asset.`

Real technical evidence may include:

- 36 skeletal joints
- 14 skinned meshes
- 3 source clips
- 42 channels in the principal clip
- Three.js
- GLTF runtime
- real-time lighting
- scroll-directed camera choreography
- responsive 3D
- constrained direct manipulation

The technical section may intentionally adopt a more portfolio/system-oriented visual language.

## 5. Motion design principles

### 5.1 One continuous product film

V2 must not derive the final visual state primarily from whichever section is nearest the viewport center.

Instead:

`global progress -> authored master timeline -> base visual state`

Content sections serve as semantic anchors and interaction activation ranges.

### 5.2 Product moves less than the camera

Large product translations are discouraged.

Prefer:

- camera dolly;
- camera orbit;
- target changes;
- restrained product offsets only when composition requires them.

This avoids the current impression that the model is being repositioned like a DOM element.

### 5.3 Perceived scale comes from camera distance first

The model normalization scale should remain nearly constant through the commercial journey.

Intentional exceptions are allowed for small corrective or dramatic effects, but scale must not be the primary way to fit the object around text.

### 5.4 Rotation must communicate something

Every major rotational change must:

- reveal a product detail;
- support a feature transition;
- move into/out of interaction;
- improve silhouette.

No decorative spinning.

### 5.5 Settled states are required

Each major product moment gets a readable plateau where motion falls close enough to zero for the user to inspect the product and content.

Constant motion is explicitly out of scope.

### 5.6 Transitions overlap

Outgoing visual transformation begins before incoming copy fully resolves.

Avoid:

`section A fully ends -> section B begins`

Prefer:

`section A starts transforming -> shared transition -> section B settles`

### 5.7 Different motion personalities

Camera:
- slower cinematic easing;
- long acceleration/deceleration;
- continuous curves.

Source product animation:
- preserve source clip character;
- timing is remapped deliberately.

Direct UI:
- fast and tactile;
- approximately 180–400 ms for basic control feedback.

Environmental feature transitions:
- generally slower than UI;
- approximately 500–700 ms where appropriate.

## 6. Master timeline architecture

The current section-specific `sampleCamera(scene, progress)` / `sampleAnimation(scene, progress)` architecture should be replaced by a global authored timeline.

The timeline produces a base state containing at least:

### Product domain

- source-animation time / pose progress
- presentation orientation
- restrained translation
- restrained scale correction

### Camera domain

- position
- target
- FOV
- orbit metadata where needed

### Lighting domain

- exposure
- key intensity/color/position
- fill intensity/color
- rim intensity/color
- warm/accent light state

### Environment domain

- background tonal state
- spatial field amount/spread
- adaptive field compression/opening
- decorative opacity/motion levels

### UI domain

- active product content
- headline / copy state
- control availability
- hotspot visibility
- product-navigation state

Camera data should use explicit authored keyframes along the global experience rather than a switch statement with unrelated presets.

The exact interpolation library may remain lightweight/custom if it provides sufficient control; adding a large animation dependency is not required.

## 7. Interaction-state composer

V2 uses one reconciled visual state.

Conceptually:

`authored base state + bounded interaction influences -> composed final state -> renderer`

Interaction must not mutate unrelated domains.

### Input priority

1. accessibility/reduced-motion rules;
2. active direct manipulation for the properties it owns;
3. explicit selected feature interaction;
4. authored scroll timeline;
5. ambient pointer influence.

Examples:

- inspection drag owns camera orbit offset; it does not own fold state;
- Fold/Open owns source-animation time; it does not own environment;
- Spatial mode owns relevant lighting/environment presentation; it does not own product pose;
- hotspot focus may own camera target/light emphasis; it does not own global progress;
- ambient pointer parallax is disabled or reduced during direct drag.

## 8. Reconciliation behavior

Every temporary interaction must be able to return to scroll without snapping.

Required pattern:

`timeline -> blend into interaction -> interaction -> blend back to timeline`

### Fold/Open

- begin at current clip time;
- set target open/fold pose;
- animate toward it;
- hold if required;
- when deliberate scrolling resumes, fade interaction weight and reconcile to current timeline pose.

### Hotspot focus

- start from current authored/inspection camera;
- ease toward a detail offset/target;
- return to the prior composed camera when dismissed.

### Inspection

- authored inspection camera supplies base;
- drag supplies bounded yaw/pitch offsets;
- leaving the range fades offsets to zero while master timeline continues.

## 9. Hotspot anchoring

Product feature hotspots must be tied to the actual 3D product, not fixed CSS percentages.

Design:

`object-space anchor -> world transform -> camera projection -> screen coordinate -> DOM hotspot`

Requirements:

- use reusable Three.js vectors to avoid per-frame allocation;
- anchor points follow the animated model;
- leader lines/cards remain visually attached to the corresponding product region;
- hotspots can be hidden when their anchor is occluded, behind the readable side, or compositionally unsuitable;
- mobile hit areas are larger than their visual dot.

Exact mesh/bone/vertex anchoring strategy may be chosen during implementation after inspecting the GLTF hierarchy.

## 10. Direct interaction controller

The inspection controller is independent from the master timeline.

It receives:

- pointer/touch input;
- active state;
- authored base camera orientation;
- current constrained offsets.

It outputs:

- yaw offset;
- pitch offset;
- interaction weight.

The camera composer combines these with the authored camera.

No OrbitControls-style unrestricted camera is permitted in the commercial experience.

## 11. Visual system

### Palette

Primary light environment:

- warm bone / ivory
- warm stone
- charcoal/graphite
- restrained copper/bronze accent

Immersive dark environment:

- near-black charcoal rather than generic blue-black technology styling
- warm copper rim
- restrained cool blue-gray secondary light

Journey:

`warm light -> intimate material study -> immersive dark -> tactile interaction -> warm resolution`

### Decorative graphics

Reduce the amount of always-present construction geometry substantially.

Graphics must communicate a feature:

- Design: component anchors/leader lines
- Spatial: spatial field/rings
- Adaptive: compressed/open environmental field
- Portfolio reveal: technical grid/rig information

Decoration without product meaning should be removed.

### Typography

Sans-serif:
- primary NOVA/product voice;
- bold minimal headlines;
- controls/navigation.

Serif:
- emotional punctuation;
- selective supporting phrase;
- never used so frequently that the experience reads as an editorial template.

Product copy must replace implementation-first language during the commercial journey.

## 12. Navigation and controls

Desktop header:

- left: `NOVA`
- center: `Design · Sound · Control · Experience`
- right: `Explore NOVA ↗`

Header may reduce visual presence during cinematic sequences but must remain usable.

Mobile:

- NOVA left;
- compact menu/control right;
- no crowded desktop nav compression.

Interactive controls use a common premium-hardware vocabulary:

- compact segmented pills;
- thin borders;
- restrained active fill;
- strong but small typography;
- immediate hover/press/tap feedback.

Avoid oversized SaaS buttons and gamer-style pulsing HUDs.

## 13. Responsive direction

Mobile is not a scaled desktop experience.

### Desktop

- wider lateral composition;
- copy may sit beside product;
- larger camera orbit;
- product feature cards can occupy peripheral space.

### Tablet

- moderate lateral offsets;
- compressed copy widths;
- reduced maximum orbit;
- interaction hit areas increased.

### Mobile

- product primarily upper/center during key moments;
- content generally below or in safe non-overlapping fields;
- shallower camera orbit;
- less extreme perspective/framing;
- shorter sticky/scroll duration;
- tap instead of hover;
- swipe instead of pointer-drag dependency;
- controls meet practical touch target sizes.

The same narrative and feature interactions remain available where technically appropriate.

## 14. Accessibility and reduced motion

Reduced motion must be a designed mode, not a frozen broken site.

Requirements:

- each experience range has a strong static/settled composition;
- range transitions may crossfade with minimal movement;
- Fold/Open remains available with shortened or discrete motion;
- all product controls are real semantic buttons/radio-style controls;
- all interactive hotspots have meaningful accessible labels;
- keyboard interaction works for selectors, fold/open, hotspot selection, reset, and CTA;
- focus state is visible;
- content remains readable when WebGL is unavailable.

## 15. Performance

Priority order:

1. product rendering;
2. direct interaction;
3. product UI/content;
4. decorative fields.

Rules:

- keep existing optimized GLTF/WebP pipeline;
- keep capped pixel ratio;
- reuse vectors/matrices/state objects in render loops;
- avoid avoidable per-frame allocations;
- use lightweight Three.js geometry/shaders or CSS/SVG according to the job;
- do not add complex GPU decoration if it risks product frame rate;
- allow lower decorative density on weaker/mobile devices;
- avoid new heavyweight dependencies unless they clearly simplify and improve the runtime.

## 16. Progressive enhancement and failure handling

If GLTF/WebGL fails:

- product marketing copy and navigation still render;
- page must not collapse into an empty canvas/error label;
- a designed fallback graphic/state may be used.

If advanced direct interaction is unavailable:

- the scroll-directed product journey must remain usable.

If decorative field effects fail:

- core product and controls remain usable.

## 17. QA acceptance criteria

V2 cannot replace production solely because the source builds.

### Browser viewports

At minimum:

- 1440 × 1000
- 1280-class desktop
- 1024 × 768
- 390 × 844

### Required journey captures

Capture and review:

- hero close crop
- hero resolved full product
- design composition
- each hotspot focus
- warm-to-dark transition boundary
- Spatial mode states
- Adaptive/Transparency states
- Open and Fold states
- inspection base
- inspection drag extremes
- inspection hotspot
- product resolution
- Behind NOVA section

### Interaction sequence tests

At minimum:

- scroll -> hotspot -> dismiss -> continue
- Spatial -> Focus -> continue scrolling
- Adaptive -> Transparency
- open -> fold -> immediately resume scroll
- partial drag -> hotspot -> reset
- mobile swipe -> hotspot
- resize while an interaction is active
- reverse scroll through transition boundaries
- fast scroll across several experience ranges
- reduced-motion mode

### Runtime acceptance

- no browser runtime exceptions;
- GLTF reaches ready state;
- source animation remains valid;
- no headline/product collision at required viewport widths;
- no interaction snap when ownership changes;
- input does not fight scroll;
- product orientation remains readable;
- no cable-based framing regression;
- controls are keyboard/touch accessible.

### Continuity review

Screenshots must include boundary states, not only chapter midpoints.

V2 is accepted only when camera, product pose, model framing, lighting, copy and interaction ownership remain visually continuous through those boundaries.

## 18. Development and deployment constraints

### Runtime/tooling

All NOVA development, design edits, asset processing, source changes, debugging, and QA must happen in GPT runtime / hosted repository tooling.

`samvr` is deployment-only.

Do not use `samvr`, `samai`, or other user machines for NOVA source development or QA.

### Repository isolation

NOVA remains under `nova/`.

The repository root contains another product and must not be rewritten as part of this project.

### Production safety

Do not overwrite live NOVA production with an unverified V2 build.

Sequence:

1. implement and test in repository;
2. produce exact production bundle;
3. deploy preview;
4. public verification;
5. production deployment only after preview acceptance.

### Existing rollback

The V1 backup branch remains the emergency rollback point.

## 19. Parallel implementation boundaries

Implementation will be organized into four lanes with explicit ownership so work can proceed concurrently after the implementation plan is approved.

### Lane A — Motion/runtime foundation

Owns:

- global progress model;
- timeline/keyframe interpolation;
- visual-state composer;
- camera/product/light state;
- interaction ownership/reconciliation primitives.

Must avoid owning product copy and final DOM styling.

### Lane B — Product narrative/UI

Owns:

- commercial content structure;
- navigation;
- feature controls;
- CTA;
- Behind NOVA content;
- responsive DOM/CSS layouts;
- semantic/accessibility structure.

Must consume runtime state through clear hooks/data attributes rather than hard-coding camera logic.

### Lane C — 3D interaction systems

Owns:

- 3D hotspot anchor projection;
- fold/open controller;
- constrained inspection drag/swipe controller;
- feature-mode interaction outputs;
- interaction-specific 3D/environment behavior.

Must consume Lane A composer interfaces rather than directly overwriting renderer state.

### Lane D — QA/performance/integration

Owns:

- contract/regression tests;
- browser capture matrix;
- boundary-state checks;
- accessibility/reduced-motion checks;
- performance checks;
- bundle validation;
- integration conflict detection.

Lane D may identify issues in other lanes but should not silently redesign them.

## 20. Design exclusions

V2 will not include:

- unrestricted 360° OrbitControls as the primary product interaction;
- fake checkout or fake real-world price;
- fabricated technical specifications;
- generic SaaS feature-card grids;
- large always-on technical HUDs;
- decorative animation that competes with the product;
- rebuilding the GLTF pipeline without a demonstrated need;
- replacing the repository root product;
- deployment from an unverified source tree.

## 21. Definition of done

NOVA V2 is done when:

- the main journey convincingly markets the fictional NOVA headphone;
- product interactions are meaningful and art-directed;
- motion feels continuous at range boundaries;
- direct manipulation reconciles cleanly with scroll;
- mobile has its own successful composition;
- technical portfolio proof appears after the product journey;
- full browser/interaction QA passes;
- preview deployment matches verified local/hosted QA;
- production is updated only from the verified bundle;
- rollback to V1 remains available.
