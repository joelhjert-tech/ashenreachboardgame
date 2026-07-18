# Remaining Heat-only individual decisions

All recommendations are pending explicit approval. “Current severity” means enforced runtime impact today: every reviewed Heat clause is a no-op, so it is 0 even when the authored card rating is higher.

## Summary matrix

| ID | Current branch | Preferred treatment and exact effect | Proposed severity | Readiness | Batch |
|---|---|---|---:|---|---|
| `anomaly-bellrain-inversion` | resolve `lose_heat 1` | Typed Signal 7 anomaly test; pass gains 1 Salvage, fail does nothing | 1 | focused test infrastructure | 4 |
| `compact-equipment-requisition` | reward `lose_heat 1` | Contract reward `gain_salvage 1` through `COMPLETE_CONTRACT` | 1 | existing mechanics | 2 |
| `escalation-blackstar-hunger` | resolve `gain_heat_all 1` | Advance Global Escalation 1 | 2 | balance approval | 5 |
| `escalation-choir-feedback` | resolve `gain_heat_all 1` | Advance Loss Pressure 1 | 2 | balance approval | 5 |
| `escalation-marrow-surgery-debt` | resolve `gain_heat 1` | Active player loses up to 1 Salvage, floor zero | 1 | existing mechanics | 2 |
| `escalation-saltwind-lockdown` | resolve `gain_heat_all 1` | Advance Loss Pressure 1 | 2 | balance approval | 5 |
| `ash-cinder-runt` | loss `gain_heat 1` | Suffer 1 Wound | 1 | existing mechanics | 3A |
| `ashen-doppelganger` | loss `gain_heat 2` | Suffer 2 Wounds | 4 | explicit balance approval | 3B |
| `bell-mask-pilgrim` | loss `gain_heat 1` | Remove clause; enemy remaining is the complete loss result | 0 | existing mechanics | 1 |
| `choir-static-burst` | fail `gain_heat 2` | Suffer 1 Wound | 2 | existing mechanics | 3A |
| `cinder-gate-backlash` | success `lose_heat 2` | Heal 1 Wound | 2 | existing mechanics | 3A |
| `cracked-censer-novice` | loss `gain_heat 1` | Remove clause; enemy remaining is the complete loss result | 0 | existing mechanics | 1 |
| `crown-bell-baron` | loss `gain_heat 2` | Lose up to 1 Salvage, floor zero | 1 | existing mechanics | 2 |
| `false-route-procession` | fail `gain_heat 2` | Forced displacement one legal step outward; if none, suffer 1 Wound | 2 | focused content hook | 8 |
| `gateblind-pulse` | fail `gain_heat 2` | Advance Global Escalation 1 | 2 | balance approval | 5 |
| `glass-chime-swarm` | fail `gain_heat 1` | −1 Signal through end of current turn | 1 | temporary-modifier infrastructure | 4 |
| `glasswing-midge-cloud` | loss `gain_heat 1` | Remove clause; enemy remaining is the complete loss result | 0 | existing mechanics | 1 |
| `grave-silt-press` | fail `gain_heat 1` | Suffer 1 Wound | 1 | existing mechanics | 3A |
| `hymn-scarred-zealot` | loss `gain_heat 1` | Gain existing `scar-wound-4` Bell-Deafened; duplicate fallback is 1 Wound | 4 | Scar/balance approval | 7 |
| `lantern-moth-swarm` | success/fail `−1/+1 Heat` | Success heals 1 Wound; failure suffers 1 Wound | 2 | existing mechanics, paired approval | 3A |
| `latchspire-raider` | defeat `lose_heat 1` | Gain 1 Salvage | 1 | existing mechanics | 2 |
| `marrow-tax-auditors` | fail `gain_heat 2` | Lose up to 1 Salvage, floor zero | 1 | existing mechanics | 2 |
| `memory-tax-gate` | fail `gain_heat 2` | Owner discards one private note; with none, suffer 1 Wound | 2 | bespoke owner choice | 8 |
| `mirror-mite-bloom` | loss `gain_heat 1` | Suffer 1 Wound | 2 | existing mechanics | 3A |
| `mirror-rot-interference` | success `lose_heat 1` | Heal 1 Wound | 2 | existing mechanics | 3A |
| `pale-contract-collector` | loss `gain_heat 2` | Lose up to 1 Salvage, floor zero | 1 | existing mechanics | 2 |
| `relay-husk` | fail `gain_heat 1` | Discard one equipped normal utility Equipment; none means no effect | 2 | equipment-choice infrastructure | 6 |
| `relay-pilgrim-riot` | loss `gain_heat 1` | Suffer 1 Wound | 2 | existing mechanics | 3A |
| `roadside-bone-oracle` | fail `gain_heat 1` | Remove clause; failed omen grants nothing and resolves normally | 0 | existing mechanics | 1 |
| `signal-rotted-engineer` | loss `gain_heat 1` | Discard the equipped normal weapon; none means no effect | 2 | equipment-choice infrastructure | 6 |
| `siren-relay-echo` | success/fail `−1/+2 Heat` | Success +1 Command; failure −1 Command, through end of turn | 2 | temporary-modifier infrastructure | 4 |
| `soot-stained-cutpurse` | loss `gain_heat 1` | Lose up to 1 Salvage, floor zero | 1 | existing mechanics | 2 |
| `spindle-static-squall` | fail `gain_heat 1` | −1 Signal through end of current turn | 1 | temporary-modifier infrastructure | 4 |
| `webglass-snarefield` | success `lose_heat 1` | Heal 1 Wound | 2 | existing mechanics | 3A |
| `crownless-advocate` | active `lose_heat 1` | Once/round reduce one required encounter payment by 1, minimum 0 | 2 | bespoke payment hook | 8 |
| `saltflat-bone-reader` | active `lose_heat 1` | Once/round reveal public tags/rule text for one adjacent sector | 1 | bespoke information action | 8 |

