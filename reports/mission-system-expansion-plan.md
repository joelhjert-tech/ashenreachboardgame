# Ashen Reach Mission-System Expansion Plan

Date: 2026-07-10  
Mode: report-only architecture plan; no game code or contract content changed.  
Source boundary: the Relic archive informed only high-level pattern analysis. This plan contains original Ashen Reach structures, names, and examples.

## Executive recommendation

Expand the contract engine in four controlled phases. Implement only Phase 1 first: `multiStopRoute` and `shopTransaction`, backed by server-authored progress events and schema-specific objective state. Keep the existing `defeatCount` and `spaceTextResolved` union members unchanged so all 30 current contracts remain valid.

`multiStopRoute` is the best first schema. Ashen Reach already has authoritative movement, authored adjacency, sector tags, mission relevance on movement destinations, and TV map markers. It therefore adds a new mission language with less mechanical risk than inventory custody, deadlines, shared ownership, or hidden rivalry targets. `rivalryIntercept` is the highest-risk schema because an apparently harmless public progress message or map highlight can leak a private target.

## 1. Current system summary

### Content and objective model

The current dirty-worktree snapshot contains 30 contract JSON files and only two objective schemas:

| Objective | Count | Current trigger |
| --- | ---: | --- |
| `defeatCount` | 11 | Any qualifying combat win emits `enemy-defeated` |
| `spaceTextResolved` | 19 | A sector operation emits `space-text-resolved` with a matching `effectKey` |

The active objective state is a scalar `{ contractId, progress }`. Shared helpers clamp progress, format it, and decide completion. This is adequate for a count, but cannot represent ordered visits, distinct targets, carried objects, deadlines, contributors, or private target identity.

### Reward flow

Current authored rewards are 10 sequences, 10 gear grants, 3 Heat reductions, 3 notes, 2 followers, 1 wound heal, and 1 trophy grant. In the current WIP lifecycle, `COMPLETE_CONTRACT` validates that the active contract has reached its target, applies its authored reward, stores the contract ID in `completedContracts`, and clears the active slot. Three stored completed missions can be consumed by the relic-dealer service to grant an artifact.

The completion action must remain atomic and idempotent. Future schemas should change how an objective reaches `readyToComplete`, not create separate client-side reward paths.

### Acceptance and completion lifecycle

1. Contracts enter the available pool through setup or authored sector discovery.
2. A player with no active contract accepts one; a second active contract is rejected.
3. Authoritative game events advance the active objective.
4. The phone offers completion only after the server objective is complete.
5. Completion applies the reward once, stores the completed mission, clears the slot, and returns play to action.
6. The player may accept another available mission.
7. Completed mission cards remain spendable at a relic dealer and count toward scenario progression where required.

### Current presentation

Phone presentation includes starting-mission selection, an active mission card, objective/progress/reward text, movement-destination relevance, completion actions, and completed-mission inventory progress toward `3/3`. It is the correct place for exact valid targets, private mission choices, costs, contribution details, and rivalry data.

TV presentation includes public active-mission summaries, operative-card progress, public mission markers/relevance on the map, and completion/resolution status. It must remain public-safe: compact progress and revealed board relevance are appropriate; private rivalry targets, owner-only choices, and item-sacrifice details are not.

### Current limitations

- Scalar progress cannot record distinct or ordered stops.
- Defeat objectives cannot filter lane, tag, family, sector, or contributor.
- Sector objectives depend on one exact `effectKey`, making target availability fragile.
- There is no authored failure, deadline, regression, custody, hold, or contribution state.
- Completion has no universal event identity for deduplicating repeated projections/actions.
- UI formatters branch directly on the two objective types and will not scale cleanly.
- Mission feasibility is not validated against the selected board/scenario/mode.
- Public and private objective projections are not formalized per schema.

## 2. Proposed engine shape

Add new members to the existing discriminated union; do not replace or reinterpret the old members. Separate immutable contract definition from runtime state:

