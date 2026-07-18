# Ashen Reach Threat Revisions — Phase B2C: Suture Storm

Date: 2026-07-14

Stable ID: `suture-storm`

Approval source: `reports/ashen-reach-threat-duplicate-pattern-approval.md`

Integration baseline: Phase B2B (`6beed0d` after cherry-pick)

## Scope and preserved identity

Phase B2C revises `suture-storm` in place and no other Threat definition. It remains a Red Hazard, Grit 8, severity 4, middle-region uncommon card with the existing success note, lore identity, artwork/runtime ID, deck membership, rarity, and availability. No card was added or removed. Expected distribution remains Red 26, Blue 35, Yellow 48, overall 109.

The prior duplicate pattern was a generic one-Wound failure with no distinctive movement consequence. The approved revision is “Stitched off course”:

> The storm stitches flesh to road. Suffer 1 Wound, then move 1 sector counterclockwise on this ring. If no legal sector is available, suffer 1 Wound instead of moving.

Success remains: “You crossed the storm on the beat between stitches.”

## Exact authoritative consequence order

1. The failed Suture Storm check supplies one typed `take_wound` effect followed by the existing typed `forcedDisplacement` effect.
2. The reducer separates this approved pair under the authoritative encounter/source identity.
3. The normal Wound effect resolves first. The persisted consequence records requested Wounds, prevented Wounds, actual Wounds, resulting Wound total, resulting operative status, and source card.
4. Wound threshold, recall, and Scar handling run before any displacement reaction exists.
5. If the operative remains active, the server computes the canonical counterclockwise same-ring neighbor and opens the existing pending forced-displacement lifecycle.
6. The displacement is accepted or suppressed by an eligible Rift Anchor Spike exactly once.
7. If no legal destination exists initially, or the route becomes illegal before acceptance, a separate one-Wound fallback is queued and passed through normal prevention before the source completes.

The implementation adds a narrow `pendingSutureStormConsequence` record with `afterInitialWound`, `displacement`, and `fallbackWound` stages. It does not add a generic workflow engine or extend the Encounter-effect union.

## Wound lifecycle and displacement matrix

| Final Wound outcome | Displacement eligibility |
| --- | --- |
| One Wound applied; operative remains active | Opens exactly one displacement |
| Initial Wound fully prevented | Opens exactly one displacement |
| Partial prevention | Not applicable to the approved one-Wound amount; any positive remaining result would use the same active-operative rule |
| Wound threshold invokes Deathless Protocol and operative remains active | Opens exactly one displacement after Deathless resolves |
| Wound threshold recalls/scars the operative | No displacement opens |
| Operative defeated/removed from legal board presence | No displacement opens; current authoritative defeat representation is recall |
| Wound lifecycle changes the operative’s sector | Destination is recomputed from the authoritative current sector before displacement |
| No legal destination | No movement; queue one additional preventable Wound |

The initial Wound and fallback Wound both use `applyEffectToState` through the existing server-side prevention transforms. Suture Storm does not directly assign a Wound total. The additional fallback is distinct from the initial Wound and cannot duplicate it.

## Reactions, reconnect, and replay protection

- Wound prevention resolves before `pendingDisplacement` exists, so Rift Anchor Spike cannot appear early or alter the prior Wound result.
- Rift Anchor Spike remains restricted to the existing eligible forced-displacement reaction, exact equipped instance, charge, reaction ID, and displacement source-event ID.
- The pending Suture Storm stage and pending displacement both survive session schema round-trip/reconnect.
- A repeated failure application is rejected while the ordered consequence is in progress.
- Completed displacement source IDs reject stale or repeated displacement actions.
- Rift Anchor Spike clears the linked Suture Storm stage atomically while spending one charge once.
- Recall marks the final status before the linked continuation is closed without movement.

## Phone and TV presentation

The existing Threat result and forced-displacement components remain in use. Public projection exposes only the staged source and authoritative Wound result totals/status. The acting phone receives the existing private displacement reaction only after Wound completion. Other clients and the TV do not receive reaction IDs, source-event IDs, inventory, or private reaction options. No new focus mode or panel redesign was added.

## Focused proof

`src/game/engine/__tests__/threatRevisionsB2cSutureStorm.test.ts` covers:

- exact identity, success note, ordered typed failure, and allowlists;
- success with no Wound or displacement;
- initial Wound recorded before displacement;
- full prevention still followed by displacement;
- threshold recall plus Scar with no later displacement;
- canonical counterclockwise same-ring movement;
- reconnect/schema reconstruction and public-safe projection;
- illegal-destination fallback through Ker’s normal prevention;
- Rift Anchor Spike timing, charge atomicity, and replay rejection;
- duplicate failure and displacement rejection.

Regression verification also includes the B2A Salvage/displacement tests, B2B Shattered Barricade tests, normal Wound/Scar tests, forced-displacement/Rift Anchor Spike tests, engine, client, full suite, content validation, asset audit, typecheck, and build.

## Playtest risks

- The result cadence has two visible beats; confirm players understand that preventing the first Wound does not anchor them in place.
- At the Wound threshold, recall/Scar feedback must remain visually dominant so players do not expect a movement prompt.
- The no-route case can produce a second Wound; wording and staged feedback must make clear that it replaces movement rather than repeats the original penalty accidentally.
- Public result totals are safe, but private Rift Anchor Spike ownership must remain phone-only under reconnect and multi-phone observation.

## Out-of-scope confirmation

`glass-chime-swarm`, `spindle-static-squall`, all 17 additional Heat-linked IDs, the +116-card expansion, scenarios, missions, Contracts, economy, Global Escalation behavior, and unrelated items were not revised. The two Heat-linked duplicate cards remain blocked behind their individual Heat-retirement decisions.
