# LeadFlow Visual + Dashboard Redesign Spec

Date: 2026-09-25
Project: SaamVR/Portfolio — LeadFlow refined root build
Production: https://leadflow-ai-bhy.pages.dev/
Legacy freeze: /v1 remains unchanged

## 1. Intent

Refine LeadFlow into a highly legible, practical, presentation-grade automation case study. Preserve the existing forest/emerald identity and controlled red action contrast, but remove the remaining miniature-dashboard feel, low-visibility microtext, and generic SaaS/AI visual conventions.

The redesign must make the product understandable at normal viewing distance, especially in the CRM workspace. The dashboard should communicate business state and next actions rather than merely display decorative analytics.

## 2. Constraints

- Preserve the refined root application's current functionality and APIs.
- Preserve /v1 exactly as the legacy version.
- Do not add fabricated client results, production integrations, or external delivery claims.
- Dashboard metrics and infographics must be derived from the existing browser-local demo lead records.
- Red remains reserved for action, urgency, high-priority state, and failure/timeout cues.
- Green remains the product/system/completion color.
- Amber represents human review.
- Neutral/sage represents nurture and supporting information.
- Respect prefers-reduced-motion.
- Maintain responsive support at 390, 768, 1024, and 1440px widths.

## 3. Audit Findings to Correct

The current stylesheet still contains 159 font-size declarations below 12px, with values as low as 7px. This creates a large gap between successful macro typography and weak secondary information.

Primary issues:
- ordinary explanatory text is still rendered with mono/micro-label styling;
- small size, muted color, and light weight are often combined, reducing legibility;
- dashboard cards show values without enough decision context;
- the explanatory left sidebar consumes space better used for operational content;
- existing score and source charts are visually small and insufficiently informative;
- activity is expressed in implementation/event-code language instead of human workflow language;
- dashboard information is fragmented across many equally weighted surfaces;
- several color tokens sit too close in luminance, weakening hierarchy in both themes.

## 4. Typography System

Keep the current large H1/H2 direction. Replace ad-hoc micro sizes with a controlled scale.

### Minimum sizes
- Primary body: 16px / 1.55–1.7
- Secondary/support copy: 14–15px
- UI labels, form labels, table cells: 13–14px minimum
- Metadata and mono labels: 12px minimum when important
- Only truly incidental technical notation may reach 11px
- No essential content below 12px

### Type roles
- Sans: headings, navigation, buttons, labels, body copy, tables, dashboard copy
- Mono: scores, timestamps, trace IDs, API paths, event keys, compact metrics only
- Avoid mono for explanatory paragraphs

### Contrast targets
Dark theme:
- primary #F3F7F4
- secondary #B8C7BF
- muted #8FA39A
- green accent #7BEFB2
- red accent #E0524D

Light theme:
- primary #102018
- secondary #40594C
- muted #607468
- green accent #0B6D45
- red accent #B93632

Text hierarchy must be achieved primarily through size, weight, and spacing; color should reinforce rather than carry hierarchy alone.

## 5. Dashboard Redesign

Replace the current sidebar-heavy CRM preview with a practical Lead Operations dashboard.

### 5.1 Toolbar
- Lead Operations title
- qualification workspace descriptor
- browser-local/demo state
- last update/sync state
- Open full CRM action
- Run another lead action

### 5.2 KPI strip
Four metrics:
1. Pipeline — total lead count
2. High priority — count and percentage
3. Average qualification score — score /100
4. Immediate follow-up — ASAP lead count and percentage

Each KPI must include context, not only a large number.

### 5.3 Primary analytics row

#### Qualification distribution
A large SVG donut or segmented radial infographic:
- High priority
- Needs review
- Nurture
- center value = total leads
- outside/adjacent legend includes count and percentage

Derived entirely from browser-local lead data.

#### Score trend
Readable SVG/polyline or bar trend for recent leads:
- score scale 0–100
- named points/bars
- high/review threshold lines
- accessible labels
- recent records only
- no fabricated time-series values

### 5.4 Secondary analytics row

#### Next-action queue
Counts for:
- Sales review
- Human review
- Nurture
- prepared draft if applicable

This answers: “What requires attention now?”

#### Source quality
For each current source:
- lead count
- average score
- compact horizontal comparison bar

Do not imply conversion or ROI data that does not exist.

#### Urgency mix
Show counts for:
- ASAP
- 1–2 weeks
- within a month
- exploring/other

Use a segmented bar or compact categorical visual.

### 5.5 Operational lead table
Keep the useful lead table but improve hierarchy:
- name + company
- source
- score with readable visual marker
- status badge
- timeline
- next action
- row opens/selects lead detail where existing behavior allows

### 5.6 Activity
Human-readable main activity:
- “Sarah qualified as high priority”
- “Maya routed to human review”
- “Ryan moved to nurture”

