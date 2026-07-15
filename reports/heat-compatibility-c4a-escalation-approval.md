# Heat Compatibility C4A: Escalation Heat Retirement Approval

Date: 2026-07-15

Checkpoint: `e291151 feat: remove mirror scenario heat effect`

Scope: report-only approval for:

- `escalation-blackstar-hunger`
- `escalation-choir-feedback`
- `escalation-marrow-surgery-debt`
- `escalation-saltwind-lockdown`

Out of scope: `crownless-advocate`, `saltflat-bone-reader`, all gameplay and content implementation, schemas, validation, tests, clients, assets, and compatibility-field deletion.

## Decision summary

All four escalation Heat leaves are **APPROVED for removal without replacement**.

Each definition already has `escalationDelta: 1`. During sector-card resolution, the server applies that field through the authoritative Global Escalation lifecycle before it records and consumes the escalation card. The separate `resolveEffect` Heat leaf is passed through the generic compatibility effect path, changes no state, and is stripped from phone and TV projections.

The implementation contract is therefore exact:

1. Delete only the scoped card's `resolveEffect` property.
2. Preserve `escalationDelta: 1`, `step`, text, flavor, resolution summary, stable ID, art, and every local-deck entry.
3. Add no Wound, Scar, Salvage, movement, modifier, Equipment, Loss Pressure, or second Global Escalation consequence.

No player-facing wording change is required. None of the four current `text`, `flavor`, or `resolutionSummary` fields names Heat or promises a separate Heat result.

Approval count: **4 approved / 0 blocked**.

Projected authored Heat after implementation: **2 occurrences across 2 follower IDs**.

## Exact authored-effect inventory

Repository search and canonical loading resolve to exactly four escalation Heat occurrences across exactly four IDs. No other escalation definition contains `gain_heat`, `gain_heat_all`, or `lose_heat`.

| Stable ID | Title | Source | Step | Trigger and branch | Current Heat leaf | Authored target | Existing non-Heat rule | Runtime status |
|---|---|---|---:|---|---|---|---|---|
| `escalation-blackstar-hunger` | Blackstar Hunger | `content/cards/escalations/escalation-blackstar-hunger.json` | 4 | Unconditional when drawn from a local escalation deck during sector-text resolution | `resolveEffect: { type: "gain_heat_all", amount: 1 }` | All operatives in the retired model | `escalationDelta: 1` | Heat leaf inert; shared delta active |
| `escalation-choir-feedback` | Choir Feedback | `content/cards/escalations/escalation-choir-feedback.json` | 2 | Unconditional when drawn from a local escalation deck during sector-text resolution | `resolveEffect: { type: "gain_heat_all", amount: 1 }` | All operatives in the retired model | `escalationDelta: 1` | Heat leaf inert; shared delta active |
| `escalation-marrow-surgery-debt` | Marrow Surgery Debt | `content/cards/escalations/escalation-marrow-surgery-debt.json` | 3 | Unconditional when drawn from a local escalation deck during sector-text resolution | `resolveEffect: { type: "gain_heat", amount: 1 }` | Acting operative in the retired model | `escalationDelta: 1` | Heat leaf inert; shared delta active |
| `escalation-saltwind-lockdown` | Saltwind Lockdown | `content/cards/escalations/escalation-saltwind-lockdown.json` | 2 | Unconditional when drawn from a local escalation deck during sector-text resolution | `resolveEffect: { type: "gain_heat_all", amount: 1 }` | All operatives in the retired model | `escalationDelta: 1` | Heat leaf inert; shared delta active |

These cards have no success/failure branch. Selection from the local deck is the trigger. The card summary and shared Global Escalation result are public; no owner-private choice exists.

### Complete current rules

