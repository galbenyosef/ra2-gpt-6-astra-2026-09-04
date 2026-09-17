# Local asset tools

Authored model inspectors, animation tooling and offline asset preparation. These
are independent development previews; the product Bootcamp lives in `src/bootcamp`.

```text
glb-compare/ + canvas-hd-preview/ -> original GLB / baked sprite comparison
tanya-motion/                    -> source-frame skeletal motion
four-assets/ + model-opt/         -> recovery, rigs and runtime optimization
environment/                     -> environment and GLB training-field inspector
batch-two/ + batch-three/         -> asset source records and regressions
```

The environment preview now imports the main-app verified catalog and Rhino
team-mask shader. Its existing routes and controls remain unchanged. Bootcamp
uses the shared catalog without depending on any preview port.
