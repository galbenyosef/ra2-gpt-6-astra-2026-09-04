# Crawl source-key trial

This small revision changes Crawl and its shared first-frame Prone pose. Other
animations retain the previous draft and have not gained source-specific prop
review. No new Meshy call or replacement body model was required.

## Evidence and authored choices

The locally installed `art.ini` defines Crawl as `86,6,6`; Prone reuses each
facing's first Crawl frame. N 86–91, W 98–103 and S 110–115 were inspected at
nearest-neighbour magnification, with the other five facings checked on the sheet.
The legs are staggered, and the leading arm/support side changes across the six
frames. `crawl-keys.mjs` records six individual inferred 3D landmark sets, rather
than starting both legs from the same symmetric sinusoid. Hidden depth is still
inferred; frame-index alignment is not a pixel-exact reconstruction.

The visible hand silhouette lacks the clearly extended pistol/muzzle silhouette
seen in W-facing FireProne 224–229. This trial therefore hides extended pistols in
Crawl/Prone. That does not prove the original hands are empty in all directions.
The six observations should be reviewed before applying any policy to swimming,
idle or other actions. The Meshy hands retain their closed grip and have no finger
joints; they are not a newly rigged open-palm hand.

## Reproduction

`build.mjs` now calls `mesh-regions.py`, requiring Python and Pillow. Set
`RA2_PYTHON=/path/to/python` if the default `python3` is unsuitable. The script
reads the source rig's rest-space positions, weights and embedded texture. It
separates 1,292 dark pistol triangles at the hanging hands, without changing the
29,827 total triangles, UVs or weights. The two mesh parts share attribute
accessors and the same skin. GLB scale tracks hide the prop mesh in Crawl/Prone
and restore it for other clips. No source master is modified.

`_TEAM_MASK` records torso eligibility. `team-material.mjs` additionally gates
olive cloth pixels, preserves shading, and supplies both the interactive 3D vest
and the Canvas remap mask. The former runtime mask applied armature scale twice
when measuring height, so it could miss the vest. Eligibility is now authored in
the source rig's measured rest coordinates. The 3D page has a team-color picker;
Canvas uses the player's selected color. The custom GLB attribute needs the
viewer/material integration for arbitrary recoloring in other applications.

Build, then use the candidate local viewer's bake button as described in README.
`crawl-reference.test.mjs` checks all six staggered poses, prop state and mask
presence. The prior GLB fails all three checks. `verify-crawl.mjs` exercises the
actual browser, six source slots, visible prop switching, red/blue appearance and
all 48 Crawl remap rectangles. Its images stay in `.cache/crawl-inspection/`;
original images and screenshots must not be committed.
