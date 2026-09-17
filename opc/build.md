# Bootcamp build record

Implemented the authorized shared-state training mode with a verified catalog,
engine restrictions, first-screen entry, real GLB switching, authored terrain, failure
recovery and per-match disposal. Ordinary skirmish rules and model tools remain.

Reviewed the engine gates, supported automatic spawn paths, switching races, resource
ownership, game clock, input lifecycle and original-media publication boundary.
Regression fixes cover mesh picking, flying animation and live localization.
Validation details and limitations are in `docs/bootcamp-verification.md`.

Local development and commit only. No merge, deployment or push is included in this
completion because the existing parent upload rejection has not been cleared here.

## Local installer reuse

The preparation page now detects an existing local installer through Vite's
loopback-only dev/preview helper. Clicking it reads the local copy into the existing
verified browser conversion flow, including local retry and no remote-download
fallback. No original media enters Git or static build output.

Validation: 119 Node tests pass; root dev and subpath preview show the bilingual
button. A fresh browser context tested missing-file retry, mobile layout, the real
installer's SHA-256 verification, full conversion and playable Bootcamp with zero
Internet Archive requests. Evidence stays under `.cache/local-installer/`.

## Shared training map and camera

Bootcamp defaults to the 48×40 Asset Training Field assembled from nine existing
environment assets. The same map and engine survive 2D/3D switching. 3D offers
isometric, perspective and top presets with orbit, pan, anchored zoom and reset.
The default field avoids unmodeled Arctic Circle scenery; no new art was generated.

Reviewed projection/input boundaries, model headings, instancing and disposal.
All 121 Node tests pass. Production subpath camera, core, 64-direction motion and
lifecycle browser suites pass, including object/state identity, actual placement,
loading failure and continued orders. Dev camera checks also pass. The homepage
Lighthouse categories score 100; source-only build isolation passes with 21 authored
GLBs. Agent-browser verified bilingual controls and a real perspective/rotation.
Evidence and logs remain in ignored `.cache/bootcamp/`.
