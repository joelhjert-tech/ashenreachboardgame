# Contract completability audit

Checked 2026-07-11 against the current `content/cards/contracts` catalog and its authoritative objective, board, text-effect, shop-action, reward, and projection helpers.

## Scope and result

| Check | Result |
| --- | --- |
| Total contracts checked | 36 |
| Supported objective schema | Pass |
| Referenced sector, tag, space-text, and shop action | Pass |
| Reward schema/data | Pass |
| Reachable server trigger | Pass |
| Phone/TV objective formatting | Pass |

## Contracts by schema

| Schema | Count | Completion trigger |
| --- | ---: | --- |
| `defeatCount` | 11 | defeated enemy |
| `spaceTextResolved` | 19 | matching resolved board-text effect |
| `multiStopRoute` | 3 | sector visits matching authored ids/tags |
| `shopTransaction` | 3 | matching successful server shop action |

No impossible contracts were found. The only operational risk is ordinary content drift: a renamed board-text key, sector tag, or shop action would invalidate a contract. `contract.schema.test.ts` now checks those references as part of content validation.

## Reward coverage

Current rewards exercise trophies (5), notes (16), heat relief (9), followers (2), normal Equipment (12), and healing (2). The reward schema also validates `gain_salvage`; the lifecycle reducer applies it directly to the character Salvage ledger. Artifact-tier rewards remain restricted to Artifact-tier sources, including the relic dealer's three-completed-contract exchange.

## Projection coverage

Phone receives the owner’s completed-contract ledger and active objective progress. TV receives public active-objective progress and the completed-contract count, without ledger IDs.

## Manual QA

1. Complete three different contracts, visit a clear `risk-shop`, and trade once; confirm exactly three ledger IDs disappear and one Artifact appears.
2. Attempt the trade again before completing three further contracts; confirm it is disabled with the contract requirement.
3. Complete one contract of each objective schema in a real room and confirm phone and TV progress text matches the authoritative server state.
