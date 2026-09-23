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
