# NOVA GLTF Asset Manifest

Updated: 2026-09-23

## Current web asset

- Optimized GLTF: `headphones-web.gltf`
- GLTF SHA-256: `1433717c7c8af76608bec756fb42e6e448c1515c106eca8c3124bdd118be6049`
- GLTF bytes: `1,862,871`
- External maps: 12 × WebP, max dimension 1024px
- Exact deploy asset ZIP SHA-256: `b7ab75e30bb2b8a665b95e6b2105172892d7ec0c02c7e395fd8ce427add92ecc`
- Exact deploy asset ZIP bytes: `1,382,987`
- Google Drive recovery file ID: `1u3aW-gZRWH_4rCTYJaVaKUPQH0kITLOr`
- GitHub Actions cache key: `nova-gltf-assets-v1-b7ab75e30bb2b8a665b95e6b2105172892d7ec0c02c7e395fd8ce427add92ecc`

The Drive object is a durable private recovery copy. The temporary OAI download URL used to seed Actions is intentionally not the durable identifier.

## Source facts

- 14 meshes
- 1 skin
- 36 skin joints
- 3 animation clips
- Main clip: `ArmatureAction`
- Main clip duration: 27.708330154418945 seconds
- Main clip channels: 42
- Geometry, skin and animation buffers are embedded in the GLTF
- The long cable mesh `Circle.013_0` is rendered but excluded from camera-fit bounds

## Rebuild

Use `../tools/build_gltf_assets.py` with the original exported GLTF and `01- Headphone.zip` to regenerate the 1024px WebP asset set and corrected material assignments.