- `escalation-blackstar-hunger`: text "The dark star under the route network pulls metal, courage, and breath into its gravity." Flavor "Every shortcut has a mouth." Resolution "The blackstar tugged the board one mark closer to collapse." Step 4; `gain_heat_all 1`; `escalationDelta: 1`.
- `escalation-choir-feedback`: text "The relay choir overcorrects and turns every stable signal into a shriek." Flavor "Silence would be mercy. The Choir prefers documentation." Resolution "Feedback rattled the relay lines and raised the signal burden." Step 2; `gain_heat_all 1`; `escalationDelta: 1`.
- `escalation-marrow-surgery-debt`: text "Field surgeons call in favors, and every healed wound starts billing the future." Flavor "You can leave the table alive and still owe it blood." Resolution "Surgery debt followed the party as a new lasting mark." Step 3; `gain_heat 1`; `escalationDelta: 1`.
- `escalation-saltwind-lockdown`: text "Void-salt wind cakes the outer lanes and turns every easy crossing abrasive." Flavor "The road is still open. It just hates you now." Resolution "Saltwind closed the comfortable routes and tightened pressure around the party." Step 2; `gain_heat_all 1`; `escalationDelta: 1`.

Player-facing Heat wording: **none** in all four definitions. The only retired-resource authoring is the typed `resolveEffect` leaf.

## Escalation content versus Global Escalation

The four records are escalation-family content cards. That family label is distinct from the Global Escalation mechanic.

The current resolution path is authoritative and already explicit:

1. `resolveSectorCardResolution()` selects one ID from the current sector's finite escalation deck.
2. It returns the card's `resolutionSummary`, optional `resolveEffect`, `escalationDelta`, and consumed card ID.
3. `resolveSpaceTextIntent()` sends `escalationDelta` to `feedEscalation()`.
4. `feedEscalation()` clamps against the solo cap 8 or multiplayer cap 6, updates the modifier band, and invokes existing collapse handling at the cap.
5. `SPACE_TEXT_RESOLVED` records the summary and removes the selected card from that local sector deck.

The retired Heat leaf is not the source of the shared increment. Removing it does not remove or duplicate Global Escalation.

### Threshold and collapse behavior preserved

All four cards retain the current unguarded `escalationDelta: 1` behavior:

- below cap: requested and actual shared delta are +1;
- at one below cap: the card may reach the cap and trigger the existing collapse result once;
- at cap in a compatible active snapshot: actual delta is 0 and existing collapse handling remains authoritative;
- solo cap remains 8;
- multiplayer cap remains 6;
- difficulty modifier remains `floor(escalationLevel / 2)` after clamping.

This is existing behavior, not a new C4A replacement. Gateblind Pulse remains uniquely guarded one step before collapse. Shattered Barricade and these escalation cards remain unguarded and collapse-capable through their existing shared-pressure paths.

## Frequency and stacking

Escalation entries are finite per sector and are removed from that sector's deck after resolution. The same stable ID may exist in multiple sector-local decks, so its maximum authored appearances per session are:

| Stable ID | Local entries | Deck context | Maximum resolutions from authored entries |
|---|---:|---|---:|
| `escalation-blackstar-hunger` | 3 | one middle and two inner sector decks, each 3-4 cards | 3 |
| `escalation-choir-feedback` | 5 | two middle and three inner sector decks, each 2-3 cards | 5 |
| `escalation-marrow-surgery-debt` | 1 | one middle sector deck of 3 | 1 |
| `escalation-saltwind-lockdown` | 1 | one outer sector deck of 4 | 1 |

One resolution changes the shared track once, regardless of player count. More players may visit and clear more eligible sectors, increasing the chance that more finite entries resolve, but `gain_heat_all` is not replaced by a per-player consequence.

Adding any proposed replacement on top of `escalationDelta: 1` would increase escalation-card density beyond current runtime behavior:

