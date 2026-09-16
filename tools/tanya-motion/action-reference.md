# Tanya action reference revision

This revision authors the remaining named `TanyaSequence` actions against the
original SHP sheets, preserving the accepted Crawl keys. It reuses the existing
Meshy rig and texture; no paid API task or new body model was needed.

## Source observations and scope

The input is the local `art.ini` `[TanyaSequence]` and the 619 visible `tany.shp`
slots. Directional sheets were inspected across all eight views, with W/E side
and N/S front/back views used to resolve limb silhouettes. Single-direction
sequences retain their own frame order. Original images and inspection sheets
remain in ignored caches; the code and authored landmarks contain no source art.

| Actions | Source slots | Observations used for the reconstruction |
| --- | --- | --- |
| Ready / Guard | 0–7 | Arms and pistols lowered; narrower standing stance |
| Walk / Panic | 8–55 | Right pistol raised near shoulder, low left arm; passing feet on keys 2/5, extended stride on 1/4 |
| Idle1 | 56–70 | Turn through front/side silhouettes, raise/sweep a pistol and return |
| Idle2 | 71–85 | Lift and toss a pistol, visible airborne prop, catch and lower |
| Crawl / Prone | 86–133 | Accepted staggered legs and alternating support; Prone shares each facing's first key |
| Die1 | 134–148 | Initial flinch/raised arm, brief recovery, then collapse and hold |
| Die2 | 149–163 | Distinct tumble, seated stage, then collapse; not the same fall mirrored |
| FireUp | 164–211 | Two extended guns with alternating recoil |
| FireProne | 212–259 | One extended aiming arm, other elbow/hand supporting; unequal legs |
| Down / Up | 260–291 | Two asymmetric crouch/support poses, with authored entry/exit interpolation |
| WetIdle1 | 292–306 | Duck below the surface, hold lower, rise again |
| WetIdle2 | 307–321 | Forward pitch/dive and recovery, distinct from the first water idle |
| WetDie1 / WetDie2 | 322–361 | Different initial arm/torso struggle, raised arms and progressive submergence |
| Tread | 410–457 | Sculling arms and alternating submerged legs; no extended gun silhouette |
| Swim | 506–553 | Recover/extend both arms, sweep outward; narrow alternating kicks, replacing the earlier invented frog kick |
| WetAttack | 554–601 | One raised firing pistol while the other arm keeps sculling |
| Paradrop | 602 | Both hands raised; no extended pistols in this reconstruction |
| Cheer | 603–610 | Repeated raised-gun gesture in the fixed E reference |

The animation is reference-based authoring, not recovered motion capture or a
pixel-exact 3D solution. Hidden depth, hand identity in occluded views, the throw's
height/rotation and fixed death headings are inferred. The original labels do not
specify every physical detail. The hands still have no separate finger joints;
hiding or releasing a gun does not open the grip. Normal/roughness maps were not
returned by the original rigging service.

## Implementation and playback

`action-keys.mjs` records landmarks and action-specific prop visibility;
`poses.mjs` solves the bone targets. `props.mjs` attaches rigid pistols to the hand
transforms and authors release/catch/drop tracks. Body and two pistols share
position, normal and UV buffers; only the body uses the 24-joint skin. Total
geometry remains 29,827 triangles. The 28 clips include 21 distinct named actions,
five aliases/placeholders and two authored swim/tread transitions.

Exact source sample times are inserted alongside 60 Hz GLB samples. Looping and
held endpoints are separate. Down/Up place their two source keys at 1/3 and 2/3
of the clip, leaving room for continuous standing/prone entry and exit. The
source inspector and baker use the same `sourcePhase` mapping. The 12 fps source
clock is a preview convention, not verification of the original executable.

The Canvas atlas keeps all 619 source indices (515 named; 104 unmapped), followed
by 800 dense locomotion/transition frames. The scene still consumes only PNGs.
Water absorption is rendered on the authored character below the original map's
waterline; it does not generate terrain or water textures. The torso remap uses
the same eligibility and lighting in 3D and the baked mask.

## Verification and reproduction

Use the build and candidate-server instructions in [README](README.md).
`motion:test` covers skinning, contact gait, source-key asymmetry, props leaving
and returning to the hand, diving, deaths and transition endpoints.
`verify-actions.mjs` exercises all 515 named slots in the actual Canvas renderer,
checks separate original/HD frames and remap pixels, then visits all 21 actions
in the repeating map tour. `inspect-actions.mjs` renders paired contact sheets;
visual inspection remains necessary after numeric checks.

Runtime hashes and byte sizes are recorded in the motion manifest and HD
inventory. Unmapped ranges 362–409, 458–505 and 611–618 remain source-only; the
Die3–5 aliases do not count as new death animations.
