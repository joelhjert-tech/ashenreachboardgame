# Phase 4D5 — Rift Anchor Spike approval and migration gate

## Outcome

**Approved for implementation.** The authoritative forced-displacement foundation now provides persisted pending state, stable reaction and source-event identities, deterministic legality revalidation, and Route Splice as the first bounded source. **Refuse Displacement** can therefore be implemented without rollback or broad movement immunity.

This pass changes no content, schema, engine, server, phone, TV, tests, assets, or save state. Rift Anchor Spike remains unimplemented.

## Current Spike behavior

`content/cards/artifacts/artifact-rift-anchor-spike.json` defines `artifact-rift-anchor-spike` as a `chargedRelic` with compatibility field `charge: 2`, but its resolved effect is:

1. `gain_gear` for `veil-hook`;
2. add the note “Rift Anchor Spike can steady a shortcut or pin a breach route.”

Artifact draws are resolved immediately in `src/server/roomServer.ts`: the server replaces `draw_artifact` with the selected Artifact's `resolveEffect`, then consumes that Artifact ID from the sector. The current Spike therefore does **not** enter owned inventory, does not receive an exact instance ID, and has no current-charge state. Its two-charge copy is descriptive only. Acquisition produces ordinary Veil Hook gear and removes the Spike card from the sector.

## Veil Hook behavior and provenance

`content/gear/veil-hook.json` is a separate Artifact-tier weapon: +1 Grit, sell value 1, and ordinary gear ownership. It has no charge model and no displacement effect. It can enter play independently through:

- the single-player default starting loadout;
- `artifact-bell-votive` / Bell Votive Casket;
- Contract rewards `cartel-quiet-route` and `contract-lantern-run`;
- Threat rewards `gate-choir-executioner` and `shardvine-ambushers`;
- the current Rift Anchor Spike acquisition effect.

The save shape stores owned embedded gear, not acquisition provenance. A saved Veil Hook cannot be proven to have come from Rift Anchor Spike. Historical event logs are not authoritative ownership or migration state. No destructive or inferential Veil Hook conversion is safe.

Existing saves can therefore contain Veil Hook, including Veil Hook obtained through the old Spike resolution. They can also contain an unclaimed Spike ID in a sector Artifact deck or historical evidence that the Spike was consumed. Normal current play cannot own the Spike itself because no `rift-anchor-spike` gear definition exists. A manually seeded/future embedded Spike-shaped gear record could deserialize if it satisfies the general gear schema, but no current catalog or migration normalizes it.

## Catalog, art, references, and tests

- Canonical sector Artifact decks reference `artifact-rift-anchor-spike` in multiple sectors through `src/game/data/canonicalSectorGraph.ts`.
- Runtime Artifact art correctly maps `artifact-rift-anchor-spike` to `/assets/cards/artifacts/artifact-rift-anchor-spike.png`.
- The runtime art catalog also contains an orphan `artifact-veil-hook` Artifact-art mapping, while the actual owned object is gear ID `veil-hook`; this must not be used as evidence that a Spike instance exists.
- No character, mission, shop, scenario, or enemy directly requires or grants the Spike as owned gear. Its current availability comes from normal Artifact deck/reward eligibility metadata and sector Artifact decks.
- There are no Spike-specific mechanics tests. Generic Artifact draw/resolution tests protect the immediate `resolveEffect` pipeline; numerous starting-loadout, reward, shop, sell, equipment, and UI tests protect Veil Hook as a separate gear object. Replacing the Spike effect later will require focused tests, but Veil Hook tests must remain valid.

Relevant history: `1751f75` introduced the current content family; `9a4b666` and `8dd35bc` separated Equipment and Artifact tiers without correcting the Spike-to-Veil-Hook acquisition mismatch. Commit history informs provenance but does not create migration state.

## Forced-displacement source audit

