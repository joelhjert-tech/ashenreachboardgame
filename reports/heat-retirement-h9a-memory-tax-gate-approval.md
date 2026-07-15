# Heat Retirement H9A — Memory Tax Gate private-choice approval

Status: **APPROVED H9A — IMPLEMENTED H9B**.

Checkpoint: `aadb5c1 feat: retire marrow tax heat effect` on `phase/heat-retirement-1x`.

Stable ID: `memory-tax-gate`.

## Decision

`memory-tax-gate` is approved for one owner-private choice between an immediate material loss and a delayed personal penalty:

> On failure, choose one: lose 1 Salvage (available only if you have at least 1 Salvage); or suffer -1 on your next non-battle test.

The server offers **Lose 1 Salvage** only when the affected owner currently has at least 1 Salvage. **Next non-battle test: -1** is always the nonterminal choice while the affected operative remains active. At zero Salvage the server creates no two-option prompt and automatically applies the delayed modifier. This prevents a floor-zero loss from becoming a free choice.

The choice is mandatory, owner-private, and resolved before the Threat finalizes. The Salvage arm is an automatic exact loss after selection, not payment or spending. The modifier arm is owner-scoped, applies to the next authoritative rolled non-battle test regardless of stat, is reused on a reroll of that test, and then clears. A later unresolved Memory Tax modifier replaces the earlier Memory Tax modifier rather than stacking with itself.

The model is severity 2 in solo and multiplayer. It gives a Command 8 uncommon hazard with no material reward a real but bounded personal consequence, while its three finite shared local-deck entries and the 12-card recent-encounter soft exile bound recurrence.

Implementation readiness: **Ready with a narrow typed extension**. Existing owner-private projection, floor-zero/exact Salvage loss, next-non-battle-test modifier, reconnect, and source-event patterns can be reused, but no current pending-choice type can express this mixed consequence safely. H9B must add one source-locked Memory Tax choice state and selection action; it must not generalize encounter payment or create a free-form choice engine.

## 1. Current card inspection

| Field | Current authoritative value |
|---|---|
| Stable ID | `memory-tax-gate` |
| Display name | Memory Tax Gate |
| Lane / type | Yellow / hazard |
| Authored region / rarity / tempo | middle / uncommon / push |
| Test | Command 8 |
| Authored severity | 3; approved replacement consequence severity 2 |
| Success | `gain_note`: “You paid the gate with a harmless memory and kept the real name hidden.” |
| Failure | `gain_heat 2` |
| Reward / Trophy | none; no Salvage, Trophy, pile entry, item, or progress reward |
| Persistence | none in authored content |
| Graph references | `middle_relic_cache`, `middle_anomaly_well`, `the-salt-archive` |
| Runtime | the legacy Heat compatibility branch is mechanically inactive and summarizes no additional status change |

The exact obsolete clause is `failEffect: { type: "gain_heat", amount: 2 }`. It currently creates an authored/runtime mismatch: the card promises a personal consequence, but the compatibility resolver applies none.

The gate's original identity is a compulsory personal toll paid with something the operative values or with a lingering loss of focus. It is not shared scenario pressure, physical injury, forced travel, or permanent item damage. The approved rule preserves that identity as a choice between immediate resource loss and delayed capability pressure.

Closest overlaps are:

- `glass-chime-swarm`: next non-battle test `-1`, but automatic and without a choice;
- `siren-relay-echo`: next non-battle Command modifier, but its sign is determined by success/failure and it has no resource alternative;
- `marrow-tax-auditors` and the five earlier approved cards: automatic floor-zero Salvage loss, while Memory Tax offers exact loss only when funded;
- `gate-tax-collectors`: required payment, which Memory Tax expressly is not;
- `relay-husk`: owner-private selection, but exact Equipment targeting and suppression rather than mixed immediate/delayed pressure; and
- `false-route-procession`: server-generated owner choice feeding a later consequence, but movement-specific.

## 2. Frequency and repeatability

