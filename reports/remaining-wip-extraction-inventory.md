# Remaining WIP Extraction Inventory

Date: 2026-07-10
Branch: `ui/tv-movement-focus-mode`
Baseline: `3d03717 fix: improve phone movement prompt flow`
Scope: report-only audit of tracked dirty WIP; no source changes

## Executive summary

The worktree contains **93 tracked modified files**, **0 staged files**, and a raw diff of **16,418 insertions / 8,718 deletions**. That line count materially overstates the semantic WIP because several large TypeScript/CSS files have formatting or line-ending churn. The cleanest coherent remaining body is the equipment/artifact economy separation, but it should be extracted in layers rather than by staging every economy-adjacent mixed file at once.

Recommended order:

1. **Equipment/artifact tier and asset-identity foundation**
2. **Common-shop Equipment stock and wording**
3. **Completed-Mission ledger and three-for-Artifact trade**

The first track is the safest next extraction. The second has a narrower server surface. The third is the highest-risk economy slice because it crosses reducer state, server authority, shared projections, phone inventory, styles, and tests.

## Inventory baseline

Commands run for this audit:

```text
git status --short
git diff --name-only
git diff --stat
```

Observed tracked diff:

- 93 modified tracked files
- 0 staged files
- 30 artifact card JSON files
- 16 character JSON files
- 23 tracked gear JSON files
- 24 code/test/support files
- no tracked report or documentation modifications before this report

## Primary grouped file table

Each tracked file has one primary group below so the counts total 93. Mixed ownership and extraction dependencies are called out separately.

| Primary group | Count | Likely purpose | Files involved | Landed overlap | Safe next? | Dedupe first? | Risk |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Equipment/artifact economy | 75 | Separate normal Equipment from Artifacts; define starting/common-shop eligibility; replace starting loadouts; align art resolution; update shop wording and availability | `content/cards/artifacts/*.json` (30), `content/characters/*.json` (16), modified `content/gear/*.json` (23), `scripts/audit-assets.ts`, `src/game/assets/runtime/cardArtRuntimeCatalog.ts`, `src/game/data/boardSpaces.ts`, `src/game/rules/shopAvailability.ts`, `src/game/schema/card.schema.ts`, `src/game/schema/gear.schema.ts` | Little overlap in homogeneous JSON. `boardSpaces.ts` and availability wording are coupled to broader shop work. | **Yes, in scoped layers** | Low for JSON/schema/catalog; Medium for shop wording | Medium |
| Server/gameplay WIP | 4 | Completed-Mission storage and Artifact trade; contract progress/rewards; shop services and stock; character/gear timing; other scenario and movement-adjacent behavior | `src/game/engine/actions.ts`, `src/game/engine/reducer.ts`, `src/game/schema/character.schema.ts`, `src/server/roomServer.ts` | `actions.ts`/`roomServer.ts` overlap selected-movement preview and Phase 1 mission work already landed. | Not as one extraction | **Yes** | High |
| Phone UI WIP | 2 | Completed-Mission inventory display; Equipment terminology; movement-resolution routing away from Battle; remaining general phone changes | `src/client/phone/PhoneActionPanel.tsx`, `src/client/phone/PhoneInventoryPanel.tsx` | Both overlap `01107a6`; `PhoneActionPanel.tsx` also overlaps `dc4e90c`, `3d03717`, and `84904f8`. | Only after hunk dedupe | **Yes** | High |
| TV UI WIP | 0 source | No dirty TV component source remains. The only TV-specific tracked dirt is a test-fixture wording change; visual remnants live in the shared stylesheet. | See tests and styles groups | TV top-banner, battle-glass, shop-focus, and movement-focus implementations are already landed. | No new TV extraction indicated | **Yes, for CSS** | Medium |
| Styles-only WIP | 1 | Shared stylesheet contains completed-Mission inventory styles plus large reordered/copied TV shop, TV movement, battle, and phone inspector/movement blocks | `src/client/styles.css` | Strong overlap with all recently landed UI tracks | No | **Mandatory** | High |
| Reports/docs | 0 tracked | No pre-existing tracked report/doc dirt | None before this report | None | N/A | No | Low |
| Tests | 10 | Economy wording, loadouts, random shop stock, Mission-to-Artifact trade, movement-resolution tab separation, and modifications inside heavily reformatted suites | `src/client/__tests__/uiValidationStress.test.tsx`, `src/client/audio/__tests__/audioEventSelectors.test.ts`, `src/client/phone/__tests__/PhoneActionPanel.test.tsx`, `src/client/phone/__tests__/PhoneInventoryPanel.test.tsx`, `src/client/tv/__tests__/TvApp.test.tsx`, `src/game/engine/__tests__/characterRoster.test.ts`, `src/game/engine/__tests__/engine.test.ts`, `src/server/__tests__/phaseTwoShopMechanicsFoundation.test.ts`, `src/server/__tests__/roomServer.integration.test.ts`, `src/server/__tests__/sessionState.test.ts` | Phone and room-server suites overlap landed movement/phone/mission commits. `uiValidationStress` contains a landed movement-flow expectation. | Only when paired with one narrow track | **Yes in mixed suites** | High |
| Unknown/mixed | 1 | Shared public/private projection types for scenario rewards, contract objectives, shop transactions, movement, and completed Missions | `src/client/shared/types.ts` | Overlaps TV movement presentation, selected-movement preview, and Phase 1 mission schemas | No, not wholesale | **Mandatory** | High |

