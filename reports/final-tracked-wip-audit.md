# Final tracked WIP audit after host battle chamber

## Audit boundary

- Destination checkpoint: `20f939c feat: add dedicated host battle chamber`
- Preserved stash: `6f2006dd4f3216baf745b9afcac5947651a6cc9b`
- Audit mode: report-only; the stash and five tracked source files were not modified, staged, applied, popped, or dropped.
- Tracked WIP: 5 files, 384 insertions and 101 deletions.

The remaining tracked diff is approximately **70% obsolete, duplicate, or too broadly mixed to extract safely**, **12% coherent phone-inventory work**, **3% coherent validation work**, and **15% potentially useful shared styling that requires manual hunk extraction**. Line percentages are estimates because the 427-line stylesheet rewrite combines several features in the same replacement block.

## File-by-file classification

### `scripts/validate-content.ts`

| Hunk | Classification | Finding | Recommendation |
|---|---|---|---|
| `PHASE_ONE_DEFERRED_PASSIVE_EQUIPMENT` allowlist | `STILL_RELEVANT_VALIDATION` | Adds 15 explicitly deferred passive Equipment IDs. It is not a charged, consumable, exhaust, tile-challenge, or mission-lifecycle rule. | Extract with the guard below into one validation-only commit after verifying the identifiers against the current catalog. |
| `normalShopCommon && category === "passive"` guard | `STILL_RELEVANT_VALIDATION` | Requires non-deferred common passive Equipment to declare an `effectModel` and `requiresEquipped`. The message mentions both properties, although the condition directly checks only `effectModel`; schema validation may already enforce the paired field once an effect model exists. | Keep only after adding/confirming focused validation coverage for a missing model, a deferred ID, and a correctly typed passive item. Consider making the predicate and message exactly align. |

Feature classification: **Phase 1 passive Equipment / Equipment–Artifact normalization**. It does not implement tier separation, consumable, exhaust, charged, tile-challenge, or mission-completion validation. No equivalent guard was found in the currently landed `validateGearProgression` path, so it is required-but-uncommitted rather than a duplicate.

Extraction readiness: **mostly ready**, but it needs focused tests or fixture validation and a quick audit of the 15-item deferral list. Recommended commit: `test: finalize content validation guards`.

### `src/client/phone/PhoneInventoryPanel.tsx`

| Hunk | Classification | Finding | Recommendation |
|---|---|---|---|
| `useState` import and `InventoryDisclosure` | `STILL_RELEVANT_PHONE_INVENTORY` | Adds accessible, counted, collapsible inventory groups with `aria-expanded`. The entire group remains open initially. | Preserve and extract with only its required CSS and tests. |
| Replace static group heading with `InventoryDisclosure` | `STILL_RELEVANT_PHONE_INVENTORY` | Changes grouping/navigation, not item mechanics or item-state calculation. | Preserve; verify keyboard behavior, long labels, and that collapsing does not create a nested scroll trap. |

The component diff does **not** add or alter charged counts, Ready/Exhausted state, One Use state, equipped/carried classification, Artifact/Equipment separation, artwork inspection, or effect descriptions. Those behaviors already come from landed view-model and card rendering logic. This WIP is a compact inventory-ledger disclosure feature, not “finalize all item states.”

Extraction readiness: **complete at component level but dependent on a small CSS slice and missing focused tests**. Recommended commit title should reflect the actual scope, for example `feat: add collapsible phone inventory groups`; if retaining the proposed title, the report/commit body should clarify that item-state semantics are unchanged.

Required CSS selectors:

- `.phone-inventory-group`
- `.phone-inventory-group-toggle`
- `.phone-inventory-group-toggle::after`
- `.phone-inventory-group.is-open .phone-inventory-group-toggle::after`
- `.phone-inventory-group-label`
- `.phone-inventory-group-count`
- the existing focus-visible rule for `.phone-inventory-group-toggle`

Do not automatically include the broad phone-page, topbar, cards, tab dock, waiting-state, or generic button rewrite from the same stylesheet diff.

### `src/client/tv/TvApp.tsx`

| Hunk | Classification | Finding | Recommendation |
|---|---|---|---|
| Replace `arrival={visualTravel?.arrival}` and `travelStep={visualTravel?.step}` with `arrival={null}` | `OBSOLETE_CONFLICT` | Suppresses landed authoritative arrival/travel detail from the movement HUD. It conflicts with the browser-verified movement journey and journey-before-arrival-focus track. | Discard. Do not restore over `20f939c`. |

No useful post-battle-chamber TV feature remains in this file. The hunk is not needed for the dedicated battle chamber, selected-destination preview, challenge focus, or shop focus.

### `src/client/tv/__tests__/TvApp.test.tsx`

| Hunk | Classification | Finding | Recommendation |
|---|---|---|---|
| Assert two canonical missing-art fallbacks for `outer_anchor_market` | `STILL_RELEVANT_TV_DESIGN` | Strengthens the landed movement-journey fallback test and currently passes. It does not delete recurring-challenge coverage or add the stale “Tactical map” assertion. | Candidate for a tiny test-only commit, or fold into a future canonical tile-art regression commit. Do not mix it with phone inventory or validation. |

No weakened recurring-challenge assertion, stale Tactical-map expectation, or unfinished battle layout remains in the current tracked test diff.

### `src/client/styles.css`

The stylesheet contains 337 additions and 90 deletions and is the highest-risk file.