```ts
type ActiveContract = {
  contractId: string;
  status: "active" | "readyToComplete";
  state: ContractObjectiveState;
  appliedEventIds: string[];
};
```

Use a discriminated, server-produced `MissionProgressEvent` union such as movement arrival, shop transaction committed, threat defeated, turn ended, round advanced, object picked up/dropped/delivered, and contribution recorded. Each event needs a stable ID, actor, turn/round, and only the public fields required by the objective evaluator. The server evaluates legality and mutates state; clients receive schema-specific view models rather than reimplementing completion rules.

Persist historical completion separately from the spendable completed-mission pile if scenarios need lifetime counts. Spending three cards must not erase historical scenario achievement.

## 3. Proposed objective schemas

### A. `multiStopRoute`

**Definition fields**

- Required: `type`, `stops` (2–4 selectors), `order` (`ordered` or `unordered`).
- Each stop selector: one of `sectorId`, `sectorTag`, `ring`, or a validated intersection of tags/ring; optional player-facing label.
- Optional: `distinctSectors`, `maxTurns`, `dangerModifier`, `resetOn`, `ownerMustVisit`, `allowSharedVisit`.

**Runtime state:** matched stop IDs, visited sector IDs, next ordered index, started turn, optional expiry turn.

**Completion trigger:** an authoritative arrival or resolved-sector event satisfies every stop under order and distinctness rules. Route preview is informative only; movement arrival is the trigger.

**Failure:** optional expiry or explicit reset condition. No failure by default. A danger modifier should alter an authored encounter/check, never the movement planner.

**Reward:** normal atomic contract completion path.

**Phone:** ordered/unordered route strip, completed/current stops, valid destination count, reward, danger/expiry warning.

**TV:** public progress pips and revealed valid-sector glow. Show only the next ordered stop, not the phone's full destination list.

**Server validation:** selectors resolve to enough reachable sectors for the current board; ordered stops have at least one legal topological sequence; arrival belongs to the actor; sectors count once when distinctness is required.

**Tests:** ordered and unordered progress; repeated-sector rejection; tag/ring matching; impossible selector rejection; arrival dedupe; route planner unchanged; save/reconnect; public marker projection.

### B. `shopTransaction`

**Definition fields**

- Required: `type`, `transaction` (`buy`, `sell`, `repair`, `upgrade`, or `trade`), `count` or `salvageAmount`.
- Optional: `shopTypes`, `itemTypes`, `minimumCost`, `requiredItemTags`, `sacrifice`, `distinctShops`, `ownerOnly`.

**Runtime state:** qualifying transaction count, accumulated qualifying Salvage, used shop IDs, optional sacrificed item record.

**Completion trigger:** a committed server shop receipt qualifies after all cost, inventory, stock, and shop checks succeed. Opening a shop or clicking a disabled action never advances it.

**Failure:** normally none; an explicitly accepted sacrifice is irreversible only after the transaction commits.

**Reward:** atomic completion; never grant reward inside shop UI.

**Phone:** qualifying service badge, exact remaining count/value, eligible stock markers, sacrifice confirmation, reward preview.

**TV:** public `Mission transaction completed` banner and compact progress. Do not expose inventory choices, private stock deliberation, or rivalry intent.

**Server validation:** reuse shop validator and receipt; verify shop type, final price, item identity/tier, ownership, stock mutation, and a unique transaction ID.

**Tests:** each transaction kind; rejected/rolled-back purchase gives no progress; discounts use paid amount according to authored policy; duplicate receipt ignored; stock race; sacrifice confirmation; artifact/common-equipment separation.

### C. `carriedObject`

**Definition fields**

- Required: `type`, `objectId`, `pickupSelector`, `deliverySelector`.
- Optional: `carrierPenalty`, `dropConditions`, `recoverable`, `transferPolicy`, `expiry`, `publicObject`.

**Runtime state:** object status (`unplaced`, `available`, `carried`, `dropped`, `delivered`, `lost`), sector, carrier seat, pickup/delivery event IDs.