## What the remaining WIP appears to do

### Equipment/artifact economy

The homogeneous content and schema changes are coherent:

- All 30 artifact-card records gain explicit mission, elite-threat, rare-shop, scenario-reward, starting, and common-shop eligibility fields.
- Legacy gear records that represent true Artifacts move to `tier: "artifact"` and are excluded from starts/common shops.
- Normal Equipment gains subtype, starting/common-shop eligibility, sale/cost metadata, and explicit fallback-art permission.
- All 16 playable character loadouts are moved from the mixed legacy pool to one or two normal Equipment records.
- The runtime catalog adds missing Artifact art mappings.
- The asset audit checks starting/common Equipment against Artifact tier/art and validates explicit fallback permission.
- Common shop filtering requires `normalShopCommon !== false` for non-Artifact stock.

This is supported by 26 currently untracked new Equipment JSON records and an untracked focused tier-separation test. Those are candidate inputs for the clean extraction, but must be added explicitly rather than through a blanket `git add`.

### Server/gameplay

The server/game files are not one clean feature. The semantic changes include:

- storing completed Mission IDs on character state;
- consuming three completed Missions as a shop-service cost;
- granting an Artifact from the Mission trade;
- random 2–6 unique Equipment stock reveals;
- player-facing Equipment wording;
- contract objective/reward progression changes;
- gear/follower and character timing changes;
- scenario and movement-adjacent changes in existing authoritative methods.

Because `roomServer.ts` is a large mixed diff and already-landed selected-preview and Phase 1 mission code also touched it, it must be hunk-deduped before any extraction. Do not stage the whole file for the tier foundation.

### Phone UI

The clearly new phone behavior is:

- a Completed Missions inventory block showing progress toward a three-Mission Artifact trade;
- Equipment terminology in shop/inventory surfaces;
- routing movement-resolution results to Action instead of Battle.

The same files also contain residual/reformatted card-inspector, selected-destination, and phone movement prompt-flow code already landed. Extract the Completed Missions inventory only after restoring or removing those duplicate hunks against `HEAD`.

### TV UI

No dirty TV component implementation remains. `TvApp.test.tsx` changes only `Buy Gear` to `Buy Equipment`. TV focus CSS still appears in `styles.css`, but those focus implementations are already landed and should be deduplicated, not extracted again.

### Tests

Focused semantic test additions found in the tracked diff include:

- `stores completed missions and consumes three when traded for an artifact`
- `randomly reveals between two and six unique equipment items`
- `does not show movement resolution dice inside the Battle tab`
- `keeps movement resolution results in Action instead of Battle`

