# Reviewed generation inputs

These are authored ImageGen references, not completed 3D assets. The matching
`*.review.json` binds the visual review to the exact submitted image hash.

```text
original SHP/VXL/TMP (ignored) -> ImageGen -> native-size visual review
                                         -> accepted PNG -> Meshy
```

Selected inputs: [TREE01](tree01.png), [GI](gi.png), [Grizzly](gtnk.png),
[Dreadnought](dred.png), [Soviet Barracks](nahand.png).
`curved-road.png` is the top-down albedo for a deterministic 2×2 ground module,
based on temperate TMP ID 177 (`droadc02.tem`). Exact terrain edges are prepared
locally against the existing ground/straight-road modules.

The `*-v1.png` files are rejected drafts: GI had crossed legs; vehicle surfaces
mistook voxel sampling for physical blocks. The accepted revisions correct those
issues. Hidden anatomy, backs, panel seams and submerged volume remain inferred.
All candidates are authored approximations; review does not assert pixel identity.

`prompts.json` preserves actual built-in ImageGen prompts; `generation-record.json`
preserves exact output locations and input hashes. These generated records stay
together despite their size to keep the nine image calls auditable. Original evidence and
the native-size comparison board are in `.cache/batch-three`; never commit them.
External Meshy submission currently awaits explicit authorization after automatic
approval review rejected the first upload attempt. No remote task was submitted.