Primary-treatment totals: remove 4; Salvage gain 2; Salvage loss 5; Wound gain 6; Wound healing 3; Scar 1; Loss Pressure 2; Global Escalation 2; Equipment 2; tests/challenges 1; temporary modifiers 3; movement/gate 1; bespoke rewrites 4. Required payment, optional payment, retirement, compatibility-only cleanup, and intentionally blocked primary treatments are 0. Total: **36**.

## Exact resolution contracts

### Removal and economy

- Removal targets delete only the named Heat field. Enemy loss still leaves the enemy under existing battle cleanup; a hazard failure with no replacement emits no fabricated delta and continues once.
- `gain_salvage 1` uses the existing reward mutation. Contract payout remains reward → completed-contract ledger → replacement; it never fires from objective progress alone.
- Every recommended loss is automatic `lose_salvage 1`, not payment. It takes `min(current Salvage, 1)`, may resolve for zero, emits only the actual loss, cannot fail for affordability, and cannot trigger shop transactions or Salvage Ledger.

### Wounds, healing, and Scar

- `take_wound` uses current prevention before mutation, then existing threshold/Scar/recall/replacement handling. Actual result deltas match mutation and reconnect cannot replay a resolved branch.
- Healing is `heal_wound 1`, floors at zero, opens no prompt, and emits no healing result when already unwounded.
- Ashen Doppelganger alone keeps a two-Wound recommendation because it is an inner S4 enemy with a three-trophy reward. This is a serious balance increase and must not share the low-risk Wound commit.
- Hymn-Scarred Zealot uses existing `scar-wound-4` rather than inventing the missing historical “Languishing Mind” ID. If already owned, the exact branch becomes `take_wound 1`; no second Scar instance is created. Scar prevention and privacy remain unchanged.

### Shared tracks

- Loss Pressure and Global Escalation each advance exactly 1, clamp through their existing reducers, and trigger existing maximum/defeat behavior once. They do not mutate one another.
- These effects apply in every mode that currently owns the public track. Rivalry players cannot select a target or redirect the increase. Repeated draws may repeat the consequence; reconnect may not.

