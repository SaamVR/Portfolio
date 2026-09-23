# NOVA — Recovered Visual Audit

Updated: 2026-09-23

## What failed in the rejected build

The earlier live Cloudflare version was rejected for valid visual/interaction reasons:

- headphone orientation/framing was wrong
- generic dark-tech styling
- repeated full-screen text blocks over a fixed canvas
- global whole-document scroll mapping rather than section-owned choreography
- hard-coded root rotation fighting the source animation
- global model rotation layered on top of the embedded FBX clip
- animation felt incidental rather than directed
- product did not dominate the composition
- result read as a generic AI-generated landing page rather than a creative-development showcase

## What the recovered rebuild improved

### Hero

Recovered browser audit showed:

- upright, readable headphone silhouette
- warm editorial background
- restrained technical grid / circular construction guides
- large `NOVA` wordmark anchored at the bottom
- compact project metadata instead of oversized generic marketing copy
- direct statement: scroll-controlled product film / no pre-rendered video

### Form chapter

- model stays large and central
- copy sits beside the product instead of fighting it
- framing follows the headphone body
- the page explicitly avoids framing around oversized cable/extreme bounds
- camera/source animation are treated independently

### Mechanism chapter

- source animation becomes the subject of the chapter
- real implementation facts are surfaced:
  - 37 animated bones
  - 14 skinned meshes
  - 459 source animation curves
  - 180 sampled poses
- animation scrub is tied to the original 27.77-second clip
- remaining concern: typography/model overlap must be checked at every keyframe

### Choreography chapter

- deliberate switch to dark background
- model remains the dominant visual object
- thesis: “Scroll is the director.”
- animation pose, camera orbit, light and typography are on separate curves
- warm product lighting gives a materially richer render than the rejected version
- remaining concern: top utility text can collide with the large heading/model at some widths

### Live-input chapter

- pointer movement shifts key light and restrained parallax
- interaction is supportive rather than a free-orbit toy
- model stays readable and upright
- remaining concern: headline is very large and must be collision-tested against the product on narrower desktop widths

### Mobile hero

- dedicated mobile composition was present
- product is centered before the editorial copy
- typography is stacked below the model
- remaining concerns:
  - large vertical gap between model and metadata can be tuned
  - NOVA wordmark is strong but must not consume too much first-screen height on shorter phones
  - subsequent chapters still require the same mobile-specific visual QA

## Mandatory QA before next presentation

- Verify the actual model is rendered, not a fallback.
- Verify orientation at every chapter midpoint.
- Verify the first and last animation poses.
- Verify section-local animation mapping on different viewport heights.
- Verify no headline/model collision at 1440, 1280, 1024 and 390 widths.
- Verify dark chapter swaps material/light treatment deliberately.
- Verify mobile chapter framing independently.
- Verify no Chromium runtime exceptions.
- Capture screenshots before presenting or deploying.
