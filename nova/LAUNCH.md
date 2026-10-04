# NOVA product launch

The `new` Pages branch presents seven product chapters: introduction, comfort,
sound, control, portability, inspection, and specifications. V4 remains at
`https://v4.nova-interactive-portfolio.pages.dev/` and is preserved in Git at
`preserve/nova-v4-20261004` (source commit
`3c9b2d49d650503d3d0f3f693070615392a2eeb1`).

## Motion direction

Each chapter has one camera move followed by a reading hold. The scroll mapping
uses measured chapter offsets rather than a guessed total page height. Camera
position, aim, scale and exposure use time-based damping. Folding uses a spring
that preserves velocity when reversed; inspection reset eases to its target.
Navigation lands after the incoming move. Reduced-motion mode uses settled
compositions and immediate control endpoints.

The product is centered in model space before orientation. Hidden cable meshes
are excluded from its bounds, preventing incorrect scale and rotation pivots.
The GLTF, textures and Three.js 0.180 runtime are included in `site/`.

## Product accuracy

NOVA is an independent design, not shipping commercial hardware. Specifications
disclose the Sony WH-1000XM6 benchmark and its battery/codec conditions. The page
does not invent orders, prices, measurements or performance certifications.

## Local preview and verification

Serve `site/` with a static server, for example from `nova/`:

```sh
python3 -m http.server 8080 --directory site
npm test
```

The checks need Node.js 22+ and Python 3. The optional CPU geometry check imports
the vendored loader; from the repository root, create its bare-module alias:

```sh
mkdir -p node_modules
ln -s ../nova/site/vendor node_modules/three
node nova/tools/verify-launch-model.mjs
python3 nova/tools/render-launch-poster.py
```

Poster generation also needs NumPy and Pillow. It renders the existing owned
model and textures into `site/assets/product-poster.webp`. Temporary framing and
geometry reports go to `/tmp/`. The framing check projects every visible skinned
vertex for seven chapters at five viewport sizes (35 compositions).

The static fallback retains chapters, codec/noise information and specifications;
controls that require live geometry are disabled. Dialogs trap keyboard focus,
restore it on close, and make the background inert.

## Publishing

Run on the authenticated samvr machine from the repository root:

```sh
npx -y wrangler@4.45.0 pages deploy nova/site \
  --project-name nova-interactive-portfolio --branch new
```

This publishes the preview alias `https://new.nova-interactive-portfolio.pages.dev/`
without updating the production or v4 branches.