### Tests and temporary modifiers

- Bellrain Inversion requires a server-created Signal 7 decision at anomaly resolution. Assistance, Equipment modifiers, rerolls, and result ordering use ordinary non-battle check rules. Success gains 1 Salvage; failure has no consequence. The anomaly pauses once and resumes once.
- Temporary modifiers are seat-owned and carry `{stat, amount, sourceId, expiresAtTurnEnd: true}`. They apply to authoritative totals after base/permanent/equipped modifiers, never alter stored stats, survive reconnect, and clear only at the authoritative end of that seat’s turn. Same source IDs do not stack.
- Siren Relay Echo creates +1 Command on success or −1 Command on failure; only one branch resolves. Glass-Chime Swarm and Spindle Static Squall create −1 Signal only on failure.

### Movement, Equipment, and bespoke choices

- False-Route Procession reuses forced displacement with direction `outer`. The server chooses the legal one-step destination using current deterministic routing; no legal destination invokes `take_wound 1`. It never changes movement allowance or bypasses gates.
- Equipment loss is owner-scoped, exact-instance, normal Equipment only, and excludes Artifacts/followers. Relay Husk offers equipped utility instances; Signal-Rotted Engineer offers the equipped normal weapon. If multiple utility candidates exist the owner chooses; wrong seat, stale version, or missing instance rejects without mutation. With no candidate, continuation is automatic and harmless.
- Memory Tax Gate creates an owner-private choice from current notes. Exactly one selected note is removed; when no note exists the fallback is 1 Wound. Other seats and TV see only a public waiting/result summary. Reconnect preserves the same option set and replay protection.
- Crownless Advocate discounts only an existing **required** `encounter_payment`, once per owner per round. It never discounts optional payments, shops, relic services, Contracts, or an already-zero cost; state persists through reconnect and resets only on `ROUND_COMPLETED`.
- Saltflat Bone-Reader reveals only already-public `tags` and `ruleText` for one adjacent canonical sector. It reveals no decks, encounters, routes, legality, Contract targets, or Rivalry data; use is once per owner per round and survives reconnect.

## Per-ID decision records

All entries below inherit the validation, actual-delta, continuation, reconnect, replay, and compatibility rules above. Each recommendation remains pending approval.

### anomaly-bellrain-inversion
At `resolveEffect`, replace `lose_heat 1` with a server-authored Signal 7 anomaly test. Success gains 1 Salvage; failure does nothing. Use ordinary assistance/modifiers/rerolls, then resume once. Text: “Test Signal 7. On success, gain 1 Salvage.” Test both results, reconnect, and no duplicate reward.

### compact-equipment-requisition
At Contract reward resolution, replace `lose_heat 1` with `gain_salvage 1` inside the existing `COMPLETE_CONTRACT` ordering. Text: “Gain 1 Salvage.” Test one payout, ledger transition, replacement, and replay rejection.

### escalation-blackstar-hunger
At escalation resolution, replace `gain_heat_all 1` with Global Escalation +1 through its authoritative reducer. Text: “Advance Global Escalation by 1.” Test maximum behavior, every mode, and single resolution.

### escalation-choir-feedback
At escalation resolution, replace `gain_heat_all 1` with Loss Pressure +1. Text: “Advance Loss Pressure by 1.” Test clamping/defeat behavior, mode handling, and replay protection.

### escalation-marrow-surgery-debt
At escalation resolution, replace `gain_heat 1` with automatic floor-zero Salvage loss 1 for the active player. Text: “Lose up to 1 Salvage.” Test zero and positive balances and prove it is not payment or a shop transaction.

### escalation-saltwind-lockdown
At escalation resolution, replace `gain_heat_all 1` with Loss Pressure +1. Text: “Advance Loss Pressure by 1.” Test shared-track maximum behavior, Rivalry non-targetability, and reconnect.

