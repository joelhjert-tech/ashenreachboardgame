# Item Tier Separation Post-Audit

Date: 2026-07-10  
Branch: `ui/tv-movement-focus-mode`  
Baseline commit: `50c00b5`  
Scope: report-only review of the uncommitted equipment/artifact separation

## Verdict

The core separation is coherent and safe enough for a focused economy playtest: normal starts and common shops are restricted to explicitly eligible equipment, artifact-tier gear is excluded from those paths, and runtime art resolution no longer aliases normal equipment to artifact art.

The implementation is not yet complete as a fully policy-driven reward economy. Artifact reward eligibility is metadata rather than an enforced selector, and six converted artifact gear records cannot currently enter relic-dealer stock because they retain only legacy non-relic shop categories. These are the main blockers before calling the whole reward/shop split release-ready.

No implementation files were changed during this audit.

## 1. Canonical normal equipment

Confirmed 30 canonical normal equipment records. The intended functional groups are six items each:

| Functional group | Count | Schema subtypes |
| --- | ---: | --- |
| Weapons | 6 | `weapon` |
| Armour | 6 | `armour` |
| Tools | 6 | `tool` |
| Medical / survival | 6 | 5 `medical`, Ember Poultice as legacy `supply` |
| Utility / economy | 6 | 5 `utility`, Black Route Fuse as legacy `supply` |

All 30 have:

- a declared subtype;
- a cost;
- sell behavior (`sellValue`, or the shared cost-derived sell rule for Black Route Fuse);
- `startingEligible: true`;
- `normalShopCommon: true`;
- a non-artifact tier;
- equipment-type runtime resolution and no artifact path;
- `allowedFallbackArt: true`.

There are currently zero bespoke runtime-catalog entries for the 30 equipment IDs, so all 30 intentionally resolve to the equipment fallback. This is explicit and audit-safe, but bespoke equipment art remains future polish.

### Normal-equipment risks

- `supply` remains an internal subtype for Black Route Fuse and Ember Poultice. This does not create a player-facing supply economy, but it is a legacy compatibility name likely to confuse future work.
- Black Route Fuse is the clearest tuning watch item: its normal +1 Grit profile includes a discard effect for +3 Grit at the cost of escalation/Heat. It is appropriately risky, but stronger than the mostly passive +1 common pool.
- Chapel Guard Harness and Stormcut Axe are advanced/cost-4 normal equipment. Advanced tier is still normal equipment, but should be watched in common-shop frequency and starting balance.

## 2. Artifact declarations and isolation

All 30 artifact card records explicitly declare:

- `startingEligible: false`;
- `normalShopCommon: false`;
- `missionRewardEligible`;
- `eliteThreatRewardEligible`;
- `rareShopEligible`;
- `scenarioRewardEligible`.

All four reward flags are currently `true` on every artifact. This satisfies declaration completeness but does not yet express “where appropriate” differences among mission, elite-threat, rare-shop, and scenario rewards.

Artifact card IDs resolve exclusively through `/assets/cards/artifacts/`. All 30 artifact card paths are present in the runtime catalog. No artifact-tier item appears in a normal playable starting loadout, and common stock requires non-artifact `normalShopCommon` equipment.

### Reward-policy gap

The four eligibility fields are not consumed by runtime selection outside schema/tests. Sector artifact decks and `draw_artifact` effects remain the operative reward path. Two rare inner enemies explicitly award an artifact:

- Grave-Lattice Reclaimer, difficulty 10, rarity rare;
- The Pale Marshal, difficulty 12, rarity rare.

No ordinary threat JSON was found casually awarding artifacts. That is good current content behavior, but the eligibility metadata itself does not enforce it.

## 3. Converted legacy artifact gear

All ten requested records are artifact-tier, starting-ineligible, common-shop-ineligible, and resolve through prefixed artifact IDs/art:

| Converted gear record | Artifact behavior | Relic-dealer category |
| --- | --- | --- |
| Ashen Route Compass | Confirmed | Missing |
| Blackstar Ampoule | Confirmed | Present |
| Coffin Rig | Confirmed | Missing |
| Grave Lens | Confirmed | Present |
| Marshal Seal | Confirmed | Missing |
| Mirror Reroll Token | Confirmed | Present |
| Oath-Chain Ledger | Confirmed | Missing |
| Red March Warbell | Confirmed | Present |
| Tuning Spines | Confirmed | Missing |
| Veil Hook | Confirmed | Missing |

The missing relic-dealer categories do not leak these items into normal shops because artifact tier is still excluded. They do mean those six records cannot be selected by the current risky relic-dealer category filter despite their artifact status. This should be reconciled with `rareShopEligible` before release.

## 4. Starting loadouts

All 16 non-QA playable characters start with exactly two canonical normal-equipment records. No artifact-tier item is present, every item is starting-eligible, and every art resolver type is equipment.