- another Global Escalation effect would request +2 total;
- Loss Pressure would create a second shared defeat channel;
- table-wide Wounds could create multiple recalls from one card;
- a movement lock could combine with higher shared difficulty into route denial;
- a temporary modifier could stack with the modifier already derived from Global Escalation;
- Marrow Salvage loss would add personal economic damage to the existing shared penalty.

Removal avoids all of those cascades.

## Option evaluation

### Option A - remove without replacement

**Selected for all four.** The Heat leaves are inert, every remaining definition is mechanically complete through `escalationDelta: 1`, and the summaries already describe shared worsening. Severity remains the current enforced severity.

### Option B - preventable Wound

Rejected. Blackstar, Choir, and Saltwind describe shared environmental deterioration rather than a single immediate injury. Marrow describes debt, but adding a Wound would stack personal harm onto its existing shared increment. No direct Scar or Heat-to-Scar mapping is justified.

### Option C - Salvage loss

Rejected, including for `escalation-marrow-surgery-debt`. Earlier unapproved analysis recommended automatic floor-zero `lose_salvage 1`, but that recommendation did not retire or account for the already-active `escalationDelta: 1`. Adding Salvage loss now would make Marrow the only scoped card with both shared collapse pressure and personal economy damage. It would also create shop-access variance unrelated to the current runtime contract. The word "debt" is insufficient reason to add a second penalty.

### Option D - Global Escalation increase

Rejected as a replacement because it already exists. The correct action is to preserve the authored `escalationDelta: 1`, not add `advance_escalation 1` or another server request. No card-specific guard, overflow, or collapse rule is approved.

### Option E - temporary owner modifier

Rejected. Choir could support Signal interference thematically, but a new modifier would duplicate existing Signal-pressure cards and stack with the ordinary Global Escalation difficulty modifier. No expiry or owner status is needed.

### Option F - movement consequence

Rejected. Saltwind and Blackstar contain route imagery, but no current route, direction, destination, reaction, or no-destination contract belongs to these cards. Adding one would change topology-facing gameplay and could combine with shared difficulty to deny turns.

### Option G - Equipment suppression

Rejected. Choir feedback could be framed as equipment interference, but exact-instance selection, privacy, duration, and fallback would add a lifecycle absent from the current escalation identity.

### Option H - persistent shared effect

Rejected. Global Escalation is already the persistent shared effect. A second card-specific status would add bookkeeping and feedback loops.

### Option I - lore-only rewrite

No rewrite is needed. Current prose is already descriptive and contains no player-resource Heat wording. The mechanical retirement is deletion of the typed Heat leaf only.

## Individual identity reviews

### `escalation-blackstar-hunger`

The dark star's identity is shared cosmic deterioration. Its existing `escalationDelta: 1`, step 4, collapse-facing summary, and inner-heavy distribution already express that identity. A second shared increment or personal attrition would overstate it.

### `escalation-choir-feedback`

The card represents relay-wide Signal deterioration. Its high five-entry distribution makes a new temporary Signal modifier especially stack-prone. The existing shared increment is fast, public, and distinct from Siren Relay Echo's card-specific modifier history because Choir creates no banked owner status.

### `escalation-marrow-surgery-debt`

The prose evokes medical debt, but the implemented card is a shared escalation event: the surgery network's obligations worsen table pressure. Its one local entry limits frequency. The prior floor-zero Salvage recommendation remains historical and unapproved; it is rejected for C4A because it would be additive, not substitutive.

### `escalation-saltwind-lockdown`

The card represents environmental route pressure, not an actual topology mutation. Its outer one-of-four placement and existing shared increment supply bounded pressure without forced movement, route restriction, or deadlock risk.

## Four critique seats

### New player

- Each card produces one public result: its existing summary and Global Escalation +1.
- No Heat row, private choice, or second consequence must be learned.
- The difference remains clear: the escalation card is the content drawn; Global Escalation is the shared track it changes.

### Optimizer

