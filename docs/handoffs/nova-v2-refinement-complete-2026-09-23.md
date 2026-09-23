# NOVA V2 Refinement — Verified Preview Handoff

Date: 2026-09-23

## Repository

- Repository: `SaamVR/Portfolio`
- Integration branch: `nova/v2-integration`
- Production remains unpromoted.
- V1 rollback remains preserved:
  - branch: `backup/nova-interactive-v1-2026-09-23`
  - commit: `9c5e084518f35d364fabc1d565ccb31a6e348eba`

## Refined source checkpoint

The exact site source used to build and deploy the refined V2 preview is:

`13a3ce83b483d14446a9d9b6b115e9c61996cc6b`

No `nova/site/**` source changes were made after this checkpoint during final public/hotspot QA. Later integration commits are QA trigger/workflow-only.

## What changed

This was a refinement pass, not a redesign.

Implemented:
- larger, more dominant headphone framing
- tighter camera dolly/FOV choreography
- deliberate close-detail product passes
- controlled yaw/pitch arcs
- improved settle/plateau timing
- stronger earcup/cushion/headband/control-surface readability
- refined hotspot visual treatment
- desktop headline/product clearance guards
- mobile-specific recentering without shrinking product presence
- exact-position detail screenshots
- stricter product/copy collision regression coverage
- motion-aware hotspot QA replacing brittle fixed-screen bands
- public-preview hotspot QA aligned to authored camera motion

Preserved:
- orientation
- cable framing exclusion
- commercial open-pose choreography
- hotspot anchoring
- sticky boundaries
- exact-position QA
- state-driven backgrounds
- Notify
- mobile interactions
- accessibility
- reduced motion
- GLTF fallback
- Fold/Open

## Exact verification gates for source checkpoint

All GREEN on `13a3ce83b483d14446a9d9b6b115e9c61996cc6b`:

- NOVA V2 Contracts
  - run: `35900709684`
- NOVA Production Bundle
  - run: `35900709902`
  - artifact: `10768987713`
  - artifact digest: `sha256:cdcb722060185217af153bf505c5b6936381b05201d29892063c2b7175d6aba4`
- NOVA Visual QA
  - run: `35900709829`
  - artifact: `10769655684`
  - artifact digest: `sha256:dc94f113c979b36dec5632b737f8e74165f20655b36043341c320597a9ab72a3`

Manual artifact inspection completed after GREEN:
- desktop Hero/Design separation clean
- close-detail framing clean
- mobile recentering clean
- Fold/Open clean
- inspection interactions clean
- Notify clean
- reduced motion clean
- GLTF fallback clean

## Deployment

Deployment was performed from the exact verified Production Bundle artifact using `samvr` as deployment-only.

- stable V2 alias:
  - https://v2.nova-interactive-portfolio.pages.dev/
- immutable deployment:
  - https://9ca4e898.nova-interactive-portfolio.pages.dev/
- deployed artifact file count: 29
- deployed `runtime/timeline.js` SHA-256:
  - `ea209fbb007d2e0d24d51f19574c4a910eef73a727b3a4cd61c5449169a8162d`

## Public preview verification

GREEN after the latest deployment:

- NOVA Public Preview QA
  - run: `35901925432`
  - artifact: `10769382508`
  - artifact digest: `sha256:c4f3f527aaaa809f523f35a72b6c8ed253abe1df9b88e009d4040dedd875c14a`
  - result.json: zero browser errors
- NOVA Hotspot QA
  - run: `35901980037`
  - artifact: `10769771849`
  - artifact digest: `sha256:aa7b04553d967f58f98d51ac7402f6f3ad72b0b327aa99ab6bf1fd19c82236bf`
  - desktop/mobile hotspots visible, separated, viewport-bounded, and moving with authored Design close pass

## Current status

Refined V2 preview is ready for user visual approval.

DO NOT promote production until explicit user approval.
