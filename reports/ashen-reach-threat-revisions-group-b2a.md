# Ashen Reach Threat Revisions — Group B2A

## Scope and approval

Phase B2A implements the four stable IDs approved in `reports/ashen-reach-threat-duplicate-pattern-approval.md` at approval commit `73a8857`:

- `glass-tick-cloud`
- `locked-vault`
- `breach-halberd`
- `mudglass-sinkhole`

No card was added, removed, renamed, or moved between lanes. `shattered-barricade`, `suture-storm`, `glass-chime-swarm`, `spindle-static-squall`, the seventeen additional Heat-linked IDs, and the proposed +116-card expansion remain outside this implementation.

## Approved replacements

| Stable ID | Old duplicate pattern | Approved replacement rule | Runtime model |
|---|---|---|---|
| `glass-tick-cloud` | Forge 6; note on success; 1 Wound on failure | On failure, lose up to 1 Salvage | Typed `lose_salvage` with floor-zero result metadata |
| `locked-vault` | Forge 7; note on success; 1 Wound on failure | On failure, lose up to 1 Salvage | Typed `lose_salvage` with floor-zero result metadata |
| `breach-halberd` | Forge 6; note on success; 1 Wound on failure | On failure, move 1 sector clockwise on the same ring; if no legal sector exists, suffer 1 Wound | Existing typed `forcedDisplacement` lifecycle |
| `mudglass-sinkhole` | Grit 6; note on success; 1 Wound on failure | On failure, move 1 sector counterclockwise on the same ring; if no legal sector exists, suffer 1 Wound | Existing typed `forcedDisplacement` lifecycle |

The original success notes, stable IDs, card types, lanes, stats, difficulties, severities, resolution types, regions, rarities, tempos, artwork references, deck membership, and lore flavor remain in place. Resource tags now describe the revised typed consequence: Salvage for the Yellow losses and movement plus fallback Wound for the Red displacements.

## Floor-zero Salvage behavior

The server resolves each approved loss as:

`actualLoss = min(max(0, currentSalvage), requestedLoss)`

`resultingSalvage = max(0, currentSalvage) - actualLoss`

Both cards request exactly 1 Salvage. The authoritative outcome records requested loss, actual loss, resulting total, and stable source card ID. A resolved source-event ID prevents the same resolution from applying again after replay or reconnect. The phone sends no Salvage amount or payment choice.

Player-facing outcomes use the actual delta:

- `Lost 1 Salvage.` when one was available.
- `No Salvage to lose.` at zero.

Zero Salvage still resolves the card successfully as a failed check consequence with an actual loss of zero. It does not create a Wound, Scar, movement penalty, payment, shop transaction, Salvage Ledger trigger, mission-progress event, or completed-contract mutation.

## Forced-displacement lifecycle

Both Red cards use the existing bounded displacement schema: distance 1, same ring, failure still counts, and a single 1-Wound fallback. Canonical ring topology determines the destination; no screen-coordinate or prose parsing is involved. Clockwise/counterclockwise order is deterministic through the existing movement planner.

On failure, the server either:

1. creates one pending displacement with authoritative origin and destination; or
2. if no legal same-ring destination exists, applies the approved 1-Wound fallback immediately and resolves the card in place.

The phone cannot submit a sector. It may only accept the pending authoritative move or use Rift Anchor Spike when the exact pending source/reaction remains eligible. Acceptance revalidates source, seat, reaction, origin, and destination. Forced movement does not spend movement points, run voluntary route selection, or emit a normal `MOVEMENT_RESOLVED` action. One pending-arrival record carries the resolved destination into the existing sector-arrival pipeline without duplicating entry work.

## Phone and TV presentation

No Threat panel redesign or new focus mode was introduced.

- Phone Salvage results reuse the active resolution and result-delta presentation. The typed result contains requested loss, actual loss, resulting total, and source ID; displayed copy uses only the actual outcome and presents no payment control.
- Phone displacement reuses the pending-displacement prompt, authoritative accept action, stale-control removal, and owner-only Rift Anchor Spike action.
- TV reuses public result deltas and the displacement waiting/result presentation. It shows concise public outcomes without reaction IDs, inventory contents, or owner-only choices.

## Distribution impact

The deck remains 109 cards:

- Red: 26
- Blue: 35
- Yellow: 48

No lane membership, rarity, frequency, or deck reference changed. The change diversifies two Yellow failures into bounded resource pressure and two Red failures into position pressure without introducing a new card or increasing approved Wound quantity.

## Focused tests

`src/game/engine/__tests__/threatRevisionsB2a.test.ts` covers:

- exact identity, lane, stat, difficulty, text, and typed effect for all four cards;
- deck total and Red/Blue/Yellow distribution;
- semantic hashes for the two blocked duplicate cards and all seventeen additional Heat-linked cards;
- full, exact, and zero-Salvage cases for both Yellow cards;
- wrong-seat, stale-source, duplicate-source, reconnect, projection, Salvage Ledger, shop-progress, mission-ledger, Wound, Scar, and movement isolation;
- clockwise and counterclockwise pending displacement;
- deterministic destination, no movement-point spend, no voluntary movement event, invalid/stale reaction rejection, duplicate rejection, no-destination fallback, reconnect state, phone/TV final sector, and Rift Anchor Spike suppression.

Existing forced-displacement and Phase 1G Salvage tests were updated only to recognize the newly approved source IDs. Full regression commands are recorded in the delivery summary for this commit.

## Playtest watchlist

- Watch whether repeated Yellow floor-zero losses feel meaningful without feeling like hidden shop costs, especially for players already at zero.
- Confirm `No Salvage to lose.` reads as a completed consequence rather than a blocked action.
- Watch Red route pressure near ring chokepoints and verify the fallback Wound occurs only when topology truly has no legal destination.
- Verify players understand that forced displacement does not consume voluntary movement and that the failed test still counts.
- Exercise Rift Anchor Spike decisions at TV distance: the public table should know displacement was prevented without learning private inventory detail.
- Watch sector-arrival effects after accepted displacement for exactly-once behavior across reconnects.
