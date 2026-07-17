# Heat Retirement H6A — False Route Procession approval

Status: report-only approval. No gameplay or content definition changes are made in H6A.

H6B implementation status: **IMPLEMENTED**. The approved rule is now live through a narrow persisted owner destination-choice stage followed by the existing forced-displacement reaction and arrival lifecycle. See `reports/heat-retirement-h6b-false-route-implementation.md`.

Checkpoint: `56af999 feat: retire severe wound heat threats` on `phase/heat-retirement-1x`.

## Decision

`false-route-procession` is **APPROVED** as an owner-chosen forced displacement between the legal clockwise and counterclockwise adjacent sectors on the operative's current ring.

On final failure, the server derives the two distance-1 same-ring candidates from the canonical board graph, applies current movement-step legality, removes blocked candidates without skipping past them, removes duplicates, and persists the ordered candidate set. The owner must confirm one surviving candidate. One surviving candidate is still presented for confirmation; after selection locks the destination, the normal forced-displacement reaction window remains available. With no surviving candidate, the operative remains in place and the consequence completes without a Wound or other substitute penalty.

The approved player-facing rule is:

> If you lose, move 1 sector clockwise or counterclockwise on your current ring. Choose from the legal destinations. If only one is legal, move there. If neither is legal, remain in place.

This is forced displacement, not voluntary movement, relocation, a movement-roll modifier, a route restriction, or a direct teleport. It spends no movement allowance and cannot enter another ring or the center.

Implementation readiness: **IMPLEMENTED WITH NARROW TYPED EXTENSION**. H6B added the approved owner-choice state and reused the existing forced-displacement reaction, arrival, and replay systems without map metadata or topology changes.

## 1. Current card inspection

| Field | Current authoritative content |
|---|---|
| Stable ID | `false-route-procession` |
| Display name | False-Route Procession |
| Lane | Yellow |
| Card type | hazard |
| Authored region / rarity | outer / common |
| Severity | 2 |
| Test | Command 7 |
| Success | `gain_note`: “You named the false road aloud and broke the procession.” |
| Failure | `gain_heat 2` |
| Reward / Trophy | no Salvage, Trophy points, or Trophy Pile entry; success retains only its authored note |
| Lore identity | route ghosts perform the shortcut the operative wanted to believe was real and beckon with backward hands |
| Runtime failure handling | the legacy Heat effect is accepted only for compatibility and is mechanically inactive |
| Graph frequency | five references, not five guaranteed appearances |

The five current graph references are all on the middle ring despite the card's authored `region: outer` metadata:

| Sector | Threat-deck entries | Per-deck reference share |
|---|---:|---:|
| `middle_shard_sprawl` | 10 | 1/10 |
| `middle_rivalry_pit` | 8 | 1/8 |
| `middle_webglass_breach` | 9 | 1/9 |
| `middle_anomaly_well` | 9 | 1/9 |
| `the-salt-archive` | 6 | 1/6 |

Those shares are exposure warnings, not draw probabilities: encounter draw counts, lane ordering, deck consumption, and soft exile also affect actual appearance. The stable definition may recur across those sector decks. The current runtime contexts are therefore ordinary Threat resolution in those five middle-ring sectors; H6A nevertheless defines all rings and the center so the rule is total and does not depend on today’s deck placement.

There are two authored/runtime mismatches. First, `gain_heat 2` communicates a consequence that runtime deliberately does not apply. Second, outer-region metadata disagrees with the five canonical graph placements, all of which are middle. H6A retires only the first mismatch in approval; it does not authorize changing region metadata or graph membership.

The intended pressure is navigation control loss: a failed Command test makes the operative follow one of two false same-ring routes. The owner retains a bounded choice of which bad route to take, while remaining unable to stay voluntarily, cross rings, or choose an arbitrary destination.

## 2. Intended identity and distinctness

Selected identity: **player-selected bad route expressed as involuntary same-ring redirection**.

This identity best fits the Yellow lane's route manipulation, the lore's tempting shortcut, the current graph, and the need to avoid another deterministic push. It is not approved merely from the title: the bounded owner choice creates an actual navigation decision without permitting a normal route plan or topology edit.

