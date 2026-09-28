# NOVA — Interactive 3D Product Experience

NOVA is the 3D / motion / creative-development portfolio piece in this repository.

The project demonstrates the progression from realtime 3D and VR interaction into browser-based product storytelling. It uses the original animated headphone asset rather than a procedural stand-in.

## Operating rule

All NOVA work from 2026-09-23 onward must be developed and verified in GPT runtime, then committed under `nova/` in this repository before or together with deployment.

Do not use the earlier generic dark-tech Cloudflare implementation as a design reference. It is retained only as a technical FBX integration fallback.

See `PROJECT_STATE.md` for the recovered checkpoint and `AUDIT.md` for the current visual findings.


## Canonical GitHub Pages publication

The final NOVA portfolio build is published from this repository under:

`https://saamvr.github.io/Portfolio/NovaAG/`

Development source remains under `nova/`. The root `NovaAG/` directory is generated publication output and must not become the development source.

Detailed release procedure:

`nova/GITHUB_PAGES_PUBLISH.md`

The release publisher is:

`.github/workflows/nova-pages-publish.yml`

Before publication, the exact accepted `nova-production-site` artifact must pass contract, build, exact-position browser, interaction, mobile, reduced-motion, fallback, and manual visual review gates. The final visual pass must also confirm the larger headphone framing and richer detail-oriented motion requested for the finished portfolio piece.

Publishing NOVA must not replace or modify the repository-root LeadFlow site or unrelated portfolio routes.