- Zero Salvage cannot trivialize or redirect any result.
- No modifier can be banked and no route timing converts the card into free movement.
- One card entry is consumed once; visiting more eligible sectors can expose additional finite entries.
- Recall cannot be intentionally farmed because C4A adds no Wound or recall effect.

### Family/casual player

- Resolution remains one shared increment plus one summary.
- No private prompt, item inspection, route choice, or persistent card-specific marker is introduced.
- Removal reduces invisible bookkeeping without weakening the active shared pressure.

### Rules lawyer

- Trigger: server-selected local escalation card during sector-text resolution.
- Owner: the acting seat owns the resolution action; the track result is shared and public.
- Amount: existing `escalationDelta: 1` exactly once.
- Cap/collapse: existing unguarded Global Escalation rules.
- Heat effect: removed, not translated.
- Reset: no card-specific status; Global Escalation follows existing session rules.
- Replay/reconnect: existing action log, phase validation, local-deck consumption, and state serialization; implementation must prove no second increment or restored Heat row.

## Approval blocks

### `escalation-blackstar-hunger`

- Current authored Heat rule: Unconditional `resolveEffect: { type: "gain_heat_all", amount: 1 }` when the card resolves.
- Runtime status: Heat leaf is inert; `escalationDelta: 1` actively advances Global Escalation.
- Original gameplay intent: Shared cosmic deterioration and collapse pressure.
- Existing non-Heat effects: `escalationDelta: 1`; step 4; public resolution summary; finite local-deck consumption.
- Selected retirement model: Remove the `resolveEffect` property without replacement.
- Trigger: Server draws this card from the acting operative's current sector escalation deck during sector-text resolution.
- Affected player(s): Shared table through existing Global Escalation; no per-operative replacement.
- Amount: Existing Global Escalation +1; retired Heat amount removed.
- Preventability: No new prevention; existing Global Escalation reactions/abilities remain unchanged.
- Wound interaction: None.
- Scar interaction: None; no Heat-to-Scar conversion.
- Salvage interaction: None.
- Global Escalation interaction: Preserve unguarded `escalationDelta: 1`, cap, modifier, and collapse behavior exactly.
- Movement interaction: None.
- Modifier interaction: Only the ordinary modifier derived from the resulting Global Escalation level.
- Equipment interaction: None.
- Persistence: No card-specific state; shared level persists normally.
- Reset/cleanup: Selected card is consumed from its local sector deck; session reset is unchanged.
- Multiplayer scaling: One shared +1 in every mode; no per-player multiplication.
- Source-event protection: Existing sector-text resolution/action ordering and local-deck consumption; no new source ID.
- Reconnect behavior: Serialized shared level and consumed local deck restore normally; Heat must not reappear.
- Phone presentation: Existing public card summary and authoritative Global Escalation result; no action and no Heat row.
- TV presentation: Same public summary/shared level; no internal IDs or Heat row.
- Runtime support: Ready with content-only removal; existing Global Escalation lifecycle.
- Final player-facing rule: "The blackstar tugged the board one mark closer to collapse." Advance Global Escalation by 1 through the existing card delta; no additional effect.
- Severity: 3; retirement severity delta 0.
- Complexity: Low.
- Balance risk: Low for removal; existing collapse-capable shared pressure remains.
- Approval status: **APPROVED**.

### `escalation-choir-feedback`