The card appears once in each of three finite shared local decks. Drawn cards are removed from their sector deck and no local-deck reshuffle or card-owned recurrence returns them. The card is not persistent. One operative may encounter more than one entry by visiting several sectors, and separate players may encounter separate entries, but the maximum is three resolutions table-wide, not three per player.

| Pool | Printed lanes | Deck size | Eligible Yellow cards | First eligible Yellow chance |
|---|---|---:|---:|---:|
| `middle_relic_cache` | Yellow | 10 | 9 | 1/9 |
| `middle_anomaly_well` | Blue, Yellow | 9 | 3 | 1/3 on a Yellow draw |
| `the-salt-archive` | Yellow | 6 | 6 | 1/6 |

The global recent-encounter list retains the last 12 stable IDs and excludes a recent card while a fresh alternative remains. It reduces immediate repeated identity across sectors but does not erase the three-entry session maximum.

For a normal unmodified 2d6 Command 8 check, Command 2/3/4/5 fails about 27.8%/16.7%/8.3%/2.8% respectively. Escalation and other modifiers can increase that rate. The result is occasional personal pressure rather than a guaranteed session tax.

## 3. Existing private-choice infrastructure audit

| Lifecycle | Current authority and privacy | Reconnect / stale handling | Suitability for Memory Tax |
|---|---|---|---|
| Encounter payment | Server persists owner, decision/version, legal option IDs, affordability, and paid/decline effects; owner phone receives private option details | persisted choice; server revalidates seat, version, and option | **Not reusable as-is.** It is explicitly payment-shaped, carries Salvage cost and paid/decline semantics, and supports only encounter reward branches |
| Equipment suppression | Server derives exact eligible equipped instance IDs; only owner receives them; submission contains one exact instance | source and instance revalidation, duplicate ledger, reconnect persistence, no-target completion | Pattern is reusable, type is not. It would create an unnecessary nested choice and duplicate Relay Husk |
| False Route destination | Server derives one or two legal destinations; public state only says waiting; owner receives candidate details | persisted source snapshot, stale-sector rejection, immutable selection, source dedup | Strong structural precedent for source-locked owner choice, but its schema and reaction handoff are movement-specific |
| Reactions | Server exposes exact eligible reactions only to the owner and validates resource use | pending windows persist; stale and duplicate responses reject | Useful authority pattern, not a consequence-choice model |
| Next-test modifiers | Server owns amount, source, eligibility, roll breakdown, reroll reuse, consumption, privacy, and cleanup | pending status survives reconnect; recall/replacement/session end clears it | Reusable for the selected delayed arm after adding `memory-tax-gate` as a typed source |

There is no general private-choice engine. H9A does not approve one. The existing choice lifecycles prove the required ownership, legal-option, projection, reconnect, and dedup patterns, but the mixed Memory Tax decision needs one narrow typed pending record.

## 4. Replacement option evaluation

| Option | Choice quality / severity | Runtime readiness | Decision |
|---|---|---|---|
| A — lose 1 Salvage or next-test penalty | Both arms are credible when funded; the immediate cost preserves future capability, while the delayed cost preserves currency. Omitting the loss arm at zero closes the free-branch exploit. Severity 2 | Existing consequences plus narrow private-choice extension | **Selected** |
| B — preventable Wound or Equipment suppression | Prevention visibility distorts the comparison; Equipment selection creates a nested choice; no eligible Equipment forces a Wound; severity can jump near recall | Requires nested Wound/reaction and Equipment choice coordination | Reject |
| C — choose one of two temporary stat penalties | Fixed pairs are structurally simple, but current non-battle distribution makes apparently thematic Command/Signal badly unequal: Command appears on 4 non-enemy Threats and Signal on 13 | Requires a new stat-choice state and modifier source | Reject; optimizer usually chooses the rarer stat |
| D — suppress Equipment through next Threat | Exact-instance support exists, but this becomes Relay Husk with different prose and is harmless for an unequipped owner | Existing H4B infrastructure | Reject as duplicate identity |
| E — discard resource or delayed consequence | Consumables, preparation resources, and item state produce intrusive eligibility, mission, or scenario coupling; Salvage is the only clean resource and is already covered by A | Mixed; most variants need new hooks | Reject broader variants |
| F — choose Command or Signal for next non-battle `-1` | Clear but not competitive under current content frequency; Command is the routine optimizer selection | Narrow modifier and choice extension | Reject |
| G — remove Heat without replacement | Leaves a failed Command 8 hazard with no consequence and erases the gate's toll identity | Ready with no lifecycle | Reject |