| Overlap | Existing identity | H6A distinction |
|---|---|---|
| `breach-halberd` | deterministic clockwise displacement 1; Wound fallback | owner chooses between surviving clockwise/counterclockwise candidates; no Wound fallback |
| `mudglass-sinkhole` | deterministic counterclockwise displacement 1; Wound fallback | choice, not a fixed direction; no Wound fallback |
| `suture-storm` | Wound, then deterministic counterclockwise displacement; Wound fallback | no Wound and one bounded destination choice |
| `route-splice` | deterministic clockwise displacement 1; Wound fallback | false-route choice is the card's pressure rather than a fixed push |
| `spindle-static-squall` | next normal movement roll −1, minimum 1 | immediate forced displacement; no roll or allowance modifier |
| normal forced displacement | one server-derived endpoint | same arrival/reaction semantics, but a new server-derived candidate set and owner confirmation |
| recall | status/operative lifecycle | no recall command and no recall destination |
| scenario relocation | scenario-owned endpoint | no cross-ring or scenario-selected endpoint |

The card deserves its own slot because it is the only approved Threat where the owner must choose which of two authoritative false routes becomes the forced destination. The choice can soften harm but cannot cancel the movement unless an eligible reaction prevents it.

## 3. Existing movement-model audit

| System | Authority and client input | Topology / replay behavior | Suitability |
|---|---|---|---|
| Normal movement roll | server rolls and derives allowance; phone requests a roll only | persisted movement result; one roll per turn | not used by this card |
| Movement allowance | server stores the final value, including typed modifiers | exact-distance route generation consumes it only for normal movement | unchanged and unspent |
| Exact-distance route generation | server builds routes; phone receives projected routes and may return a server-issued route ID/revision | canonical ring order plus authored transition edges; stale route revisions rejected | candidate-generation patterns are reusable, but this consequence is not a normal route |
| Legal destinations | server checks adjacency, region gates, mode gates, destination requirements, and notes | submission is revalidated against current state | reuse the movement-step legality predicate |
| Same-ring clockwise/counterclockwise | server derives neighbor from canonical node ring and authored ring order using `+1/-1` | no screen-coordinate inference; center has no ring neighbor | reuse for the two candidates |
| Inward/outward movement | server recognizes explicit authored cross-ring connections and their restrictions | not inferred from geometry | excluded from H6A candidates |
| Forced displacement | server currently derives one same-ring destination for one fixed direction; phone can only accept or prevent | persisted reaction/source event, stale-origin validation, Rift Anchor suppression, completion ledger, reconnect reconstruction | reuse reaction, commitment, arrival, and dedup semantics; extend pending state for a candidate choice |
| Recall | Wound/status lifecycle owns recall; it is not voluntary movement | no route selection | excluded |
| Scenario relocation | scenario lifecycle owns its destination and triggers | source-specific and not a normal route | excluded |
| Route preview / confirmation | server projects legal routes and revisions; phone previews and submits only issued identities | server revalidates route and revision | UI pattern is informative, but normal movement state must not be reused as if this spent allowance |
| Tile-entry pipeline | forced displacement schedules one persisted arrival, then enters the normal sector phase | on-arrival tile challenges resolve in authored order, then ordinary encounter exploration proceeds once | reuse unchanged |
| Movement reactions | Rift Anchor Spike is server-authorized only for approved forced-displacement sources and spends one exact charge | reaction identity/source identity persist and replay is rejected | approve `false-route-procession` eligibility after candidates exist |
| Reconnect reconstruction | persisted pending displacement and completed source-event lists reconstruct owner/public state | completed effects do not reopen | extend to candidate list and chosen destination |

The current schema cannot encode H6A as written: `forcedDisplacement` requires a single `direction`, `distance: 1`, `sameRing: true`, and its pending state requires one destination. The authenticated phone intent carries only a reaction ID. This is why the approval is a new narrow destination-choice lifecycle rather than a content-only switch.

## 4. Option evaluation

Severity uses the H6 target where routine Threats normally remain 1–3.

