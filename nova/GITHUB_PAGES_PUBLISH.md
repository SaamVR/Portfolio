# NOVA GitHub Pages Publish Instructions

Canonical public target:

`https://saamvr.github.io/Portfolio/NovaAG/`

Repository:

`SaamVR/Portfolio`

Source project:

`nova/`

Published Pages directory:

`NovaAG/`

Publish workflow:

`.github/workflows/nova-pages-publish.yml`

## Publishing rule

`NovaAG/` is deployment output. Do not hand-edit the published copy as the development source.

All design, animation, 3D, content, interaction, debugging, and QA work must be completed under `nova/` first. The published `NovaAG/` folder must be generated from the exact verified production artifact.

Publishing to `NovaAG/` must not modify or replace the repository-root LeadFlow site or any existing portfolio paths.

## Mandatory pre-publish gates

Before GitHub Pages publication:

1. The NOVA V2 integration source must pass the contract suite.
2. The production-bundle workflow must succeed.
3. The exact-position browser QA matrix must pass on desktop, tablet, and mobile.
4. The final screenshots must be manually reviewed.
5. The headphone must remain visually dominant:
   - larger authored product framing than the earlier V2 pass where composition allows;
   - close/detail moments must expose earcup, cushion, headband/articulation, and control-surface form;
   - scale changes should come primarily from camera distance/dolly, not arbitrary object scaling;
   - detail motion must be purposeful and continuous rather than decorative spinning;
   - no headline/product collision at required viewports.
6. Fold/Open, Spatial/Focus/Ambient, Adaptive/Transparency, hotspots, inspection drag/swipe, Reset, and reduced-motion/fallback paths must remain functional.
7. The exact production artifact run ID and artifact digest must be recorded before publication.

Do not publish an unverified working tree.

## Exact publication procedure

### 1. Produce the verified artifact

Run `.github/workflows/nova-build.yml` on the accepted source commit.

Required artifact name:

`nova-production-site`

Record:

- accepted source commit SHA;
- build workflow run ID;
- artifact ID;
- artifact SHA-256/digest.

### 2. Point the Pages publisher at the accepted artifact

The Pages publisher must use the exact accepted production artifact, never a rebuilt or manually copied approximation.

Current publisher:

`.github/workflows/nova-pages-publish.yml`

Before a new release, update its artifact download reference from the previous verified run ID to the newly accepted `nova-build.yml` run ID, unless the workflow has been upgraded to accept the run ID as an explicit dispatch input.

The workflow must continue validating at least:

- `index.html`
- `styles.css`
- `app.js`
- runtime modules
- UI modules
- interaction modules
- `assets/headphones-web.gltf`
- Three.js vendor modules
- 14 meshes
- 36 skin joints
- 3 source animation clips
- all referenced optimized texture assets.

### 3. Publish only into `NovaAG/`

The workflow must:

```bash
rm -rf NovaAG
mkdir -p NovaAG
cp -a <verified-production-artifact>/. NovaAG/
touch .nojekyll
```

Then verify:

```bash
test -f NovaAG/index.html
test -f NovaAG/assets/headphones-web.gltf
test -f NovaAG/vendor/three.module.js
```

Commit only the generated `NovaAG/` payload plus `.nojekyll` if required.

Do not overwrite repository-root `index.html`, `styles.css`, `app.js`, LeadFlow folders, or unrelated portfolio routes.

### 4. Trigger the Pages publish

The existing workflow supports:

- `workflow_dispatch`; and
- a change to `NovaAG/publish-trigger.txt`.

Preferred release procedure:

1. update the publisher to the exact verified production run;
2. trigger `Publish NOVA to GitHub Pages`;
3. let GitHub Actions copy the verified bundle into `NovaAG/` and push that generated payload to `main`.

Development still happens in GPT runtime / repository tooling. Do not use `samvr` for development or QA. GitHub Pages publication is performed by GitHub Actions, so `samvr` is not required for this release path.

## Public verification

After the workflow succeeds, verify:

`https://saamvr.github.io/Portfolio/NovaAG/`

From GPT runtime / hosted browser QA, check:

- HTTP/page availability;
- NOVA product-first hero is present;
- GLTF reaches ready state;
- no missing module or texture paths under `/Portfolio/NovaAG/`;
- headphone scale/framing matches the accepted screenshots;
- scroll motion and section transitions match the accepted build;
- direct inspection works;
- product controls work;
- mobile layout works;
- Behind NOVA appears only after the commercial product journey;
- no repository-root or other portfolio route was disturbed.

Because GitHub Pages serves this project from a subpath, all runtime asset/module links must remain relative (for example `./assets/...`, `./runtime/...`, `./vendor/...`) rather than root-absolute paths.

## Rollback

The original pre-V2 source backup remains:

- branch: `backup/nova-interactive-v1-2026-09-23`
- commit: `9c5e084518f35d364fabc1d565ccb31a6e348eba`

For a Pages-specific rollback, republish the last accepted `nova-production-site` artifact into `NovaAG/`.

Do not restore NOVA by replacing the repository root.

## Definition of published

NOVA is considered published only when:

- the exact accepted production artifact is present under `NovaAG/`;
- the GitHub Pages URL resolves successfully;
- public browser verification passes;
- the tested source SHA, artifact digest, workflow run ID, and Pages URL are recorded in `nova/VERIFIED_STATE.md`.