### Why Option A deserves its card slot

Memory Tax is not another automatic floor-zero loss because the loss option is exact and available only when funded. It is not another Glass-Chime because the delayed penalty is chosen to preserve Salvage and Memory Tax replaces only its own unresolved status. The meaningful structure is immediate versus delayed pressure, chosen privately from server-generated legal arms. Neither `marrow-tax-auditors`, `glass-chime-swarm`, nor `siren-relay-echo` gives that decision.

## 5. Choice contract

### Eligibility and option generation

The server determines the affected owner and generates options from authoritative state:

- `lose-salvage-1` is eligible only when current Salvage is at least 1.
- `next-non-battle-test-minus-1` is eligible while the affected operative remains active and can own a pending modifier.
- The client never supplies amounts, consequence types, duration, eligibility, source IDs, or current Salvage.

When both options are eligible, the server creates one mandatory owner-private pending choice. When only the modifier is eligible, the server applies it automatically and creates no unnecessary one-button prompt. If the loss option becomes stale before selection, that option is rejected and removed; the sole remaining modifier arm resolves automatically. If the affected operative is recalled, defeated, replaced, or otherwise ceases to be active before selection, the choice clears, no consequence transfers to a replacement, and the source resolves with no substitute penalty.

Because the modifier arm is state-independent for an active operative, a live choice cannot reach zero eligible options through ordinary play. Session end and authoritative owner removal clear it. Disconnect alone does not choose for the player: the choice persists until reconnect, matching current private-choice behavior. No gameplay timeout or random default is approved.

### Mandatory flow

1. Resolve the authoritative Command 8 result.
2. On failure, derive owner, current Salvage, and legal option IDs.
3. If funded, create one pending owner-private choice and pause Threat finalization.
4. If unfunded, install the modifier automatically and skip the prompt.
5. For a submitted choice, validate owner, choice ID/version, source resolution, option ID, current eligibility, and active operative.
6. Lock one accepted option; no Cancel or option change is allowed.
7. Resolve exactly one selected consequence.
8. Close the pending choice and record its source as completed.
9. Finalize the Threat exactly once. Existing success, reward, and Trophy behavior remains unchanged.

No choice opens a second private selection. The selected consequence may use its normal authoritative lifecycle, but the choice itself is one step.

## 6. Selected consequence rules

### Salvage arm

- Classification: automatic exact loss after selection; not payment, spending, purchase, sale, reward reduction, or transaction.
- Requested loss: 1.
- Eligibility: current owner Salvage at least 1 at selection commitment.
- Actual loss: 1; resulting Salvage is current Salvage minus 1.
- Zero behavior: the arm is absent, so it can never resolve as a free zero-delta choice.
- Isolation: no Salvage Ledger reaction, shop history, `shopTransaction`, voluntary-spend progress, mission/Contract progress, `completedContracts`, reward, or relic trade.
- Replay: existing Salvage consequence/source protection applies in addition to the completed choice source.

### Modifier arm

- Owner scope: affected seat only.
- Amount: `-1`.
- Context: the owner's next authoritative rolled non-battle test, regardless of stat.
- Eligible tests: typed Hazard, tile-challenge, Anomaly, scenario, or mission checks that enter the normal non-battle check pipeline.
- Excluded: battles, movement rolls, previews, automatic effects, payments, shop actions, and other seats.
- Consumption: it is applied to the first eligible final test resolution. Unrelated tests preserve it.
- Rerolls: the recorded modifier remains part of the same test's authoritative breakdown and rerolls; it does not apply twice or consume twice.
- Stacking: one unresolved `memory-tax-gate` modifier per owner. A later selected Memory Tax modifier replaces the earlier one rather than stacking or queueing. Choosing Salvage on a later copy does not clear an earlier modifier.
- Composition: it may stack by distinct source with Glass-Chime Swarm and, on a Command test, Siren Relay Echo. Each source appears once in the breakdown.
- Cleanup: consumption after the eligible test; recall, defeat/operative replacement, owner removal, session end, and room reset clear it. Turn and round changes do not.
- Stored stats are never mutated.