**Completion trigger:** the authoritative carrier resolves delivery at a valid destination while still owning the mission object.

**Failure:** authored loss condition or unrecoverable drop; otherwise dropped objects remain recoverable board state.

**Reward:** after delivery only.

**Phone:** custody, penalty, destination, drop risk, transfer action if legal.

**TV:** public token and carrier/destination summary only when `publicObject` is true.

**Server validation:** a single canonical object instance; atomic pickup/transfer/drop; inventory capacity/timing; carrier and destination legality; reconnect persistence.

**Tests:** double pickup race, drop/recover, invalid delivery, owner defeat/recall, transfer policy, save migration, private object projection.

### D. `escortHold`

**Definition fields**

- Required: `type`, `subject`, and either `holdTurns` plus `holdSelector`, or `destinationSelector`.
- Optional: `damageLimit`, `allowedContributors`, `breakConditions`, `resetOnBreak`, `publicSubject`.

**Runtime state:** subject sector/status, consecutive hold turns, escorting seats, damage/break flags.

**Completion trigger:** end-turn/round validation confirms the required hold duration, or the subject reaches a valid destination under an existing supported movement event.

**Failure:** subject destroyed/lost or authored break condition.

**Reward:** after authoritative end-turn/destination check.

**Phone:** hold duration, protection condition, break risk, legal assist action.

**TV:** public subject marker, `X/Y turns held`, and contested/secure state.

**Server validation:** avoid free-moving NPC simulation. Phase-one-compatible variants use a stationary subject, a carried token, or a subject that advances only on explicit authored events.

**Tests:** consecutive turns, leaving/breaking hold, multiple defenders, phase timing, subject loss, mode fallback, no duplicate end-turn tick.

### E. `threatLaneControl`

**Definition fields**

- Required: `type`, `laneOrTags`, `scope` (sector, ring, or scenario set), `condition` (`clear`, `suppress`, or `keepClear`).
- Optional: `count`, `holdUntil`, `distinctSectors`, `ownerPresence`, `includeNemesis`, `sharedPolicy`.

**Runtime state:** qualifying clears, controlled sector IDs, hold start/end, contributor IDs.

**Completion trigger:** authoritative threat removal or a turn/round checkpoint verifies the defined scope is clear/suppressed.

**Failure:** hold breaks before checkpoint; otherwise progress remains according to authored reset policy.

**Reward:** completion path after board-state revalidation.

**Phone:** qualifying threats/sectors, current control, hold deadline, contribution result.

**TV:** public lane pressure, marked sectors, control pips, and break/completion banner.

**Server validation:** derive from canonical unresolved threats and lane/tag metadata; define whether newly spawned threats break a hold; no client threat counting.

**Tests:** lane/tag filters, persistent threat removal, spawn breaks hold, nemesis inclusion, distinct sectors, concurrent clears, checkpoint timing.

### F. `deadlinePressure`

**Definition fields**

- Required: `type`, nested `objective`, `deadline` (turns or rounds), `onFailure`.
- Optional: `startTiming`, `warningThresholds`, `pauseConditions`, `discardOnFailure`, `modeScaling`.

**Runtime state:** nested objective state, start/deadline counter, warning state, resolved outcome.

**Completion trigger:** nested objective completes before the authoritative deadline checkpoint.

**Failure:** turn/round checkpoint reaches deadline first; apply exactly one declared pressure consequence.

**Reward:** only successful completion. Failure effect and success reward are mutually exclusive and idempotent.

**Phone:** persistent countdown, consequence preview, next valid action, warning escalation.

**TV:** public clock only for public missions; compact warning banner at thresholds.

**Server validation:** precise inclusive/exclusive timing, active-player/round semantics, deduped checkpoint, reconnect handling, and mode-scaled deadlines authored in data.

**Tests:** boundary turn success, deadline-first failure, one-time consequence, nested-state serialization, pause rules, save/reconnect, mode scaling.

### G. `sharedContribution`

**Definition fields**

