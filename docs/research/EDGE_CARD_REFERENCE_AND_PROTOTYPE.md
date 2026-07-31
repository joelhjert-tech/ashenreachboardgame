# Ashen Reach Edge Cards

Status: **full runtime implemented**. Random awards, commit-value play, all twelve timing-specific abilities, owner-private reactions, reconnect persistence, and the TV animation are live.

## Original design goals

1. Keep Edge Cards scarce, private, and server-authoritative.
2. Give every card a reliable printed value from 1 through 6.
3. Make awards random so players adapt instead of assembling a chosen hand.
4. Limit use to one card per resolution so the shared TV moment stays readable.
5. Connect acquisition and capacity to existing Contract and Artifact progression.
6. Expose only a played card and its public result on the shared TV.

## Core rule

Each Edge Card has:

- an **Edge value** from 1 to 6;
- one original, precisely timed ability concept;
- one ability-strength band: Major, Standard, or Narrow.

The production rules support two server-authoritative modes:

1. **Commit value:** during setup for the active operative's enemy battle or Hazard check, lock the printed value as one die of the upcoming 2d6 roll. The server rolls the other die. The committed die cannot explode or be rerolled.
2. **Use ability:** play the card only when its phone control is enabled and resolve its typed effect.

The card is discarded after use. A player may use no more than one Edge Card during one resolution.

## Deck math

The first production deck contains 12 unique cards:

| Edge value | Cards | Authored ability strength |
| ---: | ---: | --- |
| 1 | 2 | Major |
| 2 | 2 | Major |
| 3 | 2 | Standard |
| 4 | 2 | Standard |
| 5 | 2 | Narrow |
| 6 | 2 | Narrow |

If playtests justify expansion, add new original cards evenly across all six values. Do not expand by duplicating existing cards.

## Hand and acquisition

- Start with exactly 1 random Edge Card.
- Base hand limit: 2.
- Complete 2 Contracts: hand limit becomes 3.
- Own at least 1 Artifact: gain another +1 limit.
- Maximum hand limit: 4.
- Completing a Contract awards the next random Edge Card if there is room.
- A full hand skips the award. There is no card-selection or discard interruption.
- An operative who completes a supported late join receives the same one-card random setup award.

## Authority and privacy

- The server owns deck order, awards, discard, reshuffles, hand-limit checks, timing legality, dice, and the one-card-per-resolution lock.
- Unplayed Edge Card IDs remain owner-private.
- The TV receives only the played card identity, value, actor, and a public-safe summary.
- A reconnect restores the exact hand, draw pile, discard pile, and pending commitment without drawing again.
- Rivalry opponents never receive another player's hand contents through projections or logs.
- An empty draw pile reshuffles the current discard pile into a new server-randomized cycle.

## Card set

| Value | Card | Live ability purpose | Tradeoff |
| ---: | --- | --- | --- |
| 1 | Cinderline Break | Prevent a pending battle Wound | Forfeit that battle's rewards |
| 1 | Black Relay Decoy | Greatly reduce one enemy's difficulty | Victory grants no Trophy |
| 2 | Ashglass Overclock | Large Challenge bonus | Failure adds a Wound |
| 2 | Closed-Circuit Aid | Strengthen one accepted helper | Must be committed before dice |
| 3 | Cinder Requisition | Convert limited Trophy value to Salvage | Converted value leaves the Trophy pile |
| 3 | Static Shunt | Ignore one non-Wound failure effect | The Challenge still fails |
| 4 | Echo Recast | Reroll one battle or Challenge die | Accept the second result |
| 4 | Isolated Channel | Moderate total bonus | Assistance is disabled |
| 5 | Quiet Ledger | Small shop discount | Final cost remains at least 1 |
| 5 | Known Scar Pattern | Small bonus against a recorded enemy family | Requires matching Trophy history |
| 6 | Low-Signal Discipline | Raise a natural 1 to 2 | Cannot trigger roll bonuses |
| 6 | Hazard Wake | Suppress one persistent Hazard modifier after its failed check until round end | Hazard remains attached |

Pre-roll abilities commit before the matching roll. Post-roll abilities open as an owner-private blocking reaction before the result is finalized. Only enabled controls on the owner's phone have authority.

## Implemented decisions

- Player-facing name: **Edge Cards**.
- Starting hand: exactly **1 random card**.
- Live eligible value commits: enemy battles and Hazard checks.
- Live ability timings: battle setup, Challenge setup, locked assistance, post-battle roll, post-Challenge roll, and paid shop action.
- Per-resolution limit: **1 card**.
- Acquisition: setup and every completed Contract, subject to hand capacity.
- First deck: **12 unique cards**, with two cards at each value from 1 through 6.

## Artifacts

- Production rules/data model: `src/game/data/edgeCards.ts`
- Historical executable design mirror: `src/game/prototypes/edgeCards.ts`
- Runtime integration tests: `src/server/__tests__/edgeCards.integration.test.ts`
- Standalone visual prototype: `prototypes/edge-cards/index.html`
- Runtime TV animation: `src/client/tv/SignalEdgeCardBurst.tsx`
- Generated card illustrations: `public/assets/cards/edge/`
- Card-art prompt and runtime catalogs: `src/game/assets/design/generatedCardImagePrompts.ts` and `src/game/assets/runtime/cardArtRuntimeCatalog.ts`
- Generated animation prompt catalog: `src/game/assets/design/edgeCardAnimationPrompts.ts`