## 7. Privacy, projections, reconnect, and replay

### Owner phone

When both options exist, show:

- title: **Memory Tax Gate**;
- prompt: **Choose what the gate takes**;
- option: **Lose 1 Salvage** with the exact current cost;
- option: **Next non-battle test: -1** with its until-used duration; and
- one mandatory Confirm control after selection.

At zero Salvage, show the automatic result **No Salvage was available. Your next non-battle test suffers -1.** Do not show a disabled/free Salvage arm. After the modifier is installed, the owner-private status reads **Memory Tax Gate — Next non-battle test: -1**.

The phone submits only the server-generated choice ID/version and option ID. Stale options disable immediately. Internal source/consequence IDs, arbitrary target controls, and private state from other owners remain hidden.

### Other phones and TV

Before selection, public projections say only that the operative is resolving Memory Tax Gate. They do not reveal the candidate arms, current Salvage, or intended selection. After selection, public output says **Memory Tax Gate was resolved.** The chosen branch, owner balance, and pending future modifier remain owner-private. The TV adds no focus mode.

### Reconnect and replay

Persist the pending choice, legal option IDs, choice version, source card, source resolution/event, affected owner, and status. Persist the selected consequence through its existing authoritative state. Reconnect restores only the owner's pending options or modifier status; other phones and TV retain the public-safe summary.

The full lifecycle must reject or no-op duplicate Threat submission, duplicate pending-choice creation, wrong-seat selection, forged option, stale version, duplicate option submission, repeated consequence commitment, reducer replay, two phones for one seat, duplicate projection, and reconnect after completion. Required invariants are one failure → at most one choice → one accepted option → one consequence → one Threat finalization. Reward/Trophy processing, although empty for this card, still finalizes once.

## 8. Severity and balance

| Context | Rating | Reason |
|---|---:|---|
| Solo | 2 | Personal and unavoidable on failure, but player chooses timing pressure; three shared entries become three possible personal entries in the worst route |
| Two to four players | 2 | Owner-scoped, not shared; larger tables may expose more sectors but finite shared decks cap the table at three copies |
| Early game | 2 | One Salvage matters against 2–3 cost decisions, so the delayed penalty is credible rather than cosmetic |
| Late game | 1–2 | Salvage may matter less, but higher escalation makes a future test penalty more dangerous |
| Zero Salvage | 2 | No free branch: the modifier applies automatically |
| Heavily equipped | 2 | Equipment is irrelevant, preventing weak-item dumping |
| Wounded | 2 | Neither arm interacts with recall or Scar thresholds |

The authored card severity remains 3; H9A rates the replacement consequence itself at 2. Difficulty 8, no Trophy/material success reward, one failure trigger, owner mitigation through choice, and a maximum of three finite appearances make severity 2 proportionate. The primary playtest risk is delayed-modifier deferral: a player may avoid non-battle tests for several turns. That is accepted as route pressure, not an exploit, because unrelated activity does not erase the state and recall/replacement is the only normal cleanup.

## 9. Four critique seats

| Seat | Conclusion |
|---|---|
| New player | “Lose 1 now or take -1 later” is immediate. The prompt states that Salvage is lost, not paid, and the private status states exactly when the delayed penalty ends |
| Optimizer | Current Salvage, route plans, and escalation can change the best arm, so neither funded option dominates. Zero Salvage cannot choose a free loss; unrelated tests cannot clear the modifier; reconnect cannot shed it |
| Family/casual | At most two buttons and no nested target picker. Zero Salvage skips the redundant prompt. The only bookkeeping is an existing style of owner-private next-test status |
| Rules lawyer | Trigger, owner, legal options, zero fallback, stale revalidation, exact loss, eligible test, reroll behavior, replacement, cleanup, privacy, source dedup, and finalization are all explicit |

