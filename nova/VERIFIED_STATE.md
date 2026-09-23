# NOVA — Verified GLTF Landing Page State

Updated: 2026-09-23

## Verified source

Primary implementation commit:

`01efaa798dc8614b043d9cfffefdc3c8d963a5e7`

Repository path:

`SaamVR/Portfolio/nova/site/`

The current NOVA landing page is the editorial, GLTF-native implementation. Do not revert to the historical standalone Cloudflare design.

## 3D runtime

- Three.js 0.180
- GLTFLoader + BufferGeometryUtils
- source clip: `ArmatureAction`
- source clip duration: 27.71 seconds
- 14 meshes
- 36 skin joints
- 3 animation clips
- 12 optimized WebP material maps
- presentation root uses the verified upright -90° X axis
- long cable mesh is hidden in the showcase presentation and excluded from framing
- source animation, camera, light, typography and pointer response are controlled independently
- Mechanism includes a restrained live skeleton overlay
- animation poses are chosen from a real clip pose scan rather than arbitrary percentages

## Evidence-based pose choreography

- Hero: `0.24 → 0.32`
- Form: `0.16 → 0.24`
- Mechanism: `0.32 → 0.48` (intentionally crosses the folding transition)
- Choreography: `0.64 → 0.80`
- Interaction: `0.70 → 0.74`
- Closing: `0.16 → 0.08`

## Final browser QA

Successful run:

- GitHub Actions run: `35848135317`
- tested commit: `01efaa798dc8614b043d9cfffefdc3c8d963a5e7`
- artifact ID: `10743994927`
- artifact SHA-256: `fa14db3a3fdff824051d2e27248736cd3b159584c68bd991dc8b8c350051950a`
- result: success
- browser/runtime errors: none

Verified viewports:

- desktop: 1440 × 1000
- tablet: 1024 × 768
- mobile: 390 × 844

Every requested capture reported:
- `model = ready`
- runtime = `ArmatureAction / 27.71 SEC / LIVE`
- requested scene = active scene

Desktop captured and visually reviewed:
- Hero
- Form
- Mechanism early fold
- Mechanism later/open
- Choreography
- Interaction
- Closing

Tablet captured:
- Hero
- Form
- Mechanism
- Choreography
- Interaction

Mobile captured:
- Hero
- Form
- Mechanism
- Choreography
- Interaction
- Closing

## Final visual review

The final verified render fixes the issues that caused the rejected draft:

- headphone is upright and immediately recognizable
- hero/form use strong open product poses
- folded pose appears deliberately inside the Mechanism story instead of the hero
- cable no longer cuts through the composition
- early Mechanism product is isolated from the headline
- Interaction product is isolated in the right construction field
- dark Choreography chapter has clear product/type separation
- Closing keeps the product secondary to the implementation story
- desktop and mobile use different art-directed framing
- sticky editorial stages keep long scroll chapters compositionally controlled
- no screenshot was accepted unless the requested scene was actually active

## Next checkpoint

The source is ready for a deployment preview.

Deployment must not overwrite the old production alias blindly. First deploy a preview from this verified source, check the public URL, then promote/replace the old NOVA deployment only after public-browser verification.