| Source/path | Classification | Operative sector mutation? | Spike eligibility | Finding |
|---|---|---:|---|---|
| `MOVE_REQUESTED` → `MOVEMENT_RESOLVED` | Ordinary player movement | Yes | Ineligible | Exact-distance, destination, route, gates, blockers, and scenario rules are confirmed before movement. This is voluntary movement, not displacement. |
| Failed normal movement | Movement failure consequence / route correction | No relocation; operative remains at origin | Ineligible | The reducer chooses the origin on failure. There is no pending forced destination. |
| `USE_MARROW_DETOUR` | Movement failure reaction | Yes | Ineligible | Owner selects a server-authorized adjacent detour and pays its approved cost. It is an existing voluntary reaction, not a forced-displacement effect. |
| Ashen Route Compass | Movement total adjustment | No direct relocation | Ineligible | Runs before route generation and changes movement revision. |
| Route Star | Authoritative route selection | No direct relocation until normal confirmation | Ineligible | Chooses a server-issued route for voluntary movement. |
| Void Key / Gate-Saint Key | Passage authorization | No independent relocation | Ineligible | They change authorization, not position. |
| Nemesis movement (`NEMESIS_MOVED`) | Enemy/scenario movement | Moves Nemesis only | Ineligible | It never moves the operative. |
| Scenario boons that say an operative “may move 1 sector” | Optional scenario movement text | No general authoritative resolver found | Ineligible/unsupported | Optional prose is not a typed forced-displacement source and cannot open a reaction. |
| Scenario relocation / teleport / rift movement | Proposed category | None found | Unsupported | No typed current content effect or reducer action moves an operative this way. |
| Knockback / push | Proposed category | None found | Unsupported | No typed current source exists. |
| Tile-challenge displacement consequence | Proposed category | None found | Unsupported | Tile challenges resolve the existing `EncounterEffect` union, which contains no operative movement/displacement member. |

**Current eligible authored forced-displacement sources: zero.** Search terms and state-mutation tracing found no operative relocation outside normal movement and Marrow's explicit detour. Prose references to routes, breaches, being “forced,” or teleportation do not constitute authoritative movement effects.

## Missing authoritative lifecycle

`GameState` currently persists pending failure, Static Intercession, Scar consequence, tile challenge, movement-route, and Route Star state. It has no `pendingDisplacement`, displacement queue, resolved source-event guard, or displacement reaction intent. Phone and TV projections expose no displacement prompt/result state.

The smallest safe prerequisite is a separate movement foundation with a typed source effect and persisted state, for example:

```ts
type PendingDisplacement = {
  reactionId: string;
  ownerSeat: string;
  sourceType: "anomaly" | "tileChallenge" | "scenario" | "threat";
  sourceId: string;
  sourceEventId: string;
  originSectorId: string;
  destinationSectorId: string;
  remainingEffects: EncounterEffect[];
  createdAt: string;
  status: "pending" | "prevented" | "resolved";
};
```

Foundation rules:

1. Only a typed server effect may request displacement.
2. Server validates origin, destination, source, target seat, and current board state before opening the reaction.
3. The operative does not move until the pending state is continued.
4. Decline applies the stored displacement exactly once, then resolves remaining effects in authored order.
5. Prevention suppresses only the displacement member; other effects continue.
6. Stable source/reaction IDs reject stale, wrong-seat, cross-system, and duplicate intents.
7. Pending and queued displacement survives reconnect; resolved events cannot reopen.
8. Voluntary movement, route selection, gate authorization, Marrow detours, and completed journeys never enter this lifecycle.

This foundation must be built and tested independently before the Artifact. It must begin with at least one explicitly approved authored displacement source; adding empty infrastructure with no source would not prove the rule.

## Recommended design

Recommended option: **Refuse Displacement**.

Recommended player-facing rule:

> “Refuse Displacement — Reaction: When an effect would forcibly move or relocate you, but before that movement resolves, spend 1 charge to remain in your current sector. Other effects and consequences resolve normally.”

Recommended values, pending approval after the foundation exists:

- maximum charges: 2;
- starting charges: 2;
- charge cost: 1;
- additional cost: none;
- recharge: none;
- scope: owner only;
- timing: after a typed displacement is pending and before it resolves.