Other suites mostly adjust fixtures/assertions for Equipment wording, new loadouts, completed Missions, and already-landed movement state. Large test-file diffs are heavily inflated by formatting/CRLF churn and must be staged by hunk.

## Duplicate-hunk risk from already-landed tracks

This audit compared normalized added lines in the dirty diff with additions from each landed commit. The counts below are a heuristic: exact shared lines are strong evidence for large distinctive CSS blocks, while generic JSX/test lines can be false positives. Manual hunk review remains required.

| Already-landed track | Evidence remaining in dirty diff | Primary files at risk | Assessment |
| --- | --- | --- | --- |
| TV top banner cleanup (`c56e05d`) | 7 normalized shared lines, mostly shared CSS layout primitives | `src/client/styles.css` | Medium. TV source files are clean; dedupe stylesheet remnants before any CSS extraction. |
| Battle stat glass styling (`baa4248`) | No exact normalized-line matches, but battle-focus selectors remain in the stylesheet diff | `src/client/styles.css` | Medium. Treat as reordered/diverged landed CSS until manually proven new. |
| TV shop focus display (`c58f562`) | 89 normalized shared lines including the distinctive shop-focus section and keyframes | `src/client/styles.css` | **High / confirmed residual duplication.** Remove from dirty WIP before extracting styles. |
| TV movement focus (`957c407`) | 42 normalized shared lines including movement-focus grid selectors and `selectedDestinationId` | `src/client/styles.css`, `src/client/shared/types.ts` | **High.** Dedupe first. |
| Selected movement preview (`dc4e90c`) | 10 normalized shared lines across intent/tests/server broadcasting | `PhoneActionPanel.tsx`, its test, `shared/types.ts`, `actions.ts`, `roomServer.ts`, integration test | High in mixed files. Dedupe before server or phone extraction. |
| Phone feedback/card inspection (`01107a6`) | 47 normalized shared lines including distinctive `phone-card-inspect-*` styles and phone test/source fragments | both phone components, both phone tests, `styles.css` | **High / confirmed residual duplication.** |
| Phone movement prompt flow (`3d03717`) | 24 normalized shared lines including movement state, scroll reset, and compact movement CSS | `PhoneActionPanel.tsx`, its test, `uiValidationStress.test.tsx`, `styles.css` | **High / confirmed residual duplication.** |
| Phase 1 mission schemas (`84904f8`) | 5 exact schema/projection fields plus related mission logic in mixed files | `PhoneActionPanel.tsx`, `shared/types.ts`, `character.schema.ts`, `roomServer.ts` | Medium–High. Preserve genuinely later Mission economy work, but remove already-landed schema/objective hunks first. |

## Recommended next three clean extraction commits

### 1. `feat: separate equipment and artifact tiers`

Include only:

- the 30 artifact-card metadata updates;
- the 23 tracked gear-record updates;
- the 26 explicitly selected new Equipment records;
- the 16 starting-loadout updates;
- `card.schema.ts`, `gear.schema.ts`, `shopAvailability.ts`;
- `cardArtRuntimeCatalog.ts` and the tier checks in `audit-assets.ts`;
- the focused untracked `itemTierSeparation.test.ts` plus narrowly related roster assertions.

Keep out:

- `roomServer.ts`, phone components, `styles.css`, completed-Mission state/trade, random stock sizing, and unrelated wording tests.

Risk: **Medium**. The content boundary is coherent and already has a post-audit. Before extraction, decide whether the six converted Artifact gear records missing `relic-dealer` categories are intentionally not rare-shop reachable, and whether the four reward eligibility fields are declarative-only or enforced now.

### 2. `feat: reveal common equipment stock by shop category`

Include only:

- random 2–6 unique normal-Equipment stock selection;
- normal-shop Artifact exclusion and category fallback behavior;
- Equipment player-facing wording in board/server/phone/TV/audio fixtures;
- the focused random-stock and wording tests.