## 10. Approval block

### `memory-tax-gate`

- Current Heat behavior: failed Command 8 test authors `gain_heat 2`; compatibility runtime applies no mechanical change.
- Original gameplay intent: pay a compulsory personal toll with a resource or a lingering loss of mental capability.
- Selected retirement model: mandatory owner-private immediate-versus-delayed choice.
- Trigger: final authoritative failure of `memory-tax-gate`'s Command 8 test.
- Choice owner: affected acting seat.
- Choice privacy: legal arms, selection, balance, and pending modifier are owner-private; public surfaces show waiting/resolved only.
- Choice mandatory: yes when two arms are eligible; no Cancel and no random/timeout selection.
- Option A: Lose 1 Salvage.
- Option A eligibility: owner has at least 1 Salvage at commitment.
- Option A consequence: one automatic exact `lose_salvage 1`; actual loss 1; not payment/spending/transaction.
- Option B: Suffer `-1` on your next non-battle test.
- Option B eligibility: affected operative remains active and can own the status.
- Option B consequence: create/replace one owner-scoped Memory Tax next-non-battle-test modifier.
- No-eligible-option fallback: normally unreachable; if the operative ceases to be active, clear and complete with no substitute penalty. At zero Salvage, Option B resolves automatically.
- Selection timing: after failure is final and before Threat finalization.
- Consequence ordering: generate/revalidate options → lock one → resolve exactly one consequence → close/ledger choice → finalize Threat once.
- Threat-finalization timing: after exact loss is committed or modifier state is installed; never while a two-option choice remains pending.
- Salvage interaction: exact owner loss only; no zero-delta choice, payment, shop, Ledger, mission, Contract, or relic interaction.
- Equipment interaction: none.
- Wound/Scar interaction: none; no Wound, recall, pending Scar, direct Scar, or defeat branch.
- Modifier interaction: amount `-1`, any stat, next rolled non-battle test, same-test rerolls included, self-replacing, distinct-source stacking, explicit cleanup.
- Mission/Contract interaction: the loss is not voluntary spending or `shopTransaction`; the modifier affects only an already-authoritative rolled check and creates no progress event itself.
- Duplicate-source protection: stable choice/source/consequence IDs plus completed choice and existing consequence ledgers; one accepted arm and one finalization.
- Reconnect behavior: pending choice or installed modifier persists; only owner receives private reconstruction; completion never reopens.
- Cleanup/reset: modifier consumes on first eligible final test; recall, defeat/replacement, owner removal, session end, and room reset clear choice/status; turn/round do not.
- Phone presentation: **Choose what the gate takes** with only eligible server-generated options; owner-private modifier status after selection.
- TV presentation: public waiting and generic resolved summaries only; no options, balances, future modifier, or internal IDs.
- Typed runtime support: existing consequence lifecycles plus one narrow source-locked pending choice and one Memory Tax modifier source extension.
- Final player-facing rule: **On failure, choose one: lose 1 Salvage (available only if you have at least 1 Salvage); or suffer -1 on your next non-battle test.**
- Solo severity: 2.
- Multiplayer severity: 2.
- Complexity: medium implementation, low player resolution.
- Balance risk: medium-low; bounded recurrence and no free branch, with delayed-test avoidance to monitor.
- Approval status: **APPROVED**.

## 11. Implementation prerequisites and focused tests

Classification: **Ready with narrow typed extension**.

H9B prerequisites:

1. Replace the card's `gain_heat 2` in place with one source-locked typed Memory Tax choice effect; preserve all identity, success, reward, graph, and count fields.
2. Add `PendingMemoryTaxChoice` with choice ID/version, owner, source card/event/resolution, legal option IDs, created time, and pending/completed source ledger.
3. Add one selection action accepting only choice ID/version and one legal option ID. Do not accept amounts, balances, modifier details, or arbitrary effect objects.
4. Reuse the authoritative `lose_salvage` consequence for the funded arm without creating a shop/payment event.
5. Extend the next-non-battle-test modifier union/resolver with source `memory-tax-gate`, amount `-1`, any-stat non-battle eligibility, self-replacement, reroll reuse, owner privacy, and existing cleanup.
6. Add owner-private option/status projection and public-safe waiting/resolved projection using existing Threat components; no broad phone/TV redesign.
7. Normalize/persist pending and completed states for reconnect and source-event replay protection.