- Required: `type`, `contributionTypes`, `target`, `creditPolicy`.
- Optional: `perPlayerCap`, `minimumContributors`, `allowedPlayers`, `modeFallback`, `visibility`, `contributionFilters`.

**Runtime state:** total plus per-seat ledger of unique qualifying event IDs and amounts.

**Completion trigger:** accepted contributions reach target and minimum-contributor rules.

**Failure:** optional scenario deadline; otherwise none.

**Reward:** define owner-only, all-contributor, or team reward explicitly. Completed-mission card ownership must remain singular unless the contract is explicitly a team contract.

**Phone:** personal and team totals, accepted contribution history, cap/lock reason, reward ownership.

**TV:** public aggregate and contributor initials only when public-safe; never expose private inventories or payments.

**Server validation:** normalize defeat/pay/visit/test/repair/cleanse events; validate actor and value; dedupe IDs; transactionally update shared state; apply mode fallback in setup.

**Tests:** simultaneous contributions, per-player cap, minimum contributors, owner disconnect, reward ownership, duplicate event, solo fallback, public projection.

### H. `rivalryIntercept`

**Definition fields**

- Required: `type`, private `targetSelector`, `interceptAction`, `soloFallback`, `coopFallback`.
- Optional: `revealTiming`, `targetRefresh`, `nonHarmfulAlternative`, `expiry`, `publicWarning`.

**Runtime state:** owner-private target identity/state, attempts, reveal state, fallback objective state.

**Completion trigger:** server validates the owner performed the intercept action against the current target; solo/co-op execute the authored fallback instead.

**Failure:** target expiry/invalidity invokes refresh or declared failure; never leave an impossible hidden mission silently active.

**Reward:** owner-private until normal public reward rules reveal it.

**Phone:** owner-only target, legal intercept window, fallback text, expiry. Other phones receive no target fields.

**TV:** at most `Hidden agenda active` until reveal; no target glow, destination clue, progress, or identifying banner.

**Server validation:** private projection tests are mandatory; target eligibility and refresh are server-only; action must not enable griefing beyond authored rivalry rules; solo/co-op fallback selected before projection.

**Tests:** owner/non-owner payload comparison, TV redaction, target invalidation/refresh, intercept timing, solo/co-op fallback, reconnect privacy, logs and error text redaction.

## 4. Original contract examples

These are planning examples, not proposed content-file edits.