### ash-cinder-runt
At enemy loss, replace `gain_heat 1` with `take_wound 1`. Text: “Suffer 1 Wound.” Test prevention, recall threshold, enemy persistence/cleanup, actual delta, and replay rejection.

### ashen-doppelganger
At enemy loss, replace `gain_heat 2` with `take_wound 2`; this isolated severity-4 proposal requires explicit balance approval. Text: “Suffer 2 Wounds.” Test partial/full prevention, recall, exact two-Wound ceiling, and no duplicate application.

### bell-mask-pilgrim
Delete only the loss `gain_heat 1` clause. The enemy remaining is the complete consequence. Remove its approval only after the clause is absent. Test unchanged loss cleanup and no fabricated result.

### choir-static-burst
At failure, replace `gain_heat 2` with `take_wound 1`. Text: “Suffer 1 Wound.” Test prevention, recall, sibling ordering, actual delta, and continuation once.

### cinder-gate-backlash
At success, replace `lose_heat 2` with `heal_wound 1`. Text: “Heal 1 Wound.” Test 2→1, 1→0, 0→0 with no false delta, and unchanged cleanup.

### cracked-censer-novice
Delete only the enemy-loss `gain_heat 1` clause. The enemy remains under existing rules. Test stable rewards, cleanup, no replacement penalty, and approval removal.

### crown-bell-baron
At loss, replace `gain_heat 2` with automatic floor-zero Salvage loss 1. Text: “Lose up to 1 Salvage.” Test zero balance, exact loss, no affordability gate, and no mission/shop event.

### false-route-procession
At failure, replace `gain_heat 2` with deterministic one-step outward forced displacement; if no legal outward destination exists, suffer 1 Wound. Text states both outcomes. Test gates, no-route fallback, prevention, reconnect, and no movement-allowance change.

### gateblind-pulse
At failure, replace `gain_heat 2` with Global Escalation +1. Text: “Advance Global Escalation by 1.” Test maximum behavior, table-wide visibility, no player-selected target, and exact-once resolution.

### glass-chime-swarm
At failure, apply −1 Signal until the affected seat’s turn ends. Text: “−1 Signal until the end of your turn.” Test authoritative totals, resting-state isolation, same-source non-stacking, reconnect, and authoritative expiry.

### glasswing-midge-cloud
Delete only the enemy-loss `gain_heat 1` clause. Test that the enemy’s ordinary loss state remains meaningful, no replacement effect appears, and the approval is removed only with the clause.

### grave-silt-press
At failure, replace `gain_heat 1` with `take_wound 1`. Text: “Suffer 1 Wound.” Test prevention, threshold handling, sibling order, reconnect, and actual result delta.

### hymn-scarred-zealot
At loss, gain existing Bell-Deafened (`scar-wound-4`); if already owned, suffer 1 Wound instead. Text names the Scar and fallback. Test Scar prevention/privacy/persistence, duplicate fallback, recall, and exact-once resolution.

### lantern-moth-swarm
Keep the paired branches: success replaces `lose_heat 1` with heal 1 Wound; failure replaces `gain_heat 1` with suffer 1 Wound. Text states each branch separately. Test floor zero, prevention, mutual exclusion, ordering, and reconnect.

### latchspire-raider
At defeat reward, replace `lose_heat 1` with gain 1 Salvage. Text: “Gain 1 Salvage.” Test reward ordering, encounter repeatability/farming exposure, cleanup, and replay rejection.

### marrow-tax-auditors
At failure, replace `gain_heat 2` with automatic floor-zero Salvage loss 1. Text: “Lose up to 1 Salvage.” Test zero balance, actual delta, no payment semantics, and continuation.

### memory-tax-gate
At failure, let the owner privately discard exactly one current note; if none exist, suffer 1 Wound. Text states the choice and fallback. Test owner privacy, stale options, prevention/recall, reconnect, and continuation once.

### mirror-mite-bloom
At enemy loss, replace `gain_heat 1` with `take_wound 1`. Text: “Suffer 1 Wound.” Test prevention, recall, enemy cleanup, actual delta, and no replay.

