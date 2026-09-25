# NOVA V3 Release Completion — Durable Handoff

Date: 2026-09-25

Repository:
`SaamVR/Portfolio`

Active branch:
`nova/v3-motion-polish`

## Release state

**NOVA V3 is deployed and verified as a separate Cloudflare Pages preview.**

Do not restart the V3 design/product audit.
Do not redeploy an older V3 artifact.
Do not replace `main`, the existing V2 preview, or the `/v1/` archive unless the user explicitly asks.

### Exact verified V3 site source

`63af14a088797d19ecc126074578403710dd01e2`

Commit:
`refine(nova-v3): steady Design tail before sound transition`

The branch moved after that source only for QA workflow changes. The next QA-only commit was:

`27aa1b08e2eddf9e6ee4c5ed54eb15ab1979f2bd`

Commit:
`test(nova-v3): verify collapsed wired caveat text`

There were no `nova/site/**` changes after `63af14a...` before this completion handoff.

---

# Cloudflare V3 deployment

Project:
`nova-interactive-portfolio`

Environment:
Preview

Branch:
`v3`

Cloudflare deployment ID:
`b42bd1ec-5e93-4940-a27c-f8067555b02b`

Cloudflare-reported source:
`63af14a`

Immutable deployment URL:
https://b42bd1ec.nova-interactive-portfolio.pages.dev

V3 alias:
https://v3.nova-interactive-portfolio.pages.dev

Wrangler deployment was executed from `samvr` using the exact already-built production artifact and explicit commit hash:

`63af14a088797d19ecc126074578403710dd01e2`

The prior V3 deployment `7169a5a3...` used source `834854f...` and is superseded by `b42bd1ec...`.

---

# Final release gates

## Contracts

Run:
`36127012719`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36127012719

Conclusion:
SUCCESS

Source:
`63af14a088797d19ecc126074578403710dd01e2`

## Production Bundle

Run:
`36127012687`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36127012687

Conclusion:
SUCCESS

Artifact:
`10860521377`

Name:
`nova-production-site`

Digest:
`sha256:455d0a4f89daa5bc8fe3aa7efe356536238bc62038651c65a7d2a6388e71ac6d`

Artifact source:
`63af14a088797d19ecc126074578403710dd01e2`

This is the exact bundle deployed to Cloudflare V3.

## Full Visual QA

Run:
`36127012783`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36127012783

Conclusion:
SUCCESS

Both matrix phases passed:
- `audit (core)`
- `audit (extended)`

Core artifact:
`10860622373`

Core digest:
`sha256:b483d3e0a4bf3ff431f2380a9227dcbdf5cb5e7b85e6c3f129c4cbaa79ee7b6d`

Extended artifact:
`10859974506`

Extended digest:
`sha256:bd5c1f0b2dec5b8fd6bfba0a3278ea67b99e87f49706107153dccbcaceba5e2a`

Manual screenshot inspection was also completed for the exact source. The final screenshots confirmed:
- stable sequential Cushion / Hinge / Touch Controls presentation,
- smooth Design -> Sound handoff,
- readable desktop/mobile case-study content,
- readable desktop/mobile specifications,
- reduced-motion behavior,
- GLTF/WebGL fallback behavior.

## Focused Hotspot QA

Run:
`36127476229`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36127476229

Conclusion:
SUCCESS

Run head:
`27aa1b08e2eddf9e6ee4c5ed54eb15ab1979f2bd`

Important:
That head differs from `63af14a...` only by public-QA workflow content. Therefore the tested `nova/site/**` source is still exactly `63af14a...`.

## Deployed V3 Public QA

Run:
`36128131687`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36128131687

Conclusion:
SUCCESS

Target:
https://v3.nova-interactive-portfolio.pages.dev

Artifact:
`10860433581`

Name:
`nova-v3-public-qa`

Digest:
`sha256:e8b9256e3aa05442ed4cb9e74e941701554de8bb48c3261456d6ffd17a22e8c9`

Manual review of the deployed-public screenshots confirmed:
- Cushion, Hinge and Touch Controls states render correctly,
- desktop/mobile Reference Specifications are legible,
- Sony WH-1000XM6 benchmark disclosure remains present,
- mobile navigation is correct.

---

# Final V3 behavior to preserve

V3 is a real-product interactive launch study, not a fake product/demo funnel.

Preserve:
- Sony WH-1000XM6 as the disclosed real-world hardware benchmark,
- real practical specifications and official source links,
- no implied Sony affiliation,
- no fake notify/demo-form experience,
- large product presence and readable typography,
- sequential Design detail controls,
- stable close-up through Cushion -> Hinge -> Touch Controls,
- damped camera / target / product / rotation / scale / source-pose motion,
- no direct per-scroll-frame source-pose snapping,
- no controller ownership fights,
- bounded hotspot motion,
- safe viewport clamping,
- smooth Design -> Sound transition,
- usable mobile detail rail,
- product/copy collision protection,
- reduced-motion fallback,
- GLTF/WebGL fallback,
- case-study handoff after the product film.

The continuity QA was corrected to measure actual visible anchors rather than stale hidden hotspot geometry while retaining the strict visible-motion bound.

---

# Release preservation / rollback

Do not destroy or silently replace:
- root production on `main`,
- V2 preview,
- `/v1/` archive,
- original V1 rollback branch.

Original V1 rollback branch:
`backup/nova-interactive-v1-2026-09-23`

Original V1 rollback commit:
`9c5e084518f35d364fabc1d565ccb31a6e348eba`

V3 remains a separate preview/version until the user explicitly asks to promote it.

---

# Operational note

During the final V3 deployment, `samvr` briefly hit `ENOSPC` while `npx` unpacked Wrangler.

Only disposable npm/temp caches were cleared. The retry then succeeded.

Before a future deployment from `samvr`, check free disk space first.

---

# What is complete

The handoff objective from
`docs/handoffs/nova-v3-real-product-motion-handoff-2026-09-25.md`
is complete:

1. exact active source reconciled,
2. final Design motion fixed,
3. full Visual QA GREEN,
4. focused Hotspot QA GREEN,
5. current-content V3 public QA implemented,
6. exact production bundle deployed to Cloudflare branch `v3`,
7. Cloudflare source hash verified,
8. deployed V3 public QA GREEN,
9. V1/V2/root production preserved.

No additional V3 release work is required unless the user asks for a new visual/content refinement or promotion of V3.
