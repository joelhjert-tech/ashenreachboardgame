# P19 movement-arrival option comparison

Both options use the same authoritative `PublicTileArrivalState`, public tile
artwork, mandatory-rule order, and blocked reason. `arrivalUi=overlay` remains
development-only.

| Criterion | Option A: Cinematic Tile Card | Option B: Immersive Tile Reveal |
| --- | ---: | ---: |
| Required-action visibility | 5 | 3 |
| Art readability | 4 | 5 |
| Lore readability | 4 | 4 |
| Public-information clarity | 5 | 4 |
| Scroll amount | 4 | 2 |
| One-handed use | 5 | 3 |
| Repeated-turn speed | 5 | 2 |
| Android Back behavior | 5 | 3 |
| Reduced motion | 5 | 4 |
| Accessibility | 5 | 3 |
| Physical S24 FE comfort | 5 | 3 |

## Decision

Option A remains the production default. It preserves the ordinary phone flow,
keeps the authoritative action and navigation model in familiar positions, and
avoids making every arrival a modal interruption on the short 338 × 601
physical viewport.

## P20 follow-up

P20 rendered both full variants from the same canonical multi-effect arrival
fixture in physical Chrome on the measured 338 × 601 S24 FE viewport. The
physical screenshots and recording are local-only under
`docs/qa/physical-p20/s24-fe/`.

The automated layout comparison measured Option A at 286.03px high and Option
B at 372.61px, with zero horizontal overflow in both. Physical inspection
confirmed the same hierarchy: Option A keeps the current rule and mandatory
blocker readable while using less vertical space; Option B gives artwork more
visual dominance but requires more scrolling. This reconfirms Option A as the
production default.
