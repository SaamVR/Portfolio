# NOVA — GLTF Recovery Checkpoint

Updated: 2026-09-23 after connection recovery.

## What is durable now

The active NOVA implementation is under `nova/site/` in `SaamVR/Portfolio` and is GLTF-native.

Committed source:
- `nova/site/index.html`
- `nova/site/styles.css`
- `nova/site/app.js`
- `nova/tools/build_gltf_assets.py`
- `nova/tests/test_contract.py`
- `nova/assets-cache/README.md`

Exact optimized asset bundle:
- GLTF SHA-256: `1433717c7c8af76608bec756fb42e6e448c1515c106eca8c3124bdd118be6049`
- asset ZIP SHA-256: `b7ab75e30bb2b8a665b95e6b2105172892d7ec0c02c7e395fd8ce427add92ecc`
- Google Drive recovery file ID: `1u3aW-gZRWH_4rCTYJaVaKUPQH0kITLOr`
- GitHub Actions cache key: `nova-gltf-assets-v1-b7ab75e30bb2b8a665b95e6b2105172892d7ec0c02c7e395fd8ce427add92ecc`

Source facts:
- 14 meshes
- 1 skin
- 36 skin joints
- 3 clips
- main clip `ArmatureAction`
- main clip duration 27.71 s
- long cable mesh `Circle.013_0` renders but is excluded from camera-fit bounds

## Browser QA status

Successful exact-GLTF QA run:
- run ID: `35828018735`
- commit: `05e1ff330164c771b74d175c6d34d122bc14e854`
- desktop: 1440×1000
- tablet: 1024×768
- mobile: 390×844
- runtime state: `ready`
- runtime label: `ArmatureAction / 27.71 SEC / LIVE`
- browser errors: none

The renderer successfully loaded:
- Three.js
- GLTFLoader
- BufferGeometryUtils
- the exact optimized GLTF
- the WebP maps

## Visual diagnosis from the successful GLTF render

The editorial page direction is intact, but the model presentation orientation is wrong.

Observed in desktop, tablet and mobile screenshots:
- headset is viewed almost edge-on / top-down
- headband reads as a horizontal slab instead of an arch
- earcups read as two circular forms behind/below it
- cable rises vertically through the composition
- this persists across hero, form, mechanism and choreography

This is a 3D root/presentation transform issue, not a CSS/layout problem.

Do not redesign the page around this wrong orientation.

## QA navigator defect

The visual-QA scroll targeting also needs correction. Some requested scene captures landed in the previous section:
- desktop mechanism 0.25 reported active scene `form`
- desktop interaction 0.5 reported `choreography`
- desktop closing 0.45 reported `interaction`
- tablet interaction 0.5 reported `choreography`
- mobile interaction 0.5 reported `choreography`
- mobile closing 0.4 reported `interaction`

Those captures are not valid evidence for the requested chapter. The QA runner must navigate by deterministic section-local coordinates and assert the active scene before saving a screenshot.

## Exact next step

1. Test +90° X and -90° X presentation-root rotations against the real GLTF.
2. Choose the candidate that produces the upright headphone silhouette without fighting the skeletal animation.
3. Keep cable excluded from camera-fit bounds.
4. Fix QA section targeting and assert `data-active-scene` matches the requested capture.
5. Rerun desktop/tablet/mobile browser screenshots.
6. Inspect orientation, model/type collision, framing and dark-chapter lighting before any deployment.
7. Commit the chosen orientation only after the visual evidence passes.


## Progress recovered after the first GLTF checkpoint

Additional successful work was found in repository history after the connection gap:

- `df7cb8d1ebe07a400edd8b3a97375621a90afcfa` — enabled real scroll-scrubbed GLTF motion and removed cable clutter.
- `23688b33665dda9286ba9ae983f576fc4528b8df` — locked contracts for real animation scrub + cable-free presentation.
- `144fac4f3e24d5029f70f775967f69b0754ddb1b` — handled sanitized GLTF cable node naming.
- `96aaa26df3c84d1940c9174ca1db5957d441ce11` — corrected QA to use/assert true desktop/tablet/mobile viewport sizes.
- `6e735ae36114a195ce9daf67ffa7ffd894db0feb` — converted long sections into sticky editorial stages.
- `5e3b5cc5c36c11d70eceef1eccd9031195a9ecee` — added per-chapter 3D choreography and a restrained SkeletonHelper overlay in the Mechanism chapter.
- `3661633c43fc507447a080973f98e9d33aebb212` — tuned camera/model placement to resolve product/type collisions by chapter.

All of those commits had successful NOVA Visual QA runs.

### Successful pose scan

The later pose-scan bug was fixed by:
- `e824b8dc6b8a36066f47a86806fe9d8127f0cbdb`
- `cd50ec43c73e86bac946a0618d69ccaea2b41c1e`

Successful QA run:
- run ID `35839814535`
- artifact `nova-visual-qa`
- artifact SHA-256 `8d550f3fa327b2fd3d128eec8364f1eb0f5bdde0538b81f0eddc6b41afe6e975`

The real 27.71-second `ArmatureAction` was sampled at:
`0.00, 0.08, 0.16, 0.24, 0.32, 0.40, 0.48, 0.56, 0.64, 0.72, 0.80, 0.88, 0.96`.

Visual findings:
- strong upright/open product silhouettes: approximately `0.16–0.32`, `0.48`, and `0.64–0.80`
- folded/transition silhouettes: `0.00`, `0.40`, `0.88–0.96`
- `0.56` is a more oblique/transitional pose
- the original hero mapping was therefore sampling a weaker transition rather than the strongest recognizable product state

### Current design state

The latest verified editorial design is materially stronger than the rejected live draft:
- warm editorial hero/form/mechanism chapters
- deliberate dark choreography chapter
- sand interaction chapter
- black build/closing chapter
- sticky 100svh stages inside long scroll sections
- separate animation, camera, lighting and typography curves
- real responsive desktop/tablet/mobile framing
- skeleton visualization appears only as a Mechanism explanation layer
- model placement has been tuned to avoid headline collisions
- the cable is hidden from the showcase presentation because it visually read as detached/broken and distorted framing

### Current remaining task

Do not redesign the page again.

The next task is to replace the arbitrary chapter pose ranges with evidence-based source-animation ranges:
- Hero: strongest open/product-identifiable pose
- Form: clean upright pose with subtle source motion
- Mechanism: intentionally traverse a fold/open range so the source rig is visibly doing useful work
- Choreography: use a more dynamic but still legible open pose range
- Interaction: hold a stable product pose while pointer light/parallax carries the interaction
- Closing: compact, deliberate final pose that does not collide with copy

After that, rerun the existing exact GLTF browser QA and inspect screenshots before deployment.