| Schema | Contract | Faction/lane | Objective and progress | Reward | Risk/failure | Mode and UI note |
| --- | --- | --- | --- | --- | --- | --- |
| `multiStopRoute` | **Three Lantern Circuit** | Meridian Compact / route | Visit signal-tag sectors in outer, middle, then inner ring; `0–3/3` ordered stops | Salvage + completed mission | Optional four-turn expiry | Solo owner visits; co-op may allow one assisted stop; phone route strip, TV next-stop glow |
| `multiStopRoute` | **Cartel Crosswind Ledger** | Pale Cartels / yellow | Visit two distinct salvage or shop sectors in either order | Normal equipment offer + completed mission | Route danger adds Heat only through authored sector result | Rivalry keeps chosen order private; TV shows only revealed stop |
| `multiStopRoute` | **Choir Echo Triangulation** | Glass Choir / blue | Resolve three different anomaly-tag sectors, unordered | Cool Heat + completed mission | Taking a scar resets latest marker | Shared variant permits one teammate-cleared marker |
| `shopTransaction` | **Foundry Proof Marks** | Kaldr Dominion / forge | Repair two equipment cards at foundry-tag shops; `0/2` receipts | Salvage rebate + completed mission | Repair costs remain paid | Phone marks qualifying repair; TV reports progress only |
| `shopTransaction` | **Black Route Exchange** | Pale Cartels / economy | Sell normal equipment worth at least 3 total Salvage at a smuggler or market | Reveal standard equipment + completed mission | Sold gear is irreversibly removed | Artifacts never qualify; owner-only choice on phone |
| `shopTransaction` | **Sealhouse Tithe** | Meridian Compact / support | Pay 2 Salvage for a cleanse/heal service at a chapel sector | Remove Heat or gain note + completed mission | Payment occurs only on committed service | Co-op payment cannot be donated unless authored |
| `carriedObject` | **Ashglass Relay Core** | Glass Choir / blue | Pick up a relay core at an anomaly sector and deliver to a signal sector | Follower lead + completed mission | +1 difficulty on Signal tests; drop on recall | Public token in co-op, private target in rivalry |
| `carriedObject` | **Marshal's Broken Seal** | Meridian Compact / command | Recover a seal from a cleared red sector and deliver to a contract sector | Salvage + mission card | Drops on battle loss, remains recoverable | Phone custody warning; TV token when public |
| `escortHold` | **Keep the Ember Witness** | Veyr Clans / red | Hold a shrine sector with the witness for two consecutive end turns | Trophy value + completed mission | Leaving or an unresolved enemy resets hold | No NPC pathing; stationary public token |
| `escortHold` | **Convoy Under Static** | Kaldr Dominion / route | Carry/escort a convoy token to a middle-ring shop | Equipment discount + completed mission | Convoy drops when carrier recalls | Solo uses carried token; co-op permits transfer |
| `threatLaneControl` | **Quiet the Blue Verge** | Glass Choir / blue | Clear blue threats from two distinct outer sectors | Cool Heat + completed mission | New blue threat before next turn breaks current hold | TV lane markers are public |
| `threatLaneControl` | **Red March Lockline** | Veyr Clans / red | Keep one contract-tag sector free of red threats until next round | Normal weapon offer + completed mission | Red spawn breaks control | Co-op contributions aggregate; rivalry owner must be present |
| `deadlinePressure` | **Before the Bells Go Black** | Meridian Compact / command | Resolve a named-tag sector operation within three owner turns | Salvage + completed mission | Failure adds Loss Pressure or discards mission | Persistent phone clock; public TV warning only if mission public |
| `deadlinePressure` | **Static at the Ninth Pulse** | Glass Choir / blue | Pass two Signal tests before round deadline | Heat relief + completed mission | Failure spawns an authored blue threat | Co-op deadline scales by round, not player turns |
| `sharedContribution` | **Patch the Cinder Line** | Kaldr Dominion / forge | Team contributes three repair/cleanse actions; at least two operatives | Team Salvage + owner's completed mission | Scenario clock may close the line | Phone shows ledger; TV aggregate `2/3` |
| `sharedContribution` | **Common Grave Census** | Veyr Clans / mixed | Team defeats threats worth four qualifying contributions across distinct sectors | Owner reward + contributor notes | Per-player cap prevents soloing co-op version | Solo fallback reduces target and minimum contributors |
| `rivalryIntercept` | **Shadow on the Toll Route** | Pale Cartels / rivalry | Privately intercept a rival after they complete a shop transaction | Salvage + completed mission | Target refreshes if invalid; no forced theft | TV shows only hidden-agenda warning; solo fallback tracks a smuggler token |
| `rivalryIntercept` | **Counter-Signal Claim** | Glass Choir / rivalry | Reach a sector adjacent to the private target and pass a Signal test | Cool Heat + completed mission | Expires after two target turns, then refreshes | Co-op fallback intercepts a moving nemesis marker |

## 5. Engine implementation phases

### Phase 1 — `multiStopRoute` and `shopTransaction`

**Likely files:** contract schema and objective helpers; active-contract state/schema migration; movement-arrival and shop-receipt server event paths; public/private shared types; mission relevance; phone mission/action views; TV map/status views; engine, server integration, phone, and TV tests; 4–6 new contract JSON files.

**Tests:** schema parsing, old-contract regression, event dedupe, ordered/unordered visits, impossible routes, valid/invalid shop receipts, save/reconnect, reward exactly once, phone target/action display, public TV projection.

