# Partial batch acceptance

Only the curved dirt road is a delivered runtime GLB. TREE01, GI, Grizzly,
Dreadnought and Soviet Barracks are reviewed image references, with no submitted
Meshy task, master mesh, runtime mesh, rig, team mask or model acceptance yet.

## Delivered road

- Source: temperate tile 177, `droadc02.tem`, original 2×2 TMP footprint.
- Output: `curved-road.glb`, 2 triangles, 2,982,380 bytes, embedded 1024×1024 PNG.
- SHA-256: `44cf9df689d0a907ac4b1b6f18a770c268ab8175ada5594f1c685650c87e48b0`.
- Archive: `.cache/batch-three/curved-road/master.glb`; this flat module's archive
  and runtime are identical. No high-resolution mesh or Meshy use is claimed.
- Recipe: source-guided ImageGen reference, exact ground quad and quarter-circle
  sampling of the existing straight-road material, blended generated worn detail.
- North/east road ports and adjacent grass boundaries compare with zero channel
  difference, excluding four corner texels. Browser inspection caught and fixed a
  central material mismatch that the endpoint-only test did not detect.
- Main Canvas 2D renderer and game rules remain unchanged. No SHP or remap-palette
  export was produced. Environment modules do not need a player-color mask.

## Verified locally

Service: `PORT=4193 node tools/environment/server.mjs`. Open
`http://127.0.0.1:4193/canvas3d/?actor=curved-road`.

`node tools/batch-three/verify-road.mjs` passed actual GLB bounds/attributes,
all 15 actor loads, expected 2×2 placement, environment rotation, pause/step and
browser texture decode. Top and oblique seam screenshots were visually inspected.
The original 14 selectable types and existing six environment types are retained.

With `RA2_BROWSER_URL=http://127.0.0.1:4193`, inherited `batch-two/verify.mjs`
passed 64 travel samples, the deliberately wrong 90-degree negative control,
existing attacks and move-resume, clip sampling, seek and camera controls.
`batch-two/verify-team-color.mjs` passed four Rhino views, with 14,228 / 14,292 /
14,543 / 14,214 changed pixels and zero changed pixels outside the embedded mask.
These are existing-unit regressions, not acceptance of the five pending models.

`npm run build`, source-only repository/build checks, diff whitespace checks and
redacted gitleaks directory scans passed. Agent-browser additionally exercised
pause, single stepping and environment turning without reported page errors.

## Remaining work and approval boundary

Automatic approval review rejected the first attempted Meshy upload because the
delegated task message was not accepted as trusted user authorization for that
external destination/payload. The rejected command did not start and no task ID
or submission marker exists. Explicit authorization for the five frozen images
was requested; do not retry until it arrives.

After authorization: submit each image once, archive masters, optimize and compare
each model, fit skeletal/mechanical motion and explicit player masks, integrate
the five missing models, then expand behavior/color checks to them. GI's deployed
sandbags and building damage/construction need actual adaptations; source mappings
alone do not implement those states. Versioning this partial batch does not
authorize the pending external generation or deploy it into the main game.
