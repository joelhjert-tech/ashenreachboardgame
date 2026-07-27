# TV UI Review Prototypes

## Lobby join presentation

The lobby join block now contains only the room code and QR code. Explanatory copy, the raw URL, connection state, and duplicate room-code labels were removed from the join block.

Development preview:

`/tv?tvPrototype=lobby-qr`

## Cinematic battle reveal

The battle prototype introduces three presentation stages:

1. Face-down operative and enemy cards enter the frame.
2. Both cards flip and reveal their identities.
3. The challenge seal activates and names the authoritative battle stat and the phone action.

Operative and enemy images use contained, aspect-ratio-safe frames. The reveal does not calculate dice, totals, modifiers, or outcomes and cannot trigger a gameplay command.

Development previews:

- `/tv?tvPrototype=battle-reveal&battleRevealStage=card`
- `/tv?tvPrototype=battle-reveal&battleRevealStage=identity`
- `/tv?tvPrototype=battle-reveal&battleRevealStage=ready`

## Signal Cartography sector art

Signal Cartography retains its original schematic topology and public-information boundaries. Every canonical sector now has a bounded environment thumbnail derived from that sector's existing Signal Theatre environment. The thumbnails are optimized 256 by 128 pixel runtime derivatives and do not replace or modify the source environment art.

Development preview:

`/tv?cartographyFixture=route`

## Shop establishments

The public shop carousel now selects its establishment background from the authoritative public shop category:

- Market: existing Brass Reliquary establishment.
- Forge Armoury: original industrial forge interior.
- Medicae Shrine: original surgical reliquary interior.
- Relic Dealer: original forbidden-object archive.
- Contract Broker: original oath-ledger chamber.

The carousel, buyer identity, public offer, stock, price, and transaction result remain server-projected. Private funds, private sales, unrevealed stock, and owner decisions remain off the TV.

Development previews:

- `/tv?tvPrototype=shop&shopCategory=market`
- `/tv?tvPrototype=shop&shopCategory=forge-armoury`
- `/tv?tvPrototype=shop&shopCategory=medicae-shrine`
- `/tv?tvPrototype=shop&shopCategory=relic-dealer`
- `/tv?tvPrototype=shop&shopCategory=contract-broker`

### Shop category emblems

The Host TV shop uses six original, code-native SVG emblems:

- Items: sealed field-supply crate.
- Equipment: forge shield with crossed hardware.
- Artifacts: suspended relic prism.
- Route Aids: signal compass over an authored route.
- Services: repair instrument over a service bench.
- Sell: salvage docket and outward trade mark.

Each emblem combines a non-colour silhouette with its own restrained activation colour. Available and selected emblems receive one short ignition glow; reduced motion displays the stable illuminated state immediately. Route Aids no longer reuse the Equipment emblem or appear again in the Services carousel.

Development previews:

- `/tv?tvPrototype=shop&shopCategory=market&shopView=categories`
- `/tv?tvPrototype=shop&shopCategory=forge-armoury&shopView=services`

## Host Phone setup

Host setup is split into two local presentation windows:

1. Choose Mode, including player count where relevant.
2. Choose Scenario, with Back and Confirm Scenario actions.

The existing authoritative setup configuration request is unchanged.

## Phone item and follower art

Inventory items and Followers now always render through the shared inspectable card-art component. Records without dedicated art use the canonical type fallback, and failed dedicated image requests still fall back through the existing asset frame.

## Inner Reach rule

Entering the Inner Reach now requires ownership of at least one Artifact item. Guardian Span Clearance is no longer created or checked. Canonical adjacency, pre-roll tier-transition timing, scenario locks, Nemesis Crown-Key rules, server authority, and arrival resolution remain unchanged.