- Current authored Heat rule: Unconditional `resolveEffect: { type: "gain_heat_all", amount: 1 }` when the card resolves.
- Runtime status: Heat leaf is inert; `escalationDelta: 1` actively advances Global Escalation.
- Original gameplay intent: Shared relay/Signal deterioration.
- Existing non-Heat effects: `escalationDelta: 1`; step 2; public resolution summary; finite local-deck consumption.
- Selected retirement model: Remove the `resolveEffect` property without replacement.
- Trigger: Server draws this card from the acting operative's current sector escalation deck during sector-text resolution.
- Affected player(s): Shared table through existing Global Escalation; no per-operative replacement.
- Amount: Existing Global Escalation +1; retired Heat amount removed.
- Preventability: No new prevention; existing Global Escalation reactions/abilities remain unchanged.
- Wound interaction: None.
- Scar interaction: None; no Heat-to-Scar conversion.
- Salvage interaction: None.
- Global Escalation interaction: Preserve unguarded `escalationDelta: 1`, cap, modifier, and collapse behavior exactly.
- Movement interaction: None.
- Modifier interaction: No Choir-specific modifier; ordinary Global Escalation modifier only.
- Equipment interaction: None.
- Persistence: No card-specific state; shared level persists normally.
- Reset/cleanup: Selected card is consumed from its local sector deck; session reset is unchanged.
- Multiplayer scaling: One shared +1 in every mode; five finite local entries can raise exposure but not per-player magnitude.
- Source-event protection: Existing sector-text resolution/action ordering and local-deck consumption; no new source ID.
- Reconnect behavior: Serialized shared level and consumed local deck restore normally; Heat must not reappear.
- Phone presentation: Existing public card summary and authoritative Global Escalation result; no modifier status and no Heat row.
- TV presentation: Same public summary/shared level; no private information or Heat row.
- Runtime support: Ready with content-only removal; existing Global Escalation lifecycle.
- Final player-facing rule: "Feedback rattled the relay lines and raised the signal burden." Advance Global Escalation by 1 through the existing card delta; no additional effect.
- Severity: 3 due to the five-entry distribution; retirement severity delta 0.
- Complexity: Low.
- Balance risk: Low for removal; adding a Signal modifier would create medium/high stacking risk.
- Approval status: **APPROVED**.

### `escalation-marrow-surgery-debt`

- Current authored Heat rule: Unconditional `resolveEffect: { type: "gain_heat", amount: 1 }` for the acting operative when the card resolves.
- Runtime status: Heat leaf is inert; `escalationDelta: 1` actively advances Global Escalation.
- Original gameplay intent: Surgery-network debt becoming shared future pressure; old personal-cost wording is obsolete.
- Existing non-Heat effects: `escalationDelta: 1`; step 3; public resolution summary; one finite local entry.
- Selected retirement model: Remove the `resolveEffect` property without replacement.
- Trigger: Server draws this card from the acting operative's current sector escalation deck during sector-text resolution.
- Affected player(s): Shared table through existing Global Escalation; no active-player economy penalty.
- Amount: Existing Global Escalation +1; retired Heat amount removed.
- Preventability: No new prevention; existing Global Escalation reactions/abilities remain unchanged.
- Wound interaction: None; healed or current Wounds are not inspected.
- Scar interaction: None; the phrase "lasting mark" does not grant a Scar.
- Salvage interaction: None. Historical `lose_salvage 1` recommendation is explicitly not approved.
- Global Escalation interaction: Preserve unguarded `escalationDelta: 1`, cap, modifier, and collapse behavior exactly.
- Movement interaction: None.
- Modifier interaction: Ordinary Global Escalation modifier only.
- Equipment interaction: None.
- Persistence: No card-specific debt state; shared level persists normally.
- Reset/cleanup: Selected card is consumed from its one local sector deck; session reset is unchanged.
- Multiplayer scaling: One shared +1 in every mode; no personal tax and no per-player multiplication.
- Source-event protection: Existing sector-text resolution/action ordering and local-deck consumption; no new source ID.
- Reconnect behavior: Serialized shared level and consumed local deck restore normally; no debt or Heat state is reconstructed.
- Phone presentation: Existing public card summary and authoritative Global Escalation result; no payment/loss control and no Heat row.
- TV presentation: Same public summary/shared level; no Salvage total or private inventory exposure.
- Runtime support: Ready with content-only removal; existing Global Escalation lifecycle.
- Final player-facing rule: "Surgery debt followed the party as a new lasting mark." Advance Global Escalation by 1 through the existing card delta; no additional effect.
- Severity: 2; retirement severity delta 0.
- Complexity: Low.
- Balance risk: Low for removal; adding Salvage loss would create unapproved additive economy pressure.
- Approval status: **APPROVED**.

