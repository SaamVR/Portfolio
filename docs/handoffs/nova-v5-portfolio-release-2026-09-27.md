# NOVA V5 portfolio release — 2026-09-27

Repository: SaamVR/Portfolio

Branch: nova/v5-portfolio

Release URL: https://v5.nova-interactive-portfolio.pages.dev/

Source commit: 8387dc862f592a533a3a0050f922de2e3246de9c

## Release scope

V5 refines the supplied animated headphone experience for an Upwork portfolio: corrected product centering and responsive composition; spring-driven inspection and continuous reset; folding interaction; shorter product copy; accessible controls and reduced-motion preferences; actual-model fallback; and a concise case study with a platform-safe project brief.

V1 archive and existing root, V2, V3 and V4 deployments are preserved. V5 is a Cloudflare Pages preview branch, not a replacement of production root.

## Build and validation

- Source: nova/site.
- Production bundle workflow installs pinned Three.js dependencies and restores the existing GLTF asset cache.
- Portfolio review: https://github.com/SaamVR/Portfolio/actions/runs/36319703719
- The portfolio review generates media/nova-product.png and media/nova-social.png from the actual rendered scene. Its nova-v5-site artifact is the deployable release bundle, including those generated assets.
- Tests cover six viewport sizes, source motion contracts, product bounds, copy separation, named views, reset, drag, actual fold pose, keyboard dialog behavior, mobile navigation, reduced motion and fallback.
- Rendering evidence uses headless Chromium with software WebGL; physical-device and other-engine testing are not claimed.

Deployment: https://d7c7f2d4.nova-interactive-portfolio.pages.dev
Deployment alias: https://v5.nova-interactive-portfolio.pages.dev/
Cloudflare deployment identifier: d7c7f2d4

Public verification runs against the alias after the trigger commit below.

## Repeat deployment

Run the V5 Portfolio Review workflow for the desired source revision and inspect its report and screenshots. Download its nova-v5-site artifact, extract it into a clean directory, and deploy that directory with an authorized Cloudflare Wrangler session:

`npx wrangler@4 pages deploy PATH --project-name nova-interactive-portfolio --branch v5 --commit-hash SOURCE_SHA`

Update nova/v5-public-qa-trigger.txt to run the public verification workflow against the alias. Never deploy the generic bundle without first generating or restoring the two media assets.

## Portfolio material

- nova/UPWORK_PORTFOLIO.md contains a ready-to-use title, role, description, skill tags and gallery guidance.
- nova/V5_RELEASE_NOTES.md records the audit findings and changes.
- Source model integration and motion work are described without claiming original modeling or commercial results.
- Sony hardware values remain clearly attributed references. No checkout, payment, audio processing or external contact submission is implemented.