| Option | Severity | Avoidability / variance | Complexity | Decision |
|---|---:|---|---|---|
| A — deterministic same-ring displacement | 2 | Rift Anchor can prevent; destination danger varies | low | REJECT: becomes another clockwise or counterclockwise displacement card |
| B — owner chooses between two legal adjacent destinations | 2 | Command success avoids it; Rift Anchor can prevent; owner can reduce destination harm but must move | medium-high | **SELECT** with exact same-ring candidate rules below |
| C — rival chooses | 2–3 | highly mode- and opponent-dependent | high | REJECT: inconsistent solo/co-op fallback and unnecessary grief/collusion pressure |
| D — cancel remaining voluntary movement | 1 | only meaningful during movement | low | REJECT: this Threat resolves after sector arrival, outside an active voluntary movement allowance |
| E — next movement roll −1 | 1–2 | delayed and usually avoidable only by timing | low | REJECT: duplicates `spindle-static-squall` |
| F — next-route restriction | 1–2 | can be irrelevant or leave awkward route sets | medium-high | REJECT: delayed persistent state is less direct and requires additional route-restriction explanation |
| G — persistent sector distortion | 2–3 | can affect another operative and scale with traffic | high | REJECT: introduces sector persistence and multiplayer ownership without need |
| H — remove Heat without replacement | 1 | fully avoidable consequence | very low | REJECT: leaves a Command 7 common hazard with no failure pressure and abandons its route identity |

The selected model cannot force center confrontation, cannot cross rings, cannot bypass a preparation gate, and moves exactly one edge. Its main balance risk is beneficial redirection: the owner can sometimes select a shop, objective, or safer encounter. That is accepted as bounded Yellow agency because arrival still resolves through the forced-displacement sector pipeline and the card has no success reward beyond its existing note. The five graph references justify retaining severity 2 rather than adding a Wound fallback.

## 5. Candidate-generation and topology rules

1. Source sector is the acting operative's authoritative current sector when the final failed `false-route-procession` result commits.
2. Read the source node's canonical ring metadata. Do not use `x`/`y`, art position, or prose.
3. If the source ring is outer, middle, or inner, derive exactly the distance-1 clockwise neighbor and distance-1 counterclockwise neighbor from canonical ring order.
4. Exclude the current sector. Exclude all inward, outward, branch, shortcut, and center connections even when adjacent in the broader board graph.
5. Test each derived neighbor with the existing authoritative movement-step legality rules at creation time. A blocked neighbor is omitted; it is not skipped over to reach the next legal sector.
6. Scenario-tagged and shop sectors remain eligible if they are otherwise legal; no special beneficial/dangerous-sector filter is introduced.
7. Remove duplicate destination IDs while retaining deterministic order: clockwise first, counterclockwise second.
8. Persist the source sector, ordered candidates, acting seat, source resolution, source event, and state needed for revalidation. After selection, persist the existing displacement reaction identity with the locked destination.
9. Before commitment, revalidate source ownership/origin and the submitted destination against the current authoritative candidate rule. The phone cannot submit any destination absent from the projected list.

Topology cases:

- Outer ring: choose between legal distance-1 outer-ring neighbors.
- Middle ring: choose between legal distance-1 middle-ring neighbors. This covers all five current graph placements.
- Inner ring: choose between legal distance-1 inner-ring neighbors; a gate-blocked neighbor is omitted.
- Center: no same-ring neighbor exists, so remain in place with no additional penalty.
- Adjacent to center: the center connection is ignored because it is cross-ring; only same-ring candidates qualify.
- Branch or asymmetric connector: ignore cross-ring/shortcut branches; canonical ring neighbors still define the candidate set.
- One legal neighbor: present that one destination and require confirmation before the existing forced-displacement reaction opportunity.
- No legal neighbor: create no choice/reaction window; remain in place and complete the failed Threat once.

The current graph has 24 outer, 16 middle, 8 inner, and 1 center node. Every current outer and middle node has two canonical same-ring neighbors. Current movement requirements can reduce an inner candidate set to one; the center always produces zero. H6A relies on existing ring metadata and needs no new topology metadata.

## 6. Classification and resolution semantics