The loadouts broadly support their roles: combatants receive weapons/armour, route and signal specialists receive tools, the medic receives two medical items, and economy/support characters receive ledgers, kits, or utilities.

Starting package retail values range from 5 to 7 Salvage. Most resale totals are 2; Ker Von Ker and Void Marshal can resell for 3 because both start with Chapel Guard Harness. The items still provide the same basic +1 stat magnitude, so this is not a clear power blocker, but it is a measurable economy advantage worth playtesting.

No character is proven clearly stronger from content inspection alone. Role fit passes; balance remains a playtest question.

## 5. Shops and rewards

Confirmed:

- common stock filters require explicit normal-common equipment and exclude artifact tier;
- standard shops do not expose artifacts even when legacy artifact gear retains a market/armoury category;
- risky artifact stock is limited to `risk` mode plus the `relic-dealer` category;
- QA gear remains behind the existing QA-character allowlist;
- rare inner threats are the only threat content found with direct artifact rewards;
- sector artifact decks and scenario gate logic remain separate from common equipment.

Not fully confirmed as enforced policy:

- mission, elite-threat, rare-shop, and scenario eligibility flags are not used to filter runtime rewards;
- all artifact cards are marked eligible for all four channels, so “where appropriate” is not yet curated;
- six converted artifact gear records need a relic-dealer category if they are intended to be rare-shop stock.

## 6. Asset and runtime catalog

Confirmed:

- normal equipment resolves as type `equipment`, never as `artifact`;
- all normal equipment fallback use is explicitly allowed;
- artifact cards and artifact-tier gear resolve through artifact paths only;
- the five added runtime entries are correct and point to artifact PNGs: Coffin Rig, Grave Lens, Marshal Seal, Tuning Spines, and Veil Hook;
- no normal equipment ID was added as artifact runtime art;
- QA-only behavior remains explicit;
- follower art handling was not changed by the separation diff.

## 7. Audit and test coverage

Existing tests/audits fail for:

- artifact-tier starting gear;
- starting gear not explicitly starting-eligible;
- common/starting equipment resolving through artifact art;
- artifact cards marked starting/common-shop eligible;
- equipment fallback without explicit permission.

Coverage gaps:

- the canonical test does not directly assert cost or sell behavior for all 30 items;
- artifact tests require at least one reward flag, while current content happens to declare all four; they do not require each field to be present;
- the asset audit checks artifact starting/common isolation but not artifact art path/type;
- no test proves reward selectors honor mission/elite/rare/scenario eligibility flags, because runtime selectors do not yet use them;
- no test requires every `rareShopEligible` artifact gear payload to be reachable from relic-dealer stock.

## 8. Remaining risks and wording

### Blocking before release-ready

1. Wire artifact eligibility metadata into the actual mission, elite-threat, rare-shop, and scenario reward selectors, or document the fields as future-only metadata.
2. Reconcile `rareShopEligible` with relic-dealer categories for the converted artifact gear records.
3. Add tests for required reward-field declaration and reward-channel enforcement.

### Non-blocking playtest/polish

- Rename or migrate internal subtype `supply` to `medical`/`utility` in a compatibility-safe pass.
- Add bespoke equipment art over time; all 30 currently use the explicitly permitted equipment fallback.
- Validate the 5–7 Salvage starting-package range and the extra resale point on Ker/Marshal.
- Tune Black Route Fuse and advanced common-shop frequency through playtest.
- Review whether every artifact should truly be eligible for all four reward channels.
- Legacy gear IDs that resemble artifact card IDs remain a maintenance hazard; preserve compatibility but document the prefix mapping.

### Player-facing supply wording

The separate wording pass has already removed the principal player-facing “Buy Supplies” labels in the current worktree. Remaining supply terminology found outside negative tests is:

- internal legacy wire ID `buy-supplies`;
- internal schema subtype `supply`;
- HostShopOverlay keyword matching for legacy service text;
- two player-facing board/effect sentences: “supply stock” and “route supply”.

Those two board/effect sentences should be changed to equipment/field-gear wording in a small focused wording pass. Internal compatibility IDs should remain allowlisted until deliberately migrated.

## Playtest readiness

**Core separation: ready for focused playtest.** Starts, common shops, and art-type boundaries are clean.

**Full reward economy: not release-ready.** Eligibility metadata and relic-dealer reachability need enforcement and tests. These gaps should be tracked during playtest rather than hidden by art aliases or broad common-shop access.

## Worktree and commit boundary

The separation is uncommitted on `ui/tv-movement-focus-mode` at `50c00b5`, mixed with unrelated phone UI, TV shop/focus, battle styling, and other WIP. The requested broad staging command would include quarantined work, so no commit was created during this report-only audit. A clean worktree or carefully enumerated path/hunk staging is required for a focused separation commit.
