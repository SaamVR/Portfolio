# R3 Threads Redesign Coordination

Frozen R2 base: `a5b157e1555c802ddfcf4579c11afa25f82e0219`
R2 freeze tag: `storefront-r2-frozen-2026-09-14`
Integration branch: `r3/threads-redesign`

## Objective
Use the frozen Storefront Platform v1.1 + R2 Section Styles foundation to make Threads reference-quality without reopening platform architecture.

R3 is template production, visual refinement, and bounded reusable-style extraction. It is not a new renderer/platform redesign.

## Lane ownership

### Lane A — Threads Primary / Integration
Owns homepage/reference match, shared Threads visual direction, final integration, registry integration requested by Lane C, and release checkpoints.
May touch shared files only when required for integration. Do not redesign the platform contracts.

### Lane B — Threads Secondary Pages
Owns shop, category/collection, product detail, about/story, contact and other secondary Threads surfaces. Follow Lane A visual language. Avoid homepage ownership and shared platform contracts.

### Lane C — Reusable Style Extraction
Owns only reusable Section Style additions proven useful by R3 implementation. Reuse existing R2 contracts. Avoid persistence/theme/schema changes. Prefer renderer/style components plus exact registry handoff requests.

### Lane D — Read-only Visual QA
No product-code writes. Compare reference/design intent and audit 360/390/430/768/1440, overflow, touch targets, template consistency, and regressions.

## Frozen boundaries
- Do not alter R2 reset/inheritance semantics.
- Do not create a second style/renderer registry.
- Do not change theme hydration or persistence contracts.
- Do not add arbitrary merchant JSX/CSS/JS controls.
- Do not redesign Generic/Fashion while implementing Threads.

## Visual QA targets
Reference screenshot: `/mnt/data/ghostwriter_images/context/2c09d623-a54e-5031-b908-3e0ef135b528.png`
Required widths: 360, 390, 430, 768, 1440.

## Completion gate
R3 freezes only after homepage and secondary-page integration, targeted/full regression accounting, browser QA, and Lane D read-only P0/P1 verification.