- Movement classification: forced displacement.
- Trigger: final authoritative failure of the Command 7 hazard.
- Distance: exactly 1 graph edge.
- Direction: owner chooses clockwise or counterclockwise indirectly by choosing one server-issued destination.
- Destination authority: server-generated owner choice; server revalidates at submission.
- Movement allowance: not spent, reduced, rerolled, or opened.
- Voluntary movement: no. It does not trigger voluntary-movement items or abilities and does not count as voluntarily choosing the destination.
- Rift Anchor Spike: eligible against the whole displacement consequence. It prevents the move, spends one valid charge once, closes the candidate choice, and marks the source event resolved.
- Other reactions: only reactions already typed for pending forced displacement may be offered. No general item or character-action window is created.
- Timing: derive and persist candidates first; the owner selects one candidate; lock and revalidate that destination; open the existing forced-displacement reaction window; then prevent the entire displacement or move once and schedule one arrival.
- No timeout: existing local-game pending-choice behavior waits for the owner. Reconnect restores it. No host, rival, or random fallback chooses for an absent owner.

If a submitted destination becomes stale, reject it without moving or spending a reaction. Reproject the currently valid authoritative candidates for the same pending source. If revalidation finds none, close the consequence with the operative in place. If the source sector or active Threat is stale, reject the action and do not manufacture a new consequence.

## 7. Tile-entry, encounter, mission, and scenario behavior

After a successful displacement, reuse the existing single `pendingDisplacementArrival` handoff into sector resolution:

1. Move the operative's authoritative sector/current-space fields once.
2. Mark the displacement source event resolved once.
3. Schedule one displacement arrival.
4. Finish the failed Threat result once.
5. Enter the destination's sector phase: resolve persistent on-arrival tile challenges in authored order, then perform the destination's ordinary encounter exploration/draw if applicable.

No duplicate tile-entry processing is added. Specifically:

- Sector challenge / persistent tile challenge: yes, through the existing on-arrival sector pipeline.
- Threat resolution / ordinary encounter draw: yes, when the destination's ordinary exploration rules call for it.
- Shop access: no immediate shop transaction is triggered; after arrival resolution, ordinary action-phase access at that sector remains available.
- Movement-linked Contract progress (`sector-visited`): no; that hook belongs to successful voluntary movement and is not called by current forced displacement.
- Voluntary-movement character/item abilities: no.
- Scenario sector-entry/preparation hook: no new call; current forced displacement does not invoke the successful voluntary-movement scenario-entry hook. The same-ring rule also cannot force center entry.
- Counts as voluntarily choosing the sector: no, even though the owner chooses between forced candidates.

If the destination causes a Threat chain or tile challenge, that is ordinary arrival pressure, not a second `false-route-procession` consequence. Its own source identities govern it.

## 8. Multiplayer, privacy, phone, and TV

The rule is identical in single-player, co-op, rivalry, ruthless, and other supported modes: the operative's owner chooses. No rival chooser, teammate fallback, mode-specific random selection, or timeout is introduced.

Phone state:

- only the owning phone receives candidate controls and eligible private reactions;
- show “Move 1 sector on your current ring” plus the one or two server-generated destination names, ring/lane context already safe to expose, and one mandatory confirm action;
- after confirmation locks the destination, the owner may use Rift Anchor Spike before displacement resolves;
- candidate IDs, source-event IDs, reaction internals, arbitrary map selection, and client-calculated routes remain hidden;
- a stale confirm is rejected and the projected choices refresh; completed actions disappear immediately.

TV state:

- show False-Route Procession failed and that the owner is choosing a false route;
- keep candidate destinations private until confirmation;
- after confirmation, show the public movement path/result and any public prevention result using existing Threat/movement presentation;
- do not expose internal sector IDs, source/reaction identities, private inventory, or hidden choice state; add no focus mode.

## 9. Replay, reconnect, and reaction guarantees

One final failure creates at most one candidate-choice consequence and one source-event identity. Candidate generation is persisted, not treated as an effect. The reducer/server must reject wrong-seat, duplicate, stale-reaction, stale-origin, stale-source, arbitrary-destination, repeated-confirmation, and two-phone races without movement or resource spend.