**Migration risk:** medium. Introduce a compatibility adapter mapping old scalar progress to typed state without rewriting old JSON. Do not silently recalculate active progress from board history.

**UI risk:** low-to-medium. Route detail can overload the phone and excessive map markers can clutter TV. Limit TV to public progress and next/revealed targets.

**Old contracts:** remain valid unchanged.

### Phase 2 — `carriedObject` and `deadlinePressure`

**Likely files:** contract/character/session state, board token projection, inventory/custody reducers, turn/round checkpoint logic, save migration, phone current prompt/inventory, TV board tokens/status, lifecycle tests.

**Tests:** atomic custody, drop/recovery, recall, delivery, deadline boundaries, one-time failure consequence, reconnect/save, mutually exclusive success/failure.

**Migration risk:** high because persistent object custody and clocks add durable state. Version saves and default missing state explicitly.

**UI risk:** medium. Custody and countdown must remain visible without displacing the required phone action.

**Old contracts:** remain valid.

### Phase 3 — `threatLaneControl` and `sharedContribution`

**Likely files:** persistent threat/sector state, engagement and spawn events, shared mission ledger, mode setup, public/private projections, scenario/TV pressure rail, phone contribution history, concurrency tests.

**Tests:** lane filters, hold invalidation, spawn timing, simultaneous contributions, caps, ownership/reward policy, disconnect/reconnect, solo fallback.

**Migration risk:** high. Shared state needs transactional updates and deterministic ordering.

**UI risk:** medium-to-high. The TV can show aggregate team progress; the phone must explain personal credit and lock reasons without becoming a log viewer.

**Old contracts:** remain valid.

### Phase 4 — `rivalryIntercept`

**Likely files:** private rivalry schema/state, room private projection, owner phone mission UI, public redaction layer, mode fallback resolver, privacy and integration tests.

**Tests:** byte-level/field-level payload redaction, TV absence, non-owner phone absence, logs/errors, target refresh, timing, solo/co-op alternatives, reconnect.

**Migration risk:** very high. Existing saves require fallback or safe mission replacement if a target cannot be reconstructed.

**UI risk:** high. Any shared target clue defeats the design and leaks hidden information.

**Old contracts:** remain valid.

`escortHold` should be prototyped only after carried-object and shared-contribution state are stable. It is intentionally not assigned to the first four delivery phases because free-moving NPC pathing is not justified by the current engine.

## 6. UI requirements

### Phone contract view model

Every schema should project the same top-level fields: title, faction, one-sentence objective, progress label/value, valid-target summary, reward preview, risk/failure warning, status, and primary mission action. Add optional schema-specific blocks for route stops, custody, countdown, or contribution history.

- Put the next required mission action above secondary history.
- Mark movement destinations and shop actions as qualifying before confirmation.
- Explain why a visible target/action does not qualify.
- Show exact reward and `N/3 completed missions toward Artifact trade` after completion.
- Keep rivalry details owner-only.
- Reset stale mission prompts when status changes from active to ready/completed/failed.

### TV public view model

Project only public-safe fields: active public mission title or generic hidden-agenda label, compact progress pips, revealed/valid public sector markers, mission event banner, itemized public reward, and `New mission available` status.

- Map remains primary; mission markers support movement rather than replace the board.
- Highlight only next ordered route target unless the objective intentionally reveals all stops.
- Attach battle relevance to battle focus and shop progress to shop focus.
- Never show private rivalry target, contribution payment details, item sacrifice choices, or hidden reward selection.
- Completion sequence: objective confirmed → reward applied → completed card stored → new mission available.

## 7. Reward and artifact integration

Use explicit reward tiers independent of objective schema:

- Routine/low-tier: Salvage, Heat relief, notes, progress, a normal equipment offer, or a completed mission card.
- Significant: a follower, meaningful equipment choice, trophy value, scenario progress, or stronger completion package.
- Major: rare artifact reward only when authored and clearly signaled by difficulty/scenario status.