Technical event codes move behind an optional “technical details” disclosure.

## 6. Dashboard Data Model

Use existing lead objects and derived values only.

Derived values may include:
- total
- high/review/nurture counts
- status percentages
- average score
- source counts
- average score per source
- timeline category counts
- routing-action counts
- recent score ordering

No invented historical deltas, revenue, conversion rate, or external CRM performance.

## 7. Visual System

### Surfaces
- Prefer editorial surfaces and rules over nested cards.
- Use 1 main dashboard shell, then logical regions inside it.
- Avoid card-inside-card-inside-card structures.
- Use consistent radius around 8–10px.
- Use soft but visible borders.

### Color semantics
- Emerald/forest = healthy system, completion, normal product identity
- Red = run/action, high priority, urgent, simulated failure
- Amber = review
- Neutral/sage = nurture/supporting state

### Infographics
- thick strokes/bars;
- labels outside cramped visual marks;
- tabular numerals;
- legends with direct labels;
- no rainbow palette;
- no glossy 3D chart styling;
- no neon/glow.

## 8. Motion / Presentation

Keep the existing slower workflow animation.

Add only narrative motion:
- KPI count-up on dashboard first reveal/update
- donut segment draw/sweep
- score trend bars/line draw in
- source/urgency bars grow from zero
- activity row insertion transition
- selected table row transition
- dashboard region reveal stagger

Motion must:
- not block interaction;
- finish quickly enough to preserve responsiveness;
- use transform/opacity/stroke-dashoffset where possible;
- disable under prefers-reduced-motion.

## 9. Page-Level Refinement

Across the rest of the site:
- raise any important sub-12px content to the new minimum system;
- remove redundant micro-labels;
- increase secondary-text contrast;
- keep H1/H2 compositions that already work;
- preserve sticky navigation and active-section orientation;
- maintain the red Run Automation emphasis;
- reduce repeated implementation disclaimers where the same fact is already explicit nearby;
- continue alternating story → interaction → evidence → product UI → technical proof.

## 10. 20-Rule UX Gate

Use the existing 20-rule framework as an implementation check:
- Hick: reduce simultaneous competing actions.
- Fitts: keep key controls at least ~44px where practical.
- Jakob: use familiar dashboard/table/filter patterns.
- Proximity: group metrics with the visual they explain.
- Miller: keep analytics grouped into a few meaningful chunks.
- Doherty: immediate feedback after user actions.
- Von Restorff: red action/urgency states remain exceptional.
- Target distance: actions located near related context.
- Serial Position: strongest moments remain hero, live demo, dashboard, final CTA.
- Peak-End: dashboard interaction and final CTA provide strong closing moments.
- Zeigarnik: progressive workflow state remains visible.
- Prägnanz: simplify dense visual regions.
- Similarity: identical status types use identical visual language.
- Uniform Connectedness: analytics groups are visibly connected.
- Tesler: keep complexity in derived dashboard logic rather than making the user interpret raw events.
- Postel: robust handling of sparse/empty browser-local records.
- Parkinson: do not let sections expand merely because space exists.
- Occam: prefer fewer, stronger visual components.
- Pareto: qualification state, next action, and pipeline receive most visual emphasis.

## 11. Files / Boundaries

Expected root files:
- index.html
- styles.css
- app.js

API file changes are not expected unless a real data requirement emerges during implementation.

Do not edit:
- v1/*
- functions/v1/*

## 12. Verification Loop

Every implementation pass must use runtime/browser verification.

For each loop:
1. run syntax/static checks;
2. start local server;
3. verify with agent-browser;
4. inspect screenshots in light and dark mode;
5. verify 390 / 768 / 1024 / 1440 widths;
6. verify no horizontal overflow;
7. run high/review/nurture lead presets;
8. inspect populated dashboard;
9. inspect empty/default dashboard;
10. inspect CRM modal;
11. verify reduced-motion behavior;
12. check console/runtime errors;
13. audit remaining sub-12px important text;
14. repeat until no material legibility or dashboard-composition issue remains.

## 13. Acceptance Criteria

The redesign is complete only when:
- no important UI or explanatory text is below 12px;
- body/secondary copy is visibly readable in both themes;
- dashboard communicates pipeline state and next actions without requiring technical interpretation;
- dashboard contains at least three meaningful data-derived infographic views;
- high/review/nurture and urgency states are visually distinguishable without relying on text alone;
- all dashboard values are derived from current demo records;
- no root functionality regresses;
- root qualification API remains v2;
- /v1 remains unchanged on v1;
- runtime workflow completes successfully with zero browser errors;
- all tested widths remain free of horizontal overflow;
- reduced-motion users receive a stable non-animated presentation.