Reconnect must reconstruct:

- source sector and authoritative ordered candidates;
- owner and reaction eligibility;
- whether Rift Anchor was spent/prevention completed;
- confirmed destination, if committed;
- pending arrival, if movement committed;
- completed source-event state after resolution.

Reducer replay, duplicate projection, duplicate socket delivery, and repeated movement completion cannot recreate the choice, move twice, spend Rift Anchor twice, fire arrival effects twice, draw two encounters, or reopen the completed Threat. Candidate revalidation does not create a new source event.

## 10. Severity and four-seat critique

Severity: **2 — moderate route setback**.

Justification: Command 7 and five graph references make the card relatively visible, but the effect is limited to one same-ring edge, the owner chooses the less harmful legal route, Rift Anchor can prevent it, and no Wound fallback exists. It may cost access to the source sector or lead into another challenge, but cannot cross rings, force center confrontation, bypass center preparation, or directly cause lasting damage. Destination shops/objectives can occasionally make it beneficial; the mandatory arrival pipeline and lack of movement-linked Contract credit limit farming. This is within the routine Threat target of severity 1–3.

| Seat | Critique and disposition |
|---|---|
| New player | The card states distance, same-ring scope, owner choice, and the one/none fallbacks. “Choose” does not make it voluntary; presentation must label it forced movement. |
| Optimizer | Position can influence which two sectors are offered, and a shop/objective may be favorable. The player cannot stay, cross rings, claim voluntary movement progress, or bypass arrival pressure. Rift Anchor is useful but costs a finite charge. |
| Family/casual | At most two named buttons avoid whole-board route analysis. One candidate still uses the same confirm/reaction presentation; zero candidates auto-resolve. |
| Rules lawyer | Owner, source, distance, candidate ordering, legality, blocked handling, center, reaction timing, stale submission, entry effects, mission exclusions, dedup, and reconnect persistence are explicit. |

## 11. Approval block

### `false-route-procession`

- Current Heat behavior: failed Command test authors `gain_heat 2`; runtime compatibility handling makes it a no-op.
- Original gameplay intent: navigation control loss through a tempting false route.
- Selected retirement model: owner chooses one server-generated legal clockwise/counterclockwise same-ring adjacent destination.
- Movement classification: forced displacement.
- Trigger: final authoritative failure of `false-route-procession`'s Command 7 test.
- Source sector: the acting operative's authoritative current sector when failure commits.
- Direction: clockwise or counterclockwise; selected through the chosen destination.
- Distance: exactly 1.
- Ring restriction: destination must share the canonical outer/middle/inner ring; center has no candidates.
- Destination authority: server-generated owner choice with submission-time server revalidation.
- Candidate-generation rule: canonical same-ring `+1/-1` neighbors, current sector excluded, existing movement-step legality applied, blocked candidates omitted without skipping, deduplicated, clockwise then counterclockwise.
- Player-choice owner: the acting operative's owner only.
- Voluntary movement effects: none; no movement reroll, voluntary item/ability trigger, or voluntary-sector classification.
- Movement allowance impact: none.
- Tile-entry behavior: one existing forced-displacement arrival handoff; persistent on-arrival tile challenges resolve once.
- Threat/challenge-entry behavior: ordinary destination encounter exploration/draw and challenges proceed through sector phase once.
- Mission/Contract interaction: no `sector-visited` or voluntary-movement progress; later challenge/Threat outcomes may progress their own objectives normally.
- Center-tile behavior: center is never a candidate; if the source is center, remain in place with no additional penalty.
- No-destination fallback: remain in place, no Wound or replacement effect, and complete the failed Threat once.
- Reaction eligibility: Rift Anchor Spike and only other already-typed forced-displacement prevention; H6B opens the existing reaction window after the destination is selected and locked.
- Multiplayer behavior: identical owner choice in all modes; no rival or timeout fallback.
- Duplicate-source protection: one persisted source-event identity; one choice, move, arrival, encounter handoff, and completion; all stale/duplicate submissions reject.
- Reconnect behavior: pending candidates/reaction/selection/arrival and completed source-event state reconstruct; no stage replays.
- Phone presentation: owner-only one/two destination buttons, destination names and safe ring/lane context, prevention controls, one mandatory confirmation; no arbitrary map selection or internal IDs.
- TV presentation: public wait, then confirmed route/prevention/result; candidates private before confirmation; no internal IDs or private inventory.
- Typed runtime support: requires a narrow destination-choice extension to the existing forced-displacement pending/projection/intent contract; reuses canonical ring/legality helpers, Rift Anchor handling, arrival pipeline, and completion ledger. No topology metadata required.
- Final player-facing rule: “If you lose, move 1 sector clockwise or counterclockwise on your current ring. Choose from the legal destinations. If only one is legal, move there. If neither is legal, remain in place.”
- Severity: 2.
- Complexity: medium-high implementation, low player resolution.
- Balance risk: medium; five references and beneficial redirection require focused playtest, bounded by one same-ring edge and no movement progress.
- Approval status: **APPROVED H6A — IMPLEMENTED H6B**.