Likely files: `roomServer.ts` by hunk, `boardSpaces.ts`, `shopAvailability.ts` if not sealed in track 1, `phaseTwoShopMechanicsFoundation.test.ts`, `uiValidationStress.test.tsx`, `audioEventSelectors.test.ts`, `TvApp.test.tsx`, and the untracked `shopEquipmentWording.test.ts`.

Risk: **Medium–High** because `roomServer.ts` is highly mixed. Dedupe selected-preview and Phase 1 mission hunks first.

### 3. `feat: trade completed missions for an artifact`

Include only:

- `completedContracts` state/schema/projection;
- contract completion storage;
- shop cost validation and consumption of three completed Missions;
- server-authoritative Artifact grant;
- Completed Missions phone inventory presentation and narrowly scoped CSS;
- focused reducer/server/phone tests.

Likely files: `character.schema.ts`, `actions.ts`, `reducer.ts`, `shared/types.ts` by hunk, `roomServer.ts` by hunk, `PhoneInventoryPanel.tsx`, `PhoneActionPanel.tsx` only if required for shop copy, `styles.css` only for `phone-inventory-completed-missions`, and relevant focused tests.

Risk: **High**. This should come after tier identity and shop stock are sealed so the trade cannot grant a normal Equipment item through an Artifact path.

## Files to avoid touching wholesale

Do not stage or rewrite these files as whole-file changes during the next extraction:

- `src/client/styles.css`
- `src/client/phone/PhoneActionPanel.tsx`
- `src/client/phone/__tests__/PhoneActionPanel.test.tsx`
- `src/client/phone/PhoneInventoryPanel.tsx`
- `src/client/phone/__tests__/PhoneInventoryPanel.test.tsx`
- `src/client/shared/types.ts`
- `src/server/roomServer.ts`
- `src/server/__tests__/roomServer.integration.test.ts`

Also avoid global formatting, line-ending normalization, or broad formatter runs until the clean tracks are extracted. These files contain both valid remaining WIP and already-landed material.

## Untracked quarantine and candidate inputs

Before creating this report, `git ls-files --others --exclude-standard` returned 144 untracked files:

| Area | Count | Handling |
| --- | ---: | --- |
| `.codex-safety/` | 26 | Safety patches; never include in product commits. |
| `qa-artifacts/` | 49 | QA screenshots/artifacts; remain untracked and uncommitted. |
| `research/` | 37 | Includes 37 Relic reference/contact-sheet images; remain untracked and uncommitted. |
| `reports/` | 4 | Existing audit/QA reports; do not sweep into source commits. |
| `content/gear/` | 26 | Candidate normal-Equipment records for extraction track 1; explicitly review and add only to that clean commit. |
| `src/` | 2 | Focused economy/wording tests; candidate inputs, explicitly add only with their owning extraction. |

The Relic reference images and QA screenshots are confirmed outside the index. Do not use `git add -A`, `git add .`, or directory-wide staging from the repository root.

## Whitespace warning

`git diff --check` reports pre-existing trailing-whitespace findings only in `src/client/phone/__tests__/PhoneActionPanel.test.tsx`. The pattern is consistent with the dirty CRLF/whole-file rewrite already identified before this audit. Do not fix it globally during extraction inventory work. A clean extraction should select semantic hunks from a clean-base worktree so this line-ending churn never enters a commit.

## Verification

- `npm.cmd run typecheck`: **passed**
- `npm.cmd run test`: **passed**, 61 test files and 649 tests
- `git diff --check`: **expected dirty-worktree failure** (exit 2), 7,546 trailing-whitespace findings, all in `src/client/phone/__tests__/PhoneActionPanel.test.tsx`; no other file was reported

Final inventory checks after verification:

- tracked dirty file count remains 93;
- staged file count remains 0;
- this report is untracked;
- no source file was modified by the audit.

## Audit boundary

This report is the only intended file change from the audit. No source file, tracked WIP hunk, untracked Equipment record, Relic reference image, QA screenshot, or safety patch is to be modified or staged.
