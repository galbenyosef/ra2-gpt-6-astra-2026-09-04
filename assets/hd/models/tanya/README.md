# Tanya runtime models

`30k.glb` is the earlier static, optimized material reference, documented by
`30k.json`; `prompt.txt` and `master-record.json` describe the external generation
archive. `tanya-actions.glb` shares one mesh across 26 skeletal clips, with provenance
and limitations in `motion-manifest.json`. Both are lightweight runtime samples.

```text
external master -> 30k.glb -> external Meshy rig trial
                                 -> tools/tanya-motion -> tanya-actions.glb
                                                        -> Canvas atlas
```
