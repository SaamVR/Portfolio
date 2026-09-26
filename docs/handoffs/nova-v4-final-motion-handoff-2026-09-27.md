# NOVA V4 Final Motion Handoff — 2026-09-27

Repository: `SaamVR/Portfolio`

Branch: `nova/v4-final-motion`

Purpose: final portfolio release of the NOVA animated and interactive 3D product website.

## Scope

V4 preserves the V3 product story, real Sony WH-1000XM6 reference disclosure, V1 archive, WebGL/GLTF fallback, reduced-motion path, mobile navigation, specifications dialog, and landmark-based QA.

Motion changes:
- camera position damping is slightly more responsive while remaining eased;
- look-target convergence uses range-aware damping so chapter handoffs do not trail across copy;
- product position and screen rotation use a shared, calmer damping profile;
- source-pose playback is more responsive but remains velocity-capped to prevent rig scrubbing;
- inspection uses a 1/120-second critically damped spring step;
- front/side/rear inspection preserves bounded manual drag inertia;
- reset clears manual offsets immediately while the named product view returns through the spring.

## Release URLs

- V4 branch preview: https://v4.nova-interactive-portfolio.pages.dev/
- GitHub branch: https://github.com/SaamVR/Portfolio/tree/nova/v4-final-motion

## Deployment and QA

- `.github/workflows/nova-v4-deploy-cloudflare.yml` deploys `nova/site` to Cloudflare Pages preview branch `v4`.
- `.github/workflows/nova-v4-public-qa.yml` verifies desktop/mobile model readiness, product framing, design-detail sequence, specifications, mobile navigation, and V1 archive.
- `nova-build.yml` includes `nova/v4-*` branches.

Do not replace root production, V2, or V3 unless explicitly requested.
