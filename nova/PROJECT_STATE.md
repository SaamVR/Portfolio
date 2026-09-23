# NOVA — Durable Project State

Updated: 2026-09-23

## Repository

- Durable repository: `SaamVR/Portfolio`
- NOVA path: `nova/`
- Runtime constraint: GPT runtime only
- Do not use samvr/samai/other user devices for NOVA development unless the user explicitly changes this instruction.

## Production / historical deployment

A prior Cloudflare Pages project exists at:

- `https://nova-interactive-portfolio.pages.dev/`

Historical standalone NOVA repository:

- `SaamVR/nova-interactive-portfolio`
- Last durable FBX-integration commit: `4a38d2609cb1de579a45bd39489d0fbadef47bfd`
- Live deployment from that commit loaded the actual FBX successfully, but its visual design was explicitly rejected and must not be treated as an approved design.

## Original source asset

Recovered original package:

- `01- Headphone.zip`
- 13 files total: 1 animated FBX + 12 4K texture maps
- SHA-256: `3f977ef8d00f544f9322d2a87dc518e3a787ca165d86a5c196b9d59d1dbbcbbc`

FBX facts established during inspection:

- FBX version: 7700
- Main animation clip: `Noesis Frames`
- Duration: 27.7667 seconds
- 459 animation curves
- 153 animation curve nodes
- 37 animated bones
- 14 skinned meshes
- 5 material groups
- 180 sampled poses used by the compact runtime work

## Earlier FBX-integrated web source

Recovered archive:

- `NOVA-cloudflare-source.zip`
- SHA-256: `9bf035974611a3121f4582c8b44054c03b245aeaf096225407847edb6f432a98`
- Contains a Next.js / React Three Fiber / Three.js / GSAP starter plus:
  - the 2.43 MB animated FBX
  - 12 optimized 1024px texture maps
- This source is technically useful but visually superseded.

## Compact custom runtime work

A custom browser runtime was successfully derived from the FBX before the connection loss.

Recovered facts:

- Raw runtime asset: about 601 KB
- Gzip runtime asset: 200,525 bytes
- Historical gzip SHA-256: `9caf998a7ed4d99273ed469991fde23acc03dae0d7298c61c24424c5d1affb23`
- 180 animation frames baked from the original 27.77-second clip
- 37-bone hierarchy and 14 skinned meshes reconstructed
- Browser parser bug found: typed arrays were created at unaligned byte offsets, causing Chromium to throw `Float32Array start offset must be a multiple of 4`.
- That defect was identified for correction before the successful browser-audit checkpoint.
- A second rendering-quality issue was identified: the compact asset did not initially carry smooth vertex normals, causing faceted/triangulated shading. The rebuild path was upgraded toward smooth per-vertex normals skinned on the GPU.

The exact newest runtime source files did not survive the connection reset in the current GPT filesystem, so these facts are the durable reconstruction requirements rather than a claim that the latest source is already present.

## Recovered GPT-runtime visual checkpoint

The most recent verified rebuild moved away from the rejected template-like design to an editorial, model-first product-film layout.

Verified properties before the disconnect:

- WebGL rendered successfully in GPT runtime.
- Headphones were upright in the browser audit.
- Desktop and mobile layouts rendered.
- Six chapters resolved to separate scene states instead of one global scroll percentage.
- Model animation, camera choreography, lighting and typography were intended to run on independent curves.
- The real FBX/source animation was used as the motion source.
- Pointer motion was used for restrained light/parallax response instead of turning the model into a toy.
- A dark choreography chapter was introduced as deliberate contrast inside the otherwise warm editorial experience.

Recovered screenshot names:

- `desktop_hero.png`
- `desktop_form.png`
- `desktop_mechanism_a.png`
- `desktop_mechanism_b.png`
- `desktop_choreography.png`
- `desktop_interaction.png`
- `mobile_hero.png`

Additional recovered visual artifacts:

- `nova_keyframes_v2.png` — SHA-256 `84589f0701eb993cf2f6783fd7e94d2f0d8178445ad47a8de2696cd20be454f0`
- `nova_scene_midpoints_v2.png` — SHA-256 `5248f973ca91ba6fa91a9213c0e57985a28f46c3ece6cdab30ec0ccab20d4c97`

## Current visual direction

The accepted direction is not a generic “tech landing page.” It should feel like an interactive product film / editorial art-direction piece where the object owns the composition.

Core principles:

- Product-first composition.
- Warm off-white editorial chapters with deliberate dark contrast chapters.
- Overscale typography used compositionally, not as a template hero.
- Real FBX animation scrubbed intentionally by chapter.
- Camera choreography independent of model animation.
- Correct product orientation and readable silhouette at every keyframe.
- No fake product specifications or invented marketing claims.
- No decorative stock imagery.
- Motion should explain the asset and the implementation skill.
- Mobile requires its own framing rules, not a scaled desktop layout.

## Next execution checkpoint

1. Reconstruct the latest GPT-runtime page source from the recovered visual checkpoint.
2. Rebuild the compact runtime asset from the original FBX with aligned binary buffers and smooth skinned normals.
3. Use per-section local progress instead of hard-coded whole-document scroll percentages.
4. Reproduce the verified hero/form/mechanism/choreography/input scene framing.
5. Run browser audits at desktop and mobile sizes and capture keyframes.
6. Fix visual issues before showing the user.
7. Commit source + state to `SaamVR/Portfolio/nova/`.
8. Deploy only after the local browser audit passes.
9. Never overwrite the current production site with an unverified build.


## NOVA V2 current state — 2026-09-23

The historical sections above remain recovery context. The active implementation is now NOVA V2 on branch `nova/v2-integration`.

Current verified source:
`265c033a5d229ad9141d26040545621ea1336cc2`

Current V2 behavior:
- premium fictional headphone product landing page first
- technical portfolio proof only after the commercial journey
- continuous global scroll choreography
- real GLTF skeletal Fold/Open interaction
- Spatial/Focus/Ambient visual modes
- Adaptive/Transparency visual modes
- constrained desktop drag and mobile swipe inspection
- animated 3D hotspots attached to actual product components
- product-resolution CTA and visible Notify concept panel
- responsive desktop/tablet/mobile compositions
- reduced-motion mode and WebGL/GLTF fallback

Current verification:
- contracts green
- focused hotspot QA green
- full V2 browser QA green
- production bundle green
- exact production artifact SHA-256: `566a18e53bd2c0f850ee9a380f4ff6851af50ebfba4fc484e1cf60345a9238a4`

Rollback remains:
`backup/nova-interactive-v1-2026-09-23`

Next checkpoint:
1. deploy exact V2 artifact to Cloudflare preview using samvr only
2. verify public preview from GPT runtime
3. keep existing production untouched until preview acceptance
4. after acceptance, merge/promote V2 and deploy exact verified artifact to production