### `escalation-saltwind-lockdown`

- Current authored Heat rule: Unconditional `resolveEffect: { type: "gain_heat_all", amount: 1 }` when the card resolves.
- Runtime status: Heat leaf is inert; `escalationDelta: 1` actively advances Global Escalation.
- Original gameplay intent: Shared environmental/route pressure without topology mutation.
- Existing non-Heat effects: `escalationDelta: 1`; step 2; public resolution summary; one finite local entry.
- Selected retirement model: Remove the `resolveEffect` property without replacement.
- Trigger: Server draws this card from the acting operative's current sector escalation deck during sector-text resolution.
- Affected player(s): Shared table through existing Global Escalation; no forced movement.
- Amount: Existing Global Escalation +1; retired Heat amount removed.
- Preventability: No new prevention; existing Global Escalation reactions/abilities remain unchanged.
- Wound interaction: None.
- Scar interaction: None; no Heat-to-Scar conversion.
- Salvage interaction: None.
- Global Escalation interaction: Preserve unguarded `escalationDelta: 1`, cap, modifier, and collapse behavior exactly.
- Movement interaction: None; routes, allowance, destinations, and entry effects remain unchanged.
- Modifier interaction: Ordinary Global Escalation modifier only; no movement-roll modifier.
- Equipment interaction: None.
- Persistence: No card-specific lockdown state; shared level persists normally.
- Reset/cleanup: Selected card is consumed from its one local sector deck; session reset is unchanged.
- Multiplayer scaling: One shared +1 in every mode; no per-player multiplication.
- Source-event protection: Existing sector-text resolution/action ordering and local-deck consumption; no new source ID.
- Reconnect behavior: Serialized shared level and consumed local deck restore normally; no route restriction or Heat state is reconstructed.
- Phone presentation: Existing public card summary and authoritative Global Escalation result; no route control and no Heat row.
- TV presentation: Same public summary/shared level; topology display remains unchanged.
- Runtime support: Ready with content-only removal; existing Global Escalation lifecycle.
- Final player-facing rule: "Saltwind closed the comfortable routes and tightened pressure around the party." Advance Global Escalation by 1 through the existing card delta; no additional effect.
- Severity: 2; retirement severity delta 0.
- Complexity: Low.
- Balance risk: Low for removal; a route restriction would create unapproved deadlock risk.
- Approval status: **APPROVED**.

## Implementation grouping

### Group 1 - shared-target Heat leaves

- Stable IDs: `escalation-blackstar-hunger`, `escalation-choir-feedback`, `escalation-saltwind-lockdown`.
- Exact content change: delete each sole `gain_heat_all 1` `resolveEffect` property.
- Shared resolver: preserve existing `escalationDelta: 1` and sector-card/Global Escalation resolution.
- Validation changes: remove only these three exact legacy approvals; reject any replacement or reintroduced Heat effect.
- Focused tests: identity/text/step/delta hashes; no `resolveEffect`; one shared increment; ordinary threshold; collapse; cap; card consumption; replay/reconnect; phone/TV no Heat/empty row; local-deck counts unchanged.
- Browser QA: not required for approval; implementation may use existing automated public-summary/projection tests because no interaction is added.
- Risk: Low.
- Recommended commit subject: `feat: remove shared escalation heat effects`.

### Group 2 - active-seat Heat leaf

