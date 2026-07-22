# Image handling specification

## Shared policy

- Resolve all canonical paths through CSS-free asset helpers.
- Runtime components use `HostImage`/shared image frames with explicit aspect ratio, `object-fit`, focal position, and approved fallback.
- Never stretch cards or characters to fill unrelated slots.
- Decode likely next-state art before transition; avoid decoding full catalogs on active play screens.

## Fit modes

| Asset | Fit | Focal rule |
|---|---|---|
| character/enemy portrait | cover | face/eyes in safe upper-middle zone |
| card | contain | entire frame visible |
| tile/board | cover | authored focal metadata |
| scenario center | cover | topology/sector identity remains unchanged |
| lobby background | cover | left-side text-safe zone preserved |

## Fallback

Missing art uses the approved Ashen Reach fallback, logs one development warning, preserves layout, and never shows a raw path or broken icon.

## Performance

Use responsive source sizes where available, stable dimensions to avoid layout shift, lazy loading for non-current catalogs, and no repeated decode on state remount.
