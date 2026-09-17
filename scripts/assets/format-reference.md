<!-- Original conversion output schema, format references and native validation notes. -->
# Original asset formats

## Export schema

The generated `/assets/manifest.json` lists `sprites`, `cameos`, `ui`, `sounds`, and `music`. Each graphic includes its original filename. Sprite entries include:

```ts
interface OriginalSprite {
  src: string;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  columns: number;
  anchorX: number;
  anchorY: number;
  remapMaskSrc?: string;
  foundation?: [number, number];
  facings?: number;
  sequences?: Record<string, number[]>;
  originalFile: string;
}
```

- Frame `i` starts at `(i % columns * frameWidth, floor(i / columns) * frameHeight)`.
- Anchors are pixel coordinates of the ground/footprint center within each frame.
- `-snow` suffixes select original snow theater structure graphics.
- SHP palettes remain in their original colors. Palette indices 16–31 become the optional grayscale-alpha house-color mask. Shadow frames are composited below their original graphic.
- Original SHP infantry facings use `facingConvention: "ra2-shp"`: N, NW, W, SW, S, SE, E, NE in screen space. World +X projects SE, so it selects SHP facing 5. `spriteFacing` converts and rounds to the nearest facing for all actions; legacy manifests are recognized by `.shp` provenance. VXL/HD atlases use `world-xy` and must not receive the SHP offset.
- Infantry sequences preserve the original art.ini `[start, count, facingStride]` values. All gameplay frames, including walking, firing, crawling, and deployment where present, are included.
- Buildings include original idle/active machinery and closed roof layers. Their footprints come directly from original art.ini.
- VXL atlases contain 32 facings, starting with model +X pointing screen southeast, rotating counterclockwise in world XY as frame index increases. The converter preserves original voxel geometry, palette, and HVA transforms; lighting approximates the original engine using voxel surfaces.
- Sound/music entries have `{src, originalFile, text?}`. EVA keys use `allied_` and `soviet_` plus original event names in lowercase. Other sound keys retain original BAG identifiers. `soundEvents` maps original sound.ini event names to their clip IDs, and `unitVoices` maps original rules.ini unit IDs to selection/movement/attack events. The full original BAG is converted. Music includes `hm2`, `grinder`, and `industro`.

## Format references

- MIX directory layout and RSA public modulus: https://github.com/OpenRA/OpenRA/blob/bleed/OpenRA.Mods.Cnc/FileSystem/MixFile.cs and the associated `BlowfishKeyProvider.cs` (format reference; no game/simulation code imported).
- SHP TS format: https://moddingwiki.shikadi.net/wiki/Westwood_SHP_Format_(TS)
- VXL/HVA binary structure: https://github.com/sh4faq/Red-Alert-2--Modding-Guide/blob/master/01-VXL-HVA-Format.md
- Audio IDX/BAG structure: https://ppmforums.com/topic-46489/audioidxbag-format/

## Original developer-pipeline validation

- Every playable unit/building definition resolves to an original sprite and cameo.
- Every manifest image/audio path exists.
- Construction yard, snow factory, original menu map, loading artwork, and 32-facing Grizzly tank atlas inspected visually.
- Native CLI audio conversions completed successfully; FFprobe verified the construction-complete voice and Hell March 2 track. The browser pipeline emits PCM WAV instead of MP3; its current verification status is recorded in `docs/verification.md`.

The main `overlays` collection contains original resources, bridges, walls and tree art for each theater. Numeric aliases such as `snow:102` use the native map overlay ID. Preserve `overlayFrame` when drawing bridge segments: frames 0 and 2 can deliberately be blank. Ore/gems use original resource palettes (`snow.pal`, `temperat.pal`, `urban.pal`); trees/bridges use isometric palettes.

Original sidebar pieces use `sidec01-*` (Allied blue/silver) and `sidec02-*` (Soviet gold/silver). The menu contour map is `ui.mnscrnl`; the original Kirov loading artwork is `ui.glsl`. Other legacy PCX files in the original distribution include Tiberian Sun leftovers and are not suitable substitutes for RA2 menu art.
