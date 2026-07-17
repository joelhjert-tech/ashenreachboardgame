# Ashen Reach Rule Conflicts and Open Decisions

## Conflict register

| ID | Priority | Area | Conflict / uncertainty | Runtime, UI, and test evidence | Player consequence / risk | Recommended canonical rule | Code change? |
|---|---|---|---|---|---|---|---|
| AR-R01 | Critical | Heat vs Scars | Older rules teach Heat as active personal pressure; current direction says Scars, while `heat` still exists in schema, projections, content, and compatibility tests | `docs/MVP_RULES.md`; character schema; scenario tests explicitly preserve heat at zero | Players may optimize or pay a resource the current design intends to retire | Canonical rulebook does not teach Heat; classify every remaining visible Heat use as legacy until separately approved | Yes, eventual migration/audit |
| AR-R02 | High | Attributes | Research prompt names Cunning, Strength, Understanding, Faith; runtime uses Command, Grit, Signal, Guile, Forge | character schema/content/roster tests | Incorrect formulas and unusable card language | Five runtime attributes are canonical | No |
| AR-R03 | High | Turn wording | Older docs use prepare/navigation/encounter variants and omit current sector/action/resolution staging | phase schema and reducer | New players cannot predict which phone tab unlocks | Use Start -> Navigation -> Sector -> Action -> Resolution -> Broadcast; UI may group them into plain-language steps | No |
| AR-R04 | High | Tie outcomes | No single repository-wide statement establishes ties for all tests, battles, and confrontations | separate reducer comparisons | Rules disputes and exploitable assumptions | State only each implemented comparison; add a global tie policy after design review | Possibly |
| AR-R05 | High | Equal-priority effects | Proposed hierarchy does not settle two effects in the same window; code often uses authored order or first eligible hooks | effect arrays, ability logs, item windows | Active player may expect choice where server uses fixed order | Authored sequence and server prompt order control; unmodeled equal priority is unsupported | Yes for general framework |
| AR-R06 | High | Reroll chains | Mirror and solo rerolls exist, but universal “a reroll cannot be rerolled” is not consistently encoded | reroll reducer paths/tests | Loop or timing disputes if more reroll items arrive | Each roll may use only prompts the server exposes; add explicit one-reroll-per-result rule before new content | Likely |
| AR-R07 | High | Threat vs challenge | Old content/docs blur hazards, anomalies, and Threats | tile challenge foundation vs Threat decks | Trophy farming or disappearing recurring dangers | Threats may be defeated/removed/trophied; tile challenges recur and never become trophies | No |
| AR-R08 | High | Contract completion | Old docs imply objective handler may award; runtime centralizes completion | `COMPLETE_CONTRACT` tests/reports | Duplicate rewards or stuck active slot | Progress satisfies objective; canonical completion pays once, records ledger ID, clears slot | No |
| AR-R09 | High | Mode labels | “Nemesis” has been used for both private rivalry and co-op relay; ruthless is internal | lobby mode audit and schemas | Players enter the wrong privacy/goal model | Expose Solo, Co-op, Rivalry only; name relay separately when product-ready | UI decision |
| AR-R10 | High | Loss counters | Global escalation, loss pressure, and scenario pressure appear related and were labeled similarly | loss-counter audit and projections | Players cannot tell what causes defeat | Keep Win Progress, Loss Pressure, Global Escalation distinct | Mostly presentation |
| AR-R11 | Medium | Movement failure | Old MVP says failure still moves and adds Heat; current movement includes several typed outcomes and Marrow reaction | movement reducer/server/tests | Wrong expectation about position or cost | Phone/TV authoritative result controls; do not promise a universal Heat result | No |
| AR-R12 | Medium | Inner progression | Design skeleton proposes ring behavior and Artifact readiness beyond what all routes enforce | canonical graph/gate items/scenario code | Players may believe every Artifact opens the core | Only shown legal routes and explicit gate prompts grant passage | No |
| AR-R13 | Medium | Carry limits | Source games have object/asset limits; no general Ashen Reach carry limit verified | schemas have gear arrays and slots, not general maximum | Players may discard needlessly | Equipped slots limit active gear; carried inventory has no published limit | Future design |
| AR-R14 | Medium | PvP | Reference games support attacks/theft; rivalry currently means private agendas, not general PvP | action union/projections | Players may attempt unsupported attacks or reveal private data | No general operative attack, theft, or trade action | Feature decision |
| AR-R15 | Medium | First eligible opportunity | Some abilities are recorded as first eligible, but there is no player-facing general definition | room ability helpers/tests | Missed prompts feel arbitrary | Define as first server-detected matching event in the stated turn/round window | No if wording matches |
| AR-R16 | Medium | Impossible effects | No universal player-facing partial-resolution rule; reducer behavior differs by typed effect | effect handlers | Players cannot predict “do as much as possible” | Never assume partial completion; server applies the typed rule or rejects/omits unavailable choices | Potential framework |
| AR-R17 | Medium | Shop availability | Older docs call Salvage transitional and deny first-class status | current character/shop schemas and tests | Rulebook understates economy | Salvage and authoritative buy/sell/services are canonical | No |
| AR-R18 | Medium | Reconnection windows | Core state persists, but browser QA is uneven across every reaction | reconnect tests and feature reports | A player may fear reload spends or repeats an item | Reconnect never itself spends; server state decides whether a prompt remains | More browser tests |
| AR-R19 | Low | “Artifact” vs “Relic” | Runtime has Artifact tier, charged relic category, and Relic dealer wording | content/schema/UI | Search and rule lookup friction | Artifact is item tier; Relic Dealer is a location/service name; “relic” is not a second item tier | Documentation only |
| AR-R20 | Low | Scenario override hierarchy | Proposed six-level hierarchy is sensible but not uniformly encoded | scattered scenario/character/card checks | Rules-lawyer uncertainty | Active scenario and explicit server prompt override general text; broader hierarchy remains a proposal | Design decision |

