# NOVA V2 R10 Refinement — Durable Completion Handoff

Date: 2026-09-23

Repository: `SaamVR/Portfolio`

Integration branch: `nova/v2-integration`

## Exact deployed site source

`19ddcf2a0c7fc1d8eecbbd35b8579b4c9b51e36c`

This is the exact `nova/site/**` source used for the verified production bundle and the deployed V2 preview.

The integration branch moved after this source commit only for QA workflow/test/trigger changes. At checkpoint time the branch head before this handoff was:

`c04b0ae4d6e4ab77fc78eaaa9aed303c845c28ef`

Comparison from the deployed source to that head contained no `nova/site/**` changes.

## R10 refinement delivered

- Reworked Behind NOVA into a cinematic handoff followed by a normal-flow portfolio case study.
- Added portfolio case-study structure: Role, Challenge, What I built, Result, runtime anatomy, and technical facts.
- Decoupled cinematic scroll progress from the additional case-study document height.
- Made the headphone retreat clearly during the Behind transition so it yields to case-study content.
- Refined Fold interaction to a more believable compact engineered pose:
  - open pose `.72`
  - fold pose `.50`
  - duration `.92`
- Improved microtype readability and active navigation state.
- Added a local-only Notify demo field; no personal data is transmitted or stored.
- Added mobile expanded-hotspot detail labels.
- Staged Behind supporting copy so the title enters first on tight mobile transitions.
- Manual artifact inspection caught a right-edge mobile hotspot-label clip.
- Fixed the mobile hotspot label by anchoring earcup labels inward and added browser bounds assertions locally and in public preview QA.
- Preserved the existing product narrative, model orientation, cable exclusion, commercial open pose, interaction model, accessibility, reduced-motion support, GLTF fallback, and V1 rollback.

## Final exact verification gates

### Contracts
Run: `35908573458`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/35908573458

Conclusion: SUCCESS

Exact head: `19ddcf2a0c7fc1d8eecbbd35b8579b4c9b51e36c`

A later QA-only contract run also passed:
`35908650562`

### Production Bundle
Run: `35908573335`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/35908573335

Conclusion: SUCCESS

Artifact: `10771597985` — `nova-production-site`

Artifact digest:
`sha256:ff7c71a4975a277c32ad52a14f45037c0e73a3e8bb50c8666e870f9ab90b9c29`

Bundle file count: 29

Integrity hashes used before deployment:

- `styles.css`: `f28e25e7d95efb367aa0ead0f83182120d08b0986a0eebe0d77c88a45ceb1303`
- `app.js`: `3cd6d21c6b031d25517390e492f2c8021008e0e771af09eed18a8bbb51036f72`
- `runtime/timeline.js`: `92a9966cf0dba2064b0aa11d1092d66174e17fdaa6b332c442819d1208dd9b8b`

### Full Visual QA
Run: `35908573440`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/35908573440

Conclusion: SUCCESS

Artifact: `10772128560` — `nova-v2-visual-qa`

Artifact digest:
`sha256:eb4142d706572e4fe0455cf6c19e3f1cc0195cdd32976ebb495bbd155f2b3a3e`

Manual inspection included:
- mobile expanded hotspot label
- mobile Behind entry and settled transition
- desktop Fold
- desktop/mobile case-study handoff
- Notify panel
- collision screenshots
- interaction screenshots

### Focused Hotspot QA
Final post-label-fix run: `35909616325`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/35909616325

Conclusion: SUCCESS

Artifact: `10771748854` — `nova-hotspot-qa`

Artifact digest:
`sha256:da4dafa2b3a692af6482c8886031b0695109eac0e4afd5224eddfb9a9d04c906`

### Public Preview QA
Run: `35910269279`

URL:
https://github.com/SaamVR/Portfolio/actions/runs/35910269279

Conclusion: SUCCESS

Artifact: `10772961178` — `nova-public-preview-qa`

Artifact digest:
`sha256:1061e2222f80d3d9a27ea26ffcd984787068ee1bbf237af2916e0664fe39f275`

Public result:
`{"url":"https://v2.nova-interactive-portfolio.pages.dev/","errors":[]}`

Manual inspection of deployed evidence confirmed the mobile expanded hotspot label remains fully inside the viewport.

## V2 deployment

Cloudflare Pages project: `nova-interactive-portfolio`

Branch: `v2`

Exact commit hash supplied to Wrangler:
`19ddcf2a0c7fc1d8eecbbd35b8579b4c9b51e36c`

Immutable deployment:
https://04d3145e.nova-interactive-portfolio.pages.dev

Stable V2 alias:
https://v2.nova-interactive-portfolio.pages.dev/

Deployment was performed from the exact verified GitHub Actions artifact on `samvr` only.

Wrangler deployment tooling required a temporary ARM64 optional-dependency repair and RAM-backed temp directory because the `samvr` root disk was near capacity. No source coding, debugging, browser QA, or repository editing was performed on `samvr`.

## Production status

**Production has NOT been promoted.**

Do not promote to production without explicit user approval.

When approval is given, promote the exact verified artifact above rather than rebuilding from a later docs/QA-only branch head, unless `nova/site/**` has changed.

## V1 rollback preservation

Branch:
`backup/nova-interactive-v1-2026-09-23`

Commit:
`9c5e084518f35d364fabc1d565ccb31a6e348eba`

Keep this rollback point intact.

## Resume rules

1. Reconcile the live `nova/v2-integration` head first.
2. Compare it against exact deployed site source `19ddcf2a0c7fc1d8eecbbd35b8579b4c9b51e36c`.
3. If differences are only docs/QA/tests/triggers, the deployed site source remains `19ddcf2…`.
4. If any `nova/site/**` file changed, start a new exact Contracts + Production Bundle + Visual QA cycle before deployment.
5. Keep `samvr` deployment-only.
6. Do not promote production until explicit approval.
