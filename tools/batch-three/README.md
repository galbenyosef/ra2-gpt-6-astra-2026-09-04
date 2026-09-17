# Third HD asset batch

Source evidence, reviewed ImageGen inputs, recoverable Meshy masters and local
runtime adaptation for the six requested additions to the training field.

```text
source.py -> .cache/batch-three/source (original art; never committed)
references -> downsample review -> Meshy submission -> archived master
master -> model-opt -> team masks / joints / mechanical parts -> runtime
runtime -> /canvas3d/ -> movement, attack, playback and color verification
```

The Grizzly's rules ID is MTNK but its image is GTNK. GI is E1 / GI /
GISequence. DRED uses two missile spawns and a DREDWO empty state, not a turret.
NAHAND is a 2×2 building with a separate construction SHP. Hidden geometry and
reconstructed motion must remain explicitly identified as adaptations.

Authored references and runtime assets are versioned on the feature branch.
Source images, comparisons and generation masters remain in ignored cache;
no original game art or public application deployment is included.

`road.mjs` builds the completed flat bend with the existing terrain material and
reviewed generated detail. `verify-road.mjs` reads its GLB and checks browser
placement and controls; `inspector.html` supports fixed orthographic source and
runtime views. Set `RA2_BROWSER_URL` for a different local port.
`freeze.py` records the exact image input/output hashes. Original generation
screenshots stay in `inspection/`; newer orthographic views use a separate folder
so reproducing inspections never overwrites the evidence sent to ImageGen.

![Road material joins](../../.cache/batch-three/verification/road-seams-top.png)
![Training-field placement](../../.cache/batch-three/verification/road-canvas.png)
![Orthographic camera comparison](../../.cache/batch-three/verification/road-views.gif)
