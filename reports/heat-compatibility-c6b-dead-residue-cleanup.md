# Heat compatibility C6B dead-residue cleanup

Date: 2026-07-16

Checkpoint: `5210b2e docs: rerun final heat compatibility boundary`

Phase: C6B

## Result

**CONDITIONAL PASS**

C6B removed the 28 Category F references proven independent of saves, migrations, reconnect, event replay, compatibility unions, projection stripping, and authoring validation. Active gameplay and the 299-reference compatibility boundary are unchanged.

The comparable C6A classification corpus changed from **4,365 Heat substrings across 261 files** to **4,337 across 255 files**:

| Category | Before | After |
|---|---:|---:|
| A — Active authored gameplay | 0 | 0 |
| B — Environmental/art presentation | 13 | 13 |
| C — Required compatibility | 299 | 299 |
| D — Tests and fixtures | 915 | 915 |
| E — Documentation and history | 3,106 | 3,106 |
| F — Dead or obsolete residue | 32 | 4 |
| G — Ambiguous | 0 | 0 |

The repository-wide tracked search at the C6A commit itself contained 4,590 occurrences across 263 files because the committed C6A reports describe the audit. The equivalent working-tree search before this C6B report and report updates contained 4,562 occurrences across 257 files. The 28-reference delta is the same.

## Implementation manifest

| File or symbol | Disposition | Call/reference proof | Compatibility impact |
|---|---|---|---|
| `cardArtPrompts.ts` three retired card samples | Removed | Only prompt aggregation/export referenced the entries; no runtime card catalog or content ID referenced their paths | None |
| `cardTemplatePrompts.ts` retired deck back | Removed | Only prompt aggregation/export referenced the entry | None |
| `cardTemplates.ts` retired template | Removed | Export had no importer | None |
| `iconManifest.ts` retired icon definition | Removed | Export had no importer | None |
| `imagePrompts.ts` obsolete checklist wording/counts | Updated to seven backs and nine surviving sample images | Checklist is design metadata only | None |
| Four PNGs under `public/assets/riftfall/cards/heat/` | Removed | Exact filename/path searches found only their retired prompt entries; runtime catalogs reject the legacy root | None |
| `getGlobalHeatLevel` | Renamed to `getNemesisPressureLevel` | Only its local movement caller used it; the server import was unused | No state or serialized identifier changed |
| `roomServer.ts` stale helper import | Removed | No call site existed | None |
| `shopCategories.ts` `heat` lexical alternative | Removed | No canonical item active text relies on it; explicit shop metadata remains authoritative | None |

## Deferred Category F references

Four occurrences remain:

1. `PortraitControllerView.tsx` defensive `lose_heat` reward formatting;
2. `TvApp.tsx` defensive `lose_heat` reward formatting;
3. `HostShopOverlay.tsx` defensive `service.cost.heat` risk inference;
4. stable Nemesis special-rule ID `heat_on_threat_defeat`.

The three client branches remain until C6C narrows the shared current payload types. Directly constructed stale fixtures still exercise those shapes, so deleting the branches in C6B would conflate dead-code cleanup with protocol narrowing. The stable Nemesis ID may be serialized and remains assigned to C6D/C6F.

## Behavioral proof

- Nemesis pressure still equals the maximum of operative Scar count and Global Escalation.
- Legacy character Heat metadata does not change Nemesis pressure.
- Nemesis movement thresholds and path behavior are unchanged.
- Every canonical gear item retains its existing shop category.
- A synthetic consumable whose only matching word is the retired resource now falls back to `market`.
- Runtime card art remains entirely under `/assets/cards/`.
- The active asset audit no longer expects the four deleted reference images.
- Crownless Advocate and Saltflat Bone-Reader retain their exact explicit `gain_note` effects.

No authored gameplay definition, current schema, compatibility field, migration, reconnect adapter, validation guard, projection stripper, or client compatibility branch changed.

## Verification

Verification passed:

- content validation: 17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, and 30 afflictions;
- TypeScript typecheck;
- Nemesis, shop-category, and runtime asset-boundary set: 3 files / 16 tests;
- compatibility, migration, follower, projection, shop, Nemesis, result-delta, and asset-boundary set: 10 files / 59 tests;
- engine: 60 files / 712 tests;
- integration, including reconnect: 27 files / 234 tests;
- client: 26 files / 261 tests;
- aggregate: 113 files / 1,207 tests;
- asset audit: 418 / 418 present, zero missing, invalid, placeholder, or release-blocking assets;
- production build;
- both diff whitespace checks.

An initial wildcard-focused Wound/Scar/reconnect command matched no files because Vitest does not expand those PowerShell-style patterns. The exact Wound/Scar suites passed in the complete engine run, and the reconnect regression passed in both the uncontended integration and aggregate runs. No retry, delay, or assertion change was added.

## Deferred phases

- C6C: separate current canonical schemas/types from migration-only Heat shapes.
- C6D: migrate follower and Threat metadata plus stable compatibility keys.
- C6E: correct six misleading current documentation statements while retaining history.
- C6F: make the supported-save/version decision before any final compatibility deletion.

No gameplay changed in C6B.