## 12. Implementation prerequisites and focused tests

Exact prerequisites:

1. A narrow typed forced-displacement destination-choice effect limited to `false-route-procession`, distance 1, same-ring, owner choice, remain-in-place fallback, and failure-still-counts semantics.
2. A persisted pending choice containing owner, source/resolution/event identities, origin, ordered candidate IDs, creation data, and status; selection transitions atomically into the existing pending displacement/reaction record.
3. Server candidate generation using canonical ring order plus current movement-step legality; no client-derived legality.
4. Authenticated owner intent carrying only a server-issued pending identity plus one issued destination; submission-time revalidation and stale rejection.
5. Rift Anchor Spike source eligibility against the whole choice consequence.
6. Private owner projection, public-safe waiting/result projection, and reconnect schema support.
7. Reuse of the existing one-shot displacement arrival and resolved-source ledger.

Focused implementation tests should cover:

- content identity, Command 7, Yellow hazard, severity 2, success note, graph references, no reward/Trophy change, and removal of player-facing Heat;
- canonical clockwise/counterclockwise candidate generation on outer/middle/inner rings, branches, wrap points, center, one candidate, and zero candidates;
- movement requirements/blocked neighbor omission without skipping, duplicate removal, and deterministic order;
- owner choice, wrong seat, arbitrary destination, stale choice, stale origin, two phones, duplicate confirm, reducer replay, and repeated source event;
- Rift Anchor available after destination selection, prevention of the whole consequence, exact one charge, stale/duplicate reaction rejection, and reconnect during the window;
- one move and one arrival, tile challenges and ordinary encounter draw once, no voluntary movement allowance/roll/reroll/ability, no `sector-visited` Contract progress, no scenario-entry hook, and no center entry;
- owner-only candidates/reactions, public-safe TV wait/result, no internal IDs, no Heat row, and completed controls disappearing;
- reconnect before choice, after selection commitment, during arrival, and after completion with no replay;
- hash-pinned `gateblind-pulse`, `marrow-tax-auditors`, and `memory-tax-gate`, all H1–H5B cards, topology, and current forced-displacement cards.

Proposed implementation commit subject: `feat: retire false route heat threat`.

## 13. Remaining blocked cards

H6A does not redesign or change the status of these cards:

| Stable ID | Existing unresolved issue |
|---|---|
| `gateblind-pulse` | Global Escalation cap, threshold timing, solo/multiplayer scaling, and duplicate-pattern analysis remain unresolved. |
| `marrow-tax-auditors` | four-reference floor-zero Salvage-loss starvation risk still requires post-H3 balance evidence or an approved mitigation. |
| `memory-tax-gate` | exact competitive private choices, owner-only projection, authoritative submission, cancellation, reconnect, and reset remain unresolved. |

The +116-card expansion remains unapproved.

## 14. H6A report-only boundary

H6A changes documentation only. It does not change `false-route-procession`, any other Threat definition, card totals, board graph, topology, movement planner, forced-displacement behavior, schemas, validation, engine/server code, phone/TV UI, assets, scenarios, missions, Contracts, items, Equipment, economy, or the expansion. Implementation must be a later separately reviewed phase.
