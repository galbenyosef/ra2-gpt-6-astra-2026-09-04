<!-- Native original-art HUD layout, production presentation and lifecycle. -->
# Production sidebar

The shared 2D/3D HUD displays locally converted Allied/Soviet SHP atlases at their
native 168px width. No original media is imported into the application bundle.

```text
main.ts -> sidebar.ts     shell, native buttons, radar cover, power, resize/disposal
        -> production.ts availability, cards, queue/ready/progress and callbacks
skin.ts                  atlas frames, geometry and readiness contract
sidebar.css              native pixel sizes and control states
scripts/assets/sidebar-assets.json -> Python converter + TypeScript validation
```

Credits/top/radar/side1 precede whole 50px production rows. Each row has two 60×48
cameos with a 3px column gap. Side3/addon close the panel; the row calculation also
reserves the scroll arrows' full height. A ResizeObserver adjusts row count only.
Below 311px sidebar height the containing game region scrolls, rather than scaling art.

Normal/pressed/disabled frames are 0/1/2 where available. Tabs flash frame 3 for a
ready item in another category. Progress uses all 55 `gclock2` frames at 50% opacity;
ready labels and quantities remain localized DOM text. Power uses original colored
pips; the radar cover is frame 0 offline and the final frame online. The minimap
canvas retains the existing renderer's aspect ratio and pointer coordinate mapping.

Engine availability, single-building queues, unit queues, cancellation, placement,
repair/sell and support rules remain unchanged. Main owns command callbacks; the
sidebar owns presentation and disconnects its observer on exit. Deploy/base remain
in the top bar and support abilities beside the debug panel. The diplomacy icon
opens a read-only player/team table. Pause dialog styling is a separate phase.

See [acceptance and local screenshots](../../docs/sidebar-verification.md).