Every successful contract normally stores one completed mission card in addition to its authored reward. Three spendable completed missions can be traded at a relic dealer for one artifact. The trade must consume the spendable cards atomically while preserving lifetime completion history. Artifact rewards and relic-dealer stock must resolve through the artifact catalog, never normal equipment aliases. Common shops and ordinary low-tier missions should not directly issue artifacts.

The UI should distinguish:

- authored completion reward;
- completed mission card stored;
- current `N/3` relic-dealer trade progress;
- direct rare artifact reward, if any.

## 8. Risk review and mitigations

| Risk | Mitigation |
| --- | --- |
| Objective-state bloat | Discriminated runtime states, compact event-ID ring buffer, no arbitrary key/value mission scripts |
| Multiplayer synchronization | Server-only mutation, stable event IDs, transactional receipts/contributions, deterministic checkpoint order |
| Rivalry leakage | Separate private/public view models and mandatory negative projection tests for TV and non-owner phones |
| UI overload | Common summary model plus one schema-specific detail block; TV shows only public next state |
| Old-save compatibility | Version active objective state, preserve old scalar adapter, define replacement policy for impossible new missions |
| Double rewards | One atomic completion transition, completion event ID, completed status/history, retry tests |
| Dead missions | Content-load feasibility audit plus session/mode validation and explicit target refresh/replacement |
| Route planner dependence | Consume authoritative arrivals/path only; mission system never calculates legal movement |
| Clock ambiguity | Declare owner-turn versus round deadlines and exact checkpoint ordering in schema |
| Shared reward disputes | Author owner, contributor, and team reward policy in data; show it before acceptance |
| Economy drift | Validate normal-equipment vs artifact reward tier and shop type in content audits |

## 9. Recommendation and implementation gate

### Best first schema

Implement `multiStopRoute` first, followed immediately by `shopTransaction` within Phase 1. The route schema exercises typed objective state and distinct/ordered progress using existing authoritative movement and map relevance. Shop transactions then prove that the same event architecture can consume atomic server receipts rather than only movement events.

### First six contracts to create or convert

1. **Three Lantern Circuit** — ordered outer/middle/inner signal route.
2. **Cartel Crosswind Ledger** — two distinct salvage/shop stops, unordered.
3. **Choir Echo Triangulation** — three distinct anomaly sectors.
4. **Foundry Proof Marks** — repair two normal equipment cards.
5. **Black Route Exchange** — sell normal equipment for a qualifying Salvage total.
6. **Sealhouse Tithe** — buy a heal/cleanse service at a chapel shop.

Create these as new contracts unless a specific existing contract's fiction and reward are a clean match. Do not bulk-convert the 30-card deck during the engine proof.

### Tests required before content expansion

- All 30 old contracts parse and complete exactly as before.
- Typed active state serializes, reconnects, and migrates from scalar progress.
- Progress events are deduplicated.
- Ordered, unordered, distinct, and impossible-route cases are covered.
- Shop progress requires a committed valid receipt; rejected actions never count.
- Completion/reward/storage occurs exactly once under retries.
- Completed-card spending preserves lifetime completion history.
- Phone renders target, progress, reward, and risk from a shared view model.
- TV projection contains only public-safe mission fields.
- Rivalry/private fields have explicit absence tests before any rivalry schema work.
- Content validation rejects impossible target selectors and artifact/equipment tier drift.

### Do not implement yet

- Free-roaming escort NPC pathfinding.
- A generic mission scripting language or arbitrary condition expressions.
- Bulk rewrite of existing contracts.
- `rivalryIntercept` before private projection tests exist.
- Shared contribution before transactional event dedupe is proven.
- Deadlines before save/reconnect and exact checkpoint semantics are defined.
- Direct common-shop artifact rewards or equipment-to-artifact aliases.
- Client-side mission legality, route calculation, clocks, or reward application.

## Verification scope

This plan changes only this report. The private Relic reference folder remains outside runtime asset roots and must remain untracked. No reference image, copyrighted card text, mission content, engine code, phone UI, or TV UI is part of this change.