## Four-seat critique

### New Player

- Setup documents disagree on modes, host-phone ownership, and starting mission readiness.
- Older rules introduce Heat before Scars and use implementation phase names without explaining the required action.
- The most important missing teaching sequence is: roll movement, inspect destination, confirm route, resolve recurring challenges, then Threats.
- The rulebook should introduce the five attributes before any example and explain that the phone is the private decision surface.

### Optimizer

- Recurring challenges could be farmed if a future mission/reward matcher lacks completed-contract duplicate protection; current canonical completion prevents the known duplicate path.
- Undefined equal-priority prevention and reroll chains are the largest future combo exploit.
- Shop refresh/stock and contract-ledger trades need explicit server-enforced limits in player copy to prevent repeated-submission expectations.
- Stalling is constrained by global escalation, but the exact pressure cadence is scenario/mode-sensitive and should remain visible.

### Family Player

- Global Escalation, Loss Pressure, and scenario-specific pressure are too similar without a three-line glossary.
- “Resolution” and “broadcast” are useful internal phases but should be paired with plain-language descriptions.
- The software removes most arithmetic; examples should teach reading totals, not manual bookkeeping.
- Rivalry must say “keep your phone private” without encouraging table arguments over hidden agendas.

### Rules Lawyer

- Global tie, simultaneous-effect, impossible-effect, and reroll-of-reroll rules are not fully established.
- “First eligible opportunity” needs a deterministic definition.
- The proposed rule hierarchy is not safe to state as universally implemented.
- Some card pools are authored/validated without proof that every unique rule has a complete runtime resolver.
- Heat remains the clearest terminology contradiction.

## Ten highest-priority decisions

1. Finish or formally quarantine all player-facing Heat paths.
2. Define a universal tie policy for tests, battles, and confrontations, or document explicit per-system policies.
3. Define equal-priority effect ordering.
4. Define reroll-chain limits.
5. Decide the public future of `ruthless` and `nemesis_relay` mode labels.
6. Establish a general impossible/partial-effect policy.
7. Decide whether carried inventory needs a limit.
8. Complete an end-to-end reconnection matrix for every persisted reaction window.
9. Decide whether rivalry will ever include direct PvP/trade/theft.
10. Encode and document a total rule hierarchy only after tests prove it across scenario, character, card, sector, and general rules.
