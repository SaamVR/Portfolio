# NOVA V3 Deployment Completion Handoff — 2026-09-25

Repository: `SaamVR/Portfolio`

Primary branch: `nova/v3-motion-polish`

## Release status

NOVA V3 is DEPLOYED and browser-verified.

Public branch alias:
https://v3.nova-interactive-portfolio.pages.dev/

Immutable Cloudflare deployment:
https://c2c5a95c.nova-interactive-portfolio.pages.dev

Do not replace root production, V2, or the /v1/ archive unless the user explicitly asks.

## Exact deployed site source

`63af14a088797d19ecc126074578403710dd01e2`

Commit:
`refine(nova-v3): steady Design tail before sound transition`

This is the exact site-source revision used to build the deployed production artifact.

The latest QA/code head immediately before this completion handoff is newer only because of QA-only workflow changes:

`27aa1b08e2eddf9e6ee4c5ed54eb15ab1979f2bd`

Commit:
`test(nova-v3): verify collapsed wired caveat text`

Comparison `63af14a...27aa1b0` contains only:
`.github/workflows/nova-v3-public-qa.yml`

The completion handoff commit(s) are docs-only and must not be treated as a new site-source revision. Therefore deployed site bytes remain attributable to `63af14a...`.

## Final verified gates

### Contracts
Run:
`36127012719`

Conclusion:
SUCCESS

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36127012719

Head:
`63af14a088797d19ecc126074578403710dd01e2`

### Production Bundle
Run:
`36127012687`

Conclusion:
SUCCESS

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36127012687

Artifact:
`10860521377`

Name:
`nova-production-site`

Digest:
`sha256:455d0a4f89daa5bc8fe3aa7efe356536238bc62038651c65a7d2a6388e71ac6d`

Head:
`63af14a088797d19ecc126074578403710dd01e2`

This exact artifact was deployed to Cloudflare branch `v3`. No site rebuild was performed on the deployment machine.

### Full Visual QA
Run:
`36127012783`

Conclusion:
SUCCESS

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36127012783

Head:
`63af14a088797d19ecc126074578403710dd01e2`

Matrix results:
- `audit (core)`: SUCCESS
- `audit (extended)`: SUCCESS

Artifacts:
- core: `10860622373` / `nova-v2-visual-qa-core`
- extended: `10859974506` / `nova-v2-visual-qa-extended`

Both artifact JSON summaries had empty browser error arrays.

Final Design continuity measurement:
- max visible-anchor jump: ~11.08 px
- 18 visible comparisons
- strict 80 px gate retained

Representative focused hotspot measurements:
- desktop Hinge movement ~3.51 px against 24 px max
- desktop Cushion movement ~13.38 px
- desktop Controls movement ~4.42 px
- mobile Hinge movement ~2.66 px against 24 px max

Manual screenshot inspection was completed for:
- Cushion detail
- Hinge detail
- Touch Controls detail
- Design exit at ~0.279
- Sound entry at ~0.281
- desktop case-study handoff

No product/copy collision or obvious Design snap was found in the final screenshots.

### Focused Hotspot QA
Run:
`36127802957`

Conclusion:
SUCCESS

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36127802957

Run head:
`27aa1b08e2eddf9e6ee4c5ed54eb15ab1979f2bd`

Important: there are no `nova/site/**` changes between deployed source `63af14a...` and this QA-only head, so the focused Hotspot QA validates the same site bytes.

### Deployed V3 Public QA
Run:
`36128208639`

Conclusion:
SUCCESS

URL:
https://github.com/SaamVR/Portfolio/actions/runs/36128208639

Target:
https://v3.nova-interactive-portfolio.pages.dev/

Verified:
- deployed model reaches ready
- NOVA headline/product story loads
- no fake notify/demo form
- Cushion/Hinge/Touch Controls sequential Design states
- active annotation visibility
- Specifications modal
- Sony WH-1000XM6 benchmark disclosure
- Approx. 254 g / 8.96 oz
- 30 mm / 1.18 in
- Bluetooth 5.3
- SBC / AAC / LDAC / LC3
- 30/40 hr AAC/SBC/LC3 battery values
- 26/36 hr LDAC battery values
- Multipoint: 2 devices
- wired Bluetooth caveat
- official Sony source links
- mobile navigation
- mobile Design detail state
- V1 archive