Focused H9B tests must cover:

- stable ID, lane/type/stat/difficulty/severity, success, reward, three graph references, art, and totals unchanged;
- funded two-option creation; zero-Salvage automatic modifier; loss of exactly 1; no free floor-zero option;
- exact next non-battle `-1`, all stats, unrelated-test retention, battle/movement/automatic exclusion, reroll reuse, final consumption, self-replacement, and composition with Glass-Chime/Siren;
- wrong seat, forged option/effect/amount, stale version, vanished Salvage eligibility, duplicate choice/source/consequence, two phones, reducer replay, and one Threat finalization;
- reconnect before choice, after selection, during the affected test, and after completion;
- recall/defeat/replacement/session cleanup without transfer or substitute consequence;
- owner-only options/status, public-safe phone/TV waiting/result, and no internal IDs;
- Salvage Ledger, shop, mission, Contract, completed-Contract, relic, Equipment, Wound, Scar, movement, scenario, and escalation isolation; and
- all H1–H8B cards unchanged, 26/35/48/109 totals, quarantined audit hashes unchanged, and the +116 expansion still unapproved.

Recommended implementation commit subject: `feat: retire memory tax gate heat effect`.

## 12. Final Heat-retirement status

All Heat-linked Threats now have approved and implemented retirement rules. H9B completed `memory-tax-gate` through the approved narrow private-choice lifecycle. A separate authored-Heat removal and compatibility-boundary audit remains required.

## H9B implementation seal

H9B implements the approved wording and behavior in place: funded owners receive the two server-generated private options; zero Salvage installs the delayed modifier automatically; a stale Salvage choice falls back to that modifier; exact loss uses the existing floor-zero resolver semantics; and the modifier binds to one final non-battle test resolution across rerolls. The choice, modifier, completed-source ledgers, projections, and reconnect behavior are typed and source-locked to `memory-tax-gate`.

Global legacy compatibility infrastructure is not approved for removal in H9A or H9B. A separate authored-Heat removal and compatibility-boundary audit must follow implementation.

The +116-card expansion remains unapproved.

## 13. Verification

H9A verification at `aadb5c1`:

- `npm.cmd run validate:content` — passed; 109 Threats, 36 Contracts, and the current content totals validated.
- `npm.cmd run typecheck` — passed.
- Focused private-choice, projection, economy, modifier, Equipment, Wound, reconnect, and replay selection — 7 files / 71 tests passed.
- `npm.cmd run test:engine` — passed independently.
- `npm.cmd run test:integration` — 26 files / 226 tests passed independently.
- `npm.cmd run test:client` — 26 files / 257 tests passed independently.
- `npm.cmd run test` — the aggregate wrapper exceeded the 240-second command timeout. Its exact three constituents are `test:engine`, `test:integration`, and `test:client`; all three passed independently as listed above. No retry or arbitrary wait was added, and no child test process remained afterward.
- `git diff --check` — passed.
- `git diff --cached --check` — passed on the final staged slice.

The working diff contains only this new H9A report and the three required report updates. `content/cards/threats/memory-tax-gate.json` has no diff from `HEAD`; no Threat definition, gameplay, schema, validation, engine/server code, UI, asset, economy, mission, Contract, scenario, item, movement, or card total changed. H1–H8B remain unchanged. The two quarantined audits remain untracked and retain SHA-256 hashes `2AD4637AB78F5E369ED85D5D81EB2F76C45592A94E0D48116FCC9A6D443E6EF8` and `608F0B5F664C7257009054C10A4FB8CB81A26E9EF5B4031588FB5CB15D6FC776`.