- Stable ID: `escalation-marrow-surgery-debt`.
- Exact content change: delete the sole `gain_heat 1` `resolveEffect` property.
- Shared resolver: preserve existing `escalationDelta: 1` and sector-card/Global Escalation resolution.
- Validation changes: remove only this exact legacy approval; prove no `lose_salvage`, Wound, Scar, payment, or other replacement was introduced.
- Focused tests: identity/text/step/delta hash; no `resolveEffect`; one shared increment; no personal mutation; economy/Scar/Wound isolation; card consumption; replay/reconnect; phone/TV no Heat/empty row.
- Browser QA: not required; no interaction or private state is added.
- Risk: Low, but isolated to make the rejection of the historical Salvage proposal auditable.
- Recommended commit subject: `feat: remove marrow escalation heat effect`.

Implement Group 1 first as the lowest-risk homogeneous batch. Group 2 follows separately.

## Required implementation tests

For each approved card:

- stable ID, title, step, text, flavor, summary, art lookup, and local-deck membership unchanged;
- `resolveEffect` absent;
- `escalationDelta` remains exactly 1;
- one resolution applies exactly one Global Escalation increment;
- ordinary modifier thresholds still update once;
- one-below-cap may collapse through existing behavior;
- at-cap behavior remains existing behavior;
- selected local card is consumed once;
- duplicate request/reducer replay/reconnect cannot create a second increment or restore the card;
- no Wound, Scar, Salvage, movement, Equipment, modifier, Loss Pressure, or private choice is created;
- owner phone, other phones, and TV show the shared result without Heat or an empty effect row;
- Gateblind Pulse, Shattered Barricade, round pressure, other 12 escalations, and both followers remain unchanged.

## Remaining follower boundary

| Stable ID | Authored Heat count | Unresolved category | Why excluded |
|---|---:|---|---|
| `crownless-advocate` | 1 (`lose_heat 1`) | Follower active-effect and payment-hook identity | Requires follower-use timing, benefit definition, use limit, and owner/private presentation approval |
| `saltflat-bone-reader` | 1 (`lose_heat 1`) | Follower active-effect and information/route-note identity | Requires follower-use timing, exact revealed information, adjacency, privacy, and reset approval |

Neither follower is approved or redesigned in C4A.

## Projected compatibility status

C4A is report-only, so the current authored population remains **6 occurrences across 6 IDs** and the audit verdict remains **FAIL**.

After both approved escalation implementation groups:

- board-authored Heat: 0;
- scenario-authored Heat: 0;
- escalation-authored Heat: 0;
- follower-authored Heat: 2 occurrences across 2 IDs;
- total authored Heat: **2 occurrences across 2 IDs**;
- audit verdict remains **FAIL** until follower approval and implementation.

No gameplay, content definition, schema, validation, test, runtime, UI, projection, asset, follower, Threat, scenario, board, mission, item, or economy value changed in C4A.

## Verification

- Repository classification confirmed exactly four authored escalation Heat leaves: three `gain_heat_all 1` effects and one `gain_heat 1` effect. The only other active authored Heat leaves are the two out-of-scope follower `lose_heat 1` effects. The `reliquary-judge` search match is a stable compatibility-era effect key, not an active typed Heat effect.
- `npm.cmd run validate:content`: passed (including 16 escalations and 109 Threats).
- `npm.cmd run typecheck`: passed.
- Focused escalation, Global Escalation, Heat-containment, projection, Wound/Scar, and movement-adjacent regression selection: 7 files, 205 tests passed.
- `npm.cmd run test:engine`: 57 files, 678 tests passed.
- `npm.cmd run test:integration`: the first contended run had one known reconnect timing failure in `reconnectFlapping.integration.test.tsx` (expected 5 statuses, received 6; 232 of 233 tests passed). The exact isolated test then passed 1 of 1, and the complete integration suite rerun without contention passed 27 files, 233 tests.
- `npm.cmd run test:client`: 26 files, 258 tests passed. Existing missing-art fallback warnings remained non-failing.
- Diff and quarantine checks are recorded after staging: only this report and the two exact planning-report updates are intended; no gameplay or content definition is part of C4A.