### mirror-rot-interference
At success, replace `lose_heat 1` with heal 1 Wound. Text: “Heal 1 Wound.” Test zero-Wound no-op presentation, exact healing, cleanup, and reconnect.

### pale-contract-collector
At loss, replace `gain_heat 2` with automatic floor-zero Salvage loss 1. Text: “Lose up to 1 Salvage.” Test zero balance, no required-payment branch, enemy cleanup, and exact-once mutation.

### relay-husk
At failure, the owner chooses one equipped normal utility Equipment instance to discard; with no candidate, continue harmlessly. Text names the eligible category. Test owner-only exact-instance choice, Artifact exclusion, stale requests, reconnect, and no-candidate continuation.

### relay-pilgrim-riot
At enemy loss, replace `gain_heat 1` with `take_wound 1`. Text: “Suffer 1 Wound.” Test prevention, recall, cleanup ordering, and duplicate resolution rejection.

### roadside-bone-oracle
Delete only the failure `gain_heat 1` clause; a failed omen grants nothing and resolves normally. Test branch completion, unchanged siblings, no fabricated delta, and approval removal.

### signal-rotted-engineer
At loss, discard the equipped normal weapon; with none equipped, continue harmlessly. Text states the eligible target and no-target result. Test exact-instance authority, Artifact exclusion, privacy, reconnect, and stale choice rejection.

### siren-relay-echo
On success grant +1 Command until turn end; on failure apply −1 Command until turn end. Text states the matching branch and expiry. Test mutual exclusion, totals, same-source non-stacking, reconnect, and authoritative cleanup.

### soot-stained-cutpurse
At loss, replace `gain_heat 1` with automatic floor-zero Salvage loss 1. Text: “Lose up to 1 Salvage.” Test zero balance, exact actual delta, no shop/Contract event, and cleanup.

### spindle-static-squall
At failure, apply −1 Signal until turn end. Text: “−1 Signal until the end of your turn.” Test current-test ordering, subsequent totals, resting-state isolation, reconnect, non-stacking, and expiry.

### webglass-snarefield
At success, replace `lose_heat 1` with heal 1 Wound. Text: “Heal 1 Wound.” Test exact healing, floor zero/no false delta, sibling order, and continuation once.

### crownless-advocate
Once per owner per round, reduce one existing required encounter payment by 1, minimum 0. It never affects optional payments, shops, relic services, or Contracts. Text states the limit. Test atomic validation, round reset, duplicates, reconnect, and exclusions.

### saltflat-bone-reader
Once per owner per round, reveal the already-public tags and rule text of one adjacent canonical sector. Text states public-only scope. Test adjacency, hidden-data exclusion, Rivalry privacy, reconnect, round reset, and no route/legality effect.

## Wording

Use one sentence per changed branch: “Gain 1 Salvage.”; “Lose up to 1 Salvage.”; “Suffer 1 Wound.”; “Heal 1 Wound.”; “Advance Loss Pressure by 1.”; “Advance Global Escalation by 1.” Temporary effects state the exact stat and expiry. Choice effects name eligible targets and their no-target fallback. No wording may mention Heat, Risk, internal IDs, decision versions, or raw discriminators.

## Four-seat findings

- New Player: all costs and consequences are visible; pressure tracks, Salvage, Wounds, and Scars remain distinct; removal branches rely on the visible failed encounter rather than a hidden penalty.
- Optimizer: floor-zero loss is not payment, rewards cannot recursively trigger, duplicate source modifiers do not stack, worthless carried gear cannot absorb equipped-item loss, and reconnect cannot replay outcomes.
- Family Player: batches 1–2 add no prompts; prompts are confined to exact-instance Equipment or note choices; no manual counters are introduced.
- Rules Lawyer: every target, timing, fallback, maximum behavior, prevention window, order, and replay boundary is explicit above. High-risk shared pressure, Scar, and bespoke rules remain approval-gated.
