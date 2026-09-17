# Third HD batch

Authored references and runtime delivery records for curved dirt road, TREE01,
GI, Grizzly, Dreadnought and Soviet Barracks. The curved road is a completed GLB;
the other five remain reviewed image references awaiting external upload approval.
See [partial acceptance](acceptance.md) for measured results and remaining work.

```text
references/ -> exact PNG inputs, prompts and hash-bound visual reviews
source-record.json -> original identity/config/entry fingerprints
curved-road.glb + .json -> authored 2x2 module and measured delivery record
```

The flat road intentionally uses two triangles, embedded 1024² lossless PNG and
no Meshy generation. TMP 177 defines its bend; the current straight road supplies
compatible lane/edge materials. It appears in `/canvas3d/?actor=curved-road`.
`source-record.json` is a generated source inventory kept together despite its
length so GI frame mappings and original entry identities can be audited together.

Original SHP, VXL, HVA and TMP data remains in `.cache/batch-three/source`.
Reproduction tools live in `tools/batch-three`; masters must be retained locally.