## Final motion / QA refinements made after the previous handoff

### Case-study product handoff
`51853e3252173be5050027561245ee3118b99aa4`

Reduced the WebGL/hotspot/model-status fade from 0.56 s to 0.36 s so the product yields cleanly to the portfolio case-study section.

### Design-to-Sound ownership
`834854f2c8b9e0d3e1a865a16a080ec6392a6492`

Delayed the spatial composition influence until Design exits:
`windowWeight(p,.28,.32,.43,.49)`

This prevents the Sound composition from pulling on the Design close-up before the three detail states finish.

### Final Design tail
`63af14a088797d19ecc126074578403710dd01e2`

Further steadied the 0.24–0.28 Design tail so the close product study remains visually stable immediately before Sound begins.

### Continuity QA correctness

A CI-only false discontinuity was identified where an off-projection hidden hotspot retained stale screen coordinates, then re-entered projection and appeared to jump ~1000 px in the measurement.

The strict 80 px visible-motion bound was NOT relaxed.

The continuity gate was corrected to compare endpoints only when both anchors are actually visible, while still requiring a minimum number of visible comparisons.

Final verified max visible-anchor jump is ~11.08 px.

### QA runtime split

Full Visual QA is now split into parallel:
- core
- extended

This preserves the existing browser checks while avoiding the earlier long serial runtime.

### Current V3 public QA

Current workflow:
`.github/workflows/nova-v3-public-qa.yml`

It is aligned with the current product model and no longer uses the stale older three-brand/demo expectations.

The wired-cable caveat is checked from `#productFactsPanel.textContent` because the sentence is inside a collapsed `<details>`; body `innerText` can omit collapsed detail text.

## Product/content constraints to preserve

- NOVA remains an independent portfolio launch study.
- Sony WH-1000XM6 is the factual hardware benchmark.
- Do not imply Sony affiliation.
- Do not invent NOVA hardware specs.
- Keep the official source links.
- Keep large product presence and readable typography.
- Keep sequential Cushion → Hinge → Touch Controls presentation.
- Do not restore three simultaneously competing detail labels.
- Keep source-pose damping and controller ownership protections.
- Keep reduced-motion and WebGL/GLTF fallbacks.
- Preserve V1 archive.

## Deployment method

Deployment was performed from device `samvr` only, per release constraint.

Exact source artifact:
`10860521377`

Cloudflare branch:
`v3`

Commit hash supplied to Wrangler:
`63af14a088797d19ecc126074578403710dd01e2`

Wrangler confirmed:
- immutable URL: https://c2c5a95c.nova-interactive-portfolio.pages.dev
- alias: https://v3.nova-interactive-portfolio.pages.dev

## Deployment-machine note

`samvr` had a nearly full root disk. Only npm/cache material was cleared to make deployment possible; project/source files were not removed.

Wrangler 4.140.0 was invoked through a dedicated temporary npm cache.

If another deployment is needed, check disk space first.

## Rollback preservation

Original V1 rollback remains:

Branch:
`backup/nova-interactive-v1-2026-09-23`

Commit:
`9c5e084518f35d364fabc1d565ccb31a6e348eba`

Also preserve:
- root production
- V2 preview
- `/v1/` archive

## Next-chat instruction

Do not restart the V3 audit.

Treat V3 as successfully released at:
https://v3.nova-interactive-portfolio.pages.dev/

If the user asks for further V3 changes, start from site source:
`63af14a088797d19ecc126074578403710dd01e2`

and preserve the current QA workflow improvements on branch head:
`27aa1b08e2eddf9e6ee4c5ed54eb15ab1979f2bd`

Any new `nova/site/**` change creates a new site-source revision and must pass:
1. Contracts
2. Production Bundle
3. Full Visual QA
4. Focused Hotspot QA when motion/hotspots are affected
5. deployment to `v3`
6. deployed V3 Public QA
