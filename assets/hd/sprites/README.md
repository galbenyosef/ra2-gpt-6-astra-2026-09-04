# Authored Canvas sprite atlases

`manifest.json` maps runtime sprites, packed frame rectangles and foot anchors.
Each image has a corresponding `-remap.png` team-color mask. Tanya is baked from
the skinned action GLB; vehicles/buildings retain the existing authored sprites.

```text
tanya-actions.glb -> tany.png + tany-remap.png -> manifest.json -> Canvas renderer
legacy static models -> mtnk / gacnst / nanrct atlases and masks
```

The generated manifest exceeds normal text limits because it stores 619 packed
rectangles. Tanya's unnamed source slots use original-art inspection; water-death
end frames can be empty after submerging. No original game artwork is stored here.