| Logical group | Classification | Finding | Recommendation |
|---|---|---|---|
| Shared iron/bone/brass command-dashboard restyle | `UNKNOWN` | Broad visual-system replacement touching TV cards, headers, sidebars, buttons, focus, phone surfaces, and status grammar. It is not isolated to a remaining feature. | Needs a separate design decision and clean extraction, not inclusion with inventory. |
| Phone inventory disclosure selectors | `STILL_RELEVANT_PHONE_INVENTORY` | Required by `InventoryDisclosure`; provides 44px toggle, count, open/closed marker, list spacing, and focus treatment. | Extract only the selectors listed above plus any directly referenced variables already landed. |
| Broader phone panel/card/tab/waiting styles | `UNKNOWN` | May improve the Cinder Instrument treatment, but changes many unrelated phone surfaces and generic button states. | Exclude from inventory extraction until separately browser-reviewed at 390×844. |
| TV tile-challenge rule relocation/restyle | `DUPLICATE_LANDED` | Reintroduces/reorders styling already represented by the landed persistent tile-challenge presentation. | Discard unless a rendered defect is independently proven. |
| Movement-journey block rewrite | `OBSOLETE_CONFLICT` | Replaces verified journey sizing/responsive/reduced-motion rules with older mixed WIP. It risks the accepted 1366×768 collision fix and live QA behavior. | Discard in favor of browser-verified committed CSS. |
| Old split map-and-battle and old dedicated battle-stage removals | `DUPLICATE_LANDED` / `FORMATTING_ONLY` | These deletions reflect deduplication performed before landing the clean battle chamber. The committed chamber now owns this area. | Do not extract; current HEAD is authoritative. |
| Generic TV board/route/button emphasis | `UNKNOWN` | Potentially useful design polish, but it affects already accepted banner, movement, board, and controls. | Separate visual QA track only. |

Smallest safe phone CSS boundary: manually extract the disclosure selectors and focus-visible addition; do not copy the surrounding 270-line shared-system block wholesale.

## Stable stash comparison

The stable stash remains readable at `6f2006dd4f3216baf745b9afcac5947651a6cc9b`. None of the five current working files is byte-identical to its stash version.

- The stash version of `PhoneInventoryPanel.tsx` predates the current `InventoryDisclosure`; the current WIP therefore supersedes the stash for the useful phone inventory behavior.
- The stash stylesheet contains older battle-stage/split-map and movement rules now superseded by browser-verified landed commits. It is not a safe source for TV restoration.
- No unrepresented phone component behavior was identified in the stash that should block the current phone disclosure extraction.
- The stash remains useful only as a historical safety archive until the narrow phone CSS selectors have been extracted and the broad current stylesheet WIP has received an explicit keep/discard decision.

Disposition: **keep the stash for now**. After the phone disclosure extraction, validation extraction, and explicit discard or separate preservation of the broad shared-style experiment, compare its remaining phone-style hunks one final time. If no unique reviewed hunk remains, the stash can then be dropped safely. Do not use its moving stash index as identity; retain the stable hash until disposal.

## Dangerous regressions

1. Applying the `TvApp.tsx` hunk would hide authoritative arrival/travel information and could regress the accepted movement-to-focus handoff.
2. Copying the full stylesheet diff would overwrite verified movement responsive/reduced-motion behavior and mix unreviewed phone/TV redesign into a small inventory feature.
3. Restoring stash battle or focus logic would conflict with the dedicated chamber and browser-verified priority ordering.
4. Treating the validation allowlist as permanent would leave 15 passive Equipment items indefinitely outside typed effect enforcement; it must remain an explicit migration deferral.
5. The validation error says `effectModel and requiresEquipped`, while the new predicate only directly checks `effectModel`; focused validation should prove the intended paired requirement.

## Recommended extraction order

### 1. Phone inventory disclosure

Recommended clean commit: `feat: add collapsible phone inventory groups`.

Include:

- `PhoneInventoryPanel.tsx` disclosure hunks.
- Only disclosure-specific CSS and focus styles.
- Focused tests for initial open state, collapse/expand, `aria-expanded`, counts, keyboard activation, long group labels, and preservation of existing charged/exhausted/consumable state copy.

Exclude all TV CSS, generic phone redesign, item mechanics, and validation.

### 2. Passive Equipment validation guard

Recommended clean commit: `test: finalize content validation guards`.

Include:

- the Phase-One deferral set;
- the normal-shop passive Equipment validation predicate;
- focused validation cases and documentation of why each deferred ID remains deferred.

Before landing, align the predicate/message for `requiresEquipped` and confirm no deferred ID has since gained a typed effect model.

### 3. TV cleanup

- Discard the `TvApp.tsx` arrival suppression hunk.
- Either land the one missing-art assertion as a tiny regression-test commit or discard it if equivalent canonical fallback coverage is judged sufficient.
- Discard landed/obsolete movement, challenge, and battle CSS.
- Route the remaining broad visual-system CSS to a separate design-review pass; do not call it battle or movement work.

### 4. Stash disposition

Keep `6f2006dd4f3216baf745b9afcac5947651a6cc9b` until steps 1–3 are complete. It should then be safe to drop only after a final hash-based comparison confirms that no separately approved phone styling exists solely in the stash.

## Recommended file outcomes

| File | Outcome |
|---|---|
| `scripts/validate-content.ts` | `PRESERVE_SELECTED_HUNKS` for isolated validation commit |
| `PhoneInventoryPanel.tsx` | `EXTRACT_TO_CLEAN_BRANCH` with narrow CSS/tests |
| `styles.css` | `PRESERVE_SELECTED_HUNKS`; discard obsolete TV blocks and separately review broad redesign |
| `TvApp.tsx` | `DROP_ENTIRE_STASH_FILE_CONTENT` / discard current dirty hunk |
| `TvApp.test.tsx` | `PRESERVE_SELECTED_HUNKS` only if a tiny fallback regression commit is desired |

## Verification expectations

This audit changes only this report. Source verification should confirm the existing dirty WIP still typechecks and passes the full suite, while `git diff --check` must remain clean. Nothing should be staged.
