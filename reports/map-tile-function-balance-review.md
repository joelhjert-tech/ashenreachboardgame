# Map Tile Function Balance Review

This pass repaired correctness and clarity. It did not change Threat probabilities, difficulties, rewards, costs, topology, or route density.

| Ring | Tiles | Printed Threat symbols | No printed symbol | Multi-symbol tiles | Shop/recovery sites | Gate/route rules |
|---|---:|---:|---:|---:|---:|---:|
| Outer | 24 | 27 | 1 | 4 | 5 | 4 |
| Middle | 16 | 26 | 0 | 9 | 2 | 1 |
| Inner | 8 | 5 | 6 | 2 | 0 | 1 |
| Center | 1 | 0 | 1 | 0 | 0 | 1 |

## Outer ring

The Outer ring averages 1.13 printed symbols per tile and contains most services. Four multi-symbol tiles create visible pressure spikes, but route alternatives and five shop/recovery sites preserve learning and recovery space. No new permanent-loss risk was added.

## Middle ring

The Middle ring averages 1.63 symbols per tile; nine of sixteen tiles have multiple symbols. It is the clearest escalation in encounter density and includes the only recurring typed tile challenge at Ashen Chapel. Because symbols are slots, an existing matching blocker prevents an unnecessary duplicate draw.

## Inner ring

Printed-symbol density falls, but the ring’s pressure comes from high-difficulty registered board checks, Wound/Scar failure branches, clearances, and constrained final approach. Increasing every inner tile’s draw count would stack severe checks with extra fights and was not justified by this correctness pass.

## Route and repetition risks

- No topology changed, so no route became newly compulsory.
- Multi-symbol visits persist exact due lanes and cannot be farmed through reconnect.
- `EVERY_ARRIVAL` is appropriate for ordinary encounters/services; unique progress remains scenario-controlled.
- No route was found that forces a newly introduced repeated permanent penalty.

## Deferred balance questions

Human full-session evidence should decide whether the Middle ring’s nine multi-symbol tiles create excessive duration and whether Inner checks need more recovery access. These are recommendations only; no values changed.
