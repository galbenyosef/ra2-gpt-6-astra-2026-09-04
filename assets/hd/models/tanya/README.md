# Tanya runtime models

`30k.glb` is the earlier static, optimized material reference, documented by
`30k.json`; `prompt.txt` and `master-record.json` describe the external generation
archive. `tanya-actions.glb` shares geometry across a skinned body, two rigid pistols and 28 animation clips, with provenance
and limitations in `motion-manifest.json`. Both are lightweight runtime samples.

```text
external master -> 30k.glb -> external Meshy rig trial
                                 -> tools/tanya-motion -> tanya-actions.glb
                                                        -> Canvas atlas
```

The source-key revision includes per-action weapon visibility, toss/catch/drop,
asymmetric firing and water dives. See [action evidence](../../../../tools/tanya-motion/action-reference.md).
