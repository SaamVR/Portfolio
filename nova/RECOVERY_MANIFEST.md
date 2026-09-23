# NOVA — Recovery Manifest

Updated: 2026-09-23

This manifest records what was found after the connection loss.

## Files currently present in GPT runtime

### Original source package

`/mnt/data/01- Headphone.zip`

- Size: 65,200,679 bytes in the current mounted runtime
- SHA-256: `3f977ef8d00f544f9322d2a87dc518e3a787ca165d86a5c196b9d59d1dbbcbbc`
- Contains the original animated FBX and 12 full-resolution texture maps.

### Earlier FBX-integrated web source

`/mnt/data/NOVA-cloudflare-source.zip`

- SHA-256: `9bf035974611a3121f4582c8b44054c03b245aeaf096225407847edb6f432a98`
- Contains the Next.js / R3F source, real FBX and optimized textures.
- This is a technical fallback only; its design is rejected.

### Recovered visual-analysis artifacts

- `/mnt/data/nova_keyframes_v2.png`
  - SHA-256: `84589f0701eb993cf2f6783fd7e94d2f0d8178445ad47a8de2696cd20be454f0`
- `/mnt/data/nova_scene_midpoints_v2.png`
  - SHA-256: `5248f973ca91ba6fa91a9213c0e57985a28f46c3ece6cdab30ec0ccab20d4c97`

Recovered browser-audit screenshots are mounted in the current GPT runtime under the prior session snapshot path and include:

- `desktop_hero.png`
- `desktop_form.png`
- `desktop_mechanism_a.png`
- `desktop_mechanism_b.png`
- `desktop_choreography.png`
- `desktop_interaction.png`
- `mobile_hero.png`

A compact local contact sheet was reconstructed at:

- `/mnt/data/nova_visual_checkpoint_small.jpg`
- SHA-256: `335eada3a2c6f3b304ce49565f464552a1f316bc1b19eaf0f0479f57ff5a8c06`

## Files not currently present after the reset

The following were verified before the disconnect but are not currently present as authoritative files in the active GPT filesystem:

- final compact runtime source code
- `/mnt/data/nova_model.nva.gz`
- the latest rebuilt page source that produced the recovered browser-audit screenshots

Historical properties of the missing compact runtime are recorded in `PROJECT_STATE.md`.

## Recovery rule

Do not treat absence of the latest source as permission to return to the old Cloudflare design.

Reconstruction must use:

1. the original FBX package as source truth for geometry and animation
2. the recovered browser screenshots as visual truth
3. `PROJECT_STATE.md` as technical truth
4. `AUDIT.md` as the quality gate

Every reconstructed source checkpoint must be committed under `nova/` before further risky iteration.