The effect prevents exactly one pending displacement. It does not turn a failed test into success, prevent Wounds or other consequences, refund costs, alter topology, anchor a sector permanently, bypass legality or locks, or undo already-resolved movement.

## Cross-item boundary

Authoritative ordering should be:

1. Resolve pre-roll modifiers and rerolls for the source event.
2. Determine its final result.
3. Resolve ordinary consequence-prevention windows that target their own typed effects.
4. When a remaining typed displacement reaches the front of the consequence queue, open `pendingDisplacement`.
5. Rift Anchor Spike may prevent that displacement once; decline applies it normally.
6. Resolve remaining non-movement consequences.

Marrow remains a failed-movement detour; Blackstar remains a movement/hazard failure reaction; Void Key, Compass, Gate-Saint, and Route Star remain voluntary movement planning/authorization tools. Their IDs and reaction states must never satisfy a displacement intent. Two items cannot suppress the same reaction ID.

## Migration gate

The later content migration must follow these rules:

1. Add a distinct owned gear definition `rift-anchor-spike` using the charged Artifact architecture and keep the canonical card ID `artifact-rift-anchor-spike`.
2. Change only the Spike card's acquisition effect from `gain_gear veil-hook` to `gain_gear rift-anchor-spike` after the displacement foundation is approved.
3. New acquisition creates one exact Spike instance at 2/2 and consumes the Artifact card once. It must never grant Veil Hook or a second reward object.
4. Preserve every existing Veil Hook exactly as stored. Do not remove, rename, convert, or infer its source.
5. Do not backfill a Spike from an already-consumed Artifact or historical log: current saves lack authoritative provenance and doing so could duplicate a reward.
6. Preserve unclaimed `artifact-rift-anchor-spike` sector entries; after migration, claiming one yields the Spike itself.
7. If a legacy save already contains an exact owned `rift-anchor-spike` record, initialize missing charge state once from the catalog maximum, preserve an existing lower `currentCharges`, and never refill on reconnect. This requires an explicit idempotent migration/version marker or a provably one-time normalization boundary; none exists today.
8. Duplicate legitimate Spike instances must receive independent stable instance IDs and charges. Losing one removes only that instance state.

Because the repository has no formal versioned save migration or provenance ledger, items 5 and 7 require explicit implementation design before code changes. The safe default for old Veil Hook ownership is **preserve and do not convert**.

## Phone and TV readiness

The proposed presentation is not implementable until `pendingDisplacement` exists.

- Phone/private: source, public-safe origin/destination, exact owner prompt, charge cost, `Use Rift Anchor Spike — 1 charge`, and `Accept displacement`.
- TV/public after successful use: `Rift Anchor Spike deployed` and `Forced displacement prevented`; no charges or private choices.
- No new focus mode is required; existing resolution presentation can host the eventual public result.

## Approval block

Rift Anchor Spike:

- Selected option: **Refuse Displacement**
- Maximum charges: **2**
- Starting charges: **2**
- Cost per activation: **1 charge**
- Additional cost: **None**
- Recharge: none
- Scope: owner only
- Activation timing: **after an authoritative `pendingDisplacement` opens, before displacement resolves**
- Eligible displacement sources: **approved typed sources; currently Route Splice (`route-splice`)**
- Final rule text: **“Refuse Displacement — Reaction: When an effect would forcibly move or relocate you, but before that displacement resolves, spend 1 charge to remain in your current sector. The source event still counts as having occurred, and all non-displacement effects resolve normally.”**

The block cannot be finalized because the exact eligible source set and authoritative lifecycle do not exist. No provisional interpretation is approved.

## Implementation readiness

**Ready and approved.** Implementation is limited to exact-instance 2/2 charges, the existing authoritative pending-displacement lifecycle, and non-destructive replacement of the old Spike-to-Veil-Hook acquisition behavior. Existing Veil Hooks remain untouched.

No mechanics changed, no rollback was introduced, Veil Hook remains separate, and the three unrelated Phase 1D reports remain untracked.
