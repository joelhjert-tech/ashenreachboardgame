# TV overlap stash audit

## Identity and scope

- Stable stash hash: `6f2006dd4f3216baf745b9afcac5947651a6cc9b`
- Current moving reference at audit time: `stash@{1}`
- Stash subject: `wip: pre-host-movement-journey overlapping tv files`
- Verified comparison checkpoint: `host-movement-journey-live-verified` → `fa83c54ee8726a6583e70029ca8a9939c6cf5629`
- Stash base: `f2c2d57204c578e2791e4b91851ea93a30dfd396`

The stash object is valid (`git cat-file -t` returned `commit`). It was inspected by stable hash and was not applied, popped, dropped, or reordered.

Tracked stash delta:

| File | Added | Removed |
|---|---:|---:|
| `src/client/styles.css` | 529 | 23 |
| `src/client/tv/TalismanBoardSurface.tsx` | 3 | 3 |
| `src/client/tv/TvApp.tsx` | 76 | 25 |
| `src/client/tv/__tests__/TvApp.test.tsx` | 53 | 20 |

## Overall assessment

Estimated by logical ownership rather than raw lines:

- Approximately **78% duplicate, obsolete, contradictory, or unsafe to restore**.
- Approximately **17% still-useful WIP**, principally the dedicated battle-stage and focus-return track.
- Approximately **5% needs an explicit design/extraction decision**, chiefly broad host/phone restyling that is not a self-contained TV feature.

The stash must not be applied as a unit. Its useful work should be reconstructed from the later dirty worktree or extracted selectively against current HEAD. The browser-verified committed journey, challenge handoff, overlay ordering, canonical tile art, and reduced-motion behavior take precedence wherever the stash differs.

## Landed-track overlap

| Landed track | Stash relationship |
|---|---|
| TV top-banner cleanup | Mostly `DUPLICATE_LANDED`; the stash contains broad header/dashboard material now represented by later committed or dirty refinements. |
| Battle stat glass styling | Mixed `DUPLICATE_LANDED` and `STILL_RELEVANT_WIP`; generic battle instrument styling overlaps landed presentation, while the dedicated chamber wrapper remains a separate extraction candidate. |
| TV shop focus | Existing focus-mode behavior is authoritative. Stash changes must not replace current shop priority; no independently valuable shop implementation was found. |
| TV movement focus and selected-destination preview | `DUPLICATE_LANDED`; committed movement preview and planner behavior supersede the stash. |
| Persistent tile challenges | Public challenge styling is duplicated; the deleted recurring-challenge regression test is `TEST_REGRESSION`. |
| Tile-challenge mission integration | No useful mission-lifecycle implementation belongs in this stash. Current projections remain authoritative. |
| Host movement journey | `DUPLICATE_LANDED`; canonical tile art, event identity, route stepping, destination brief, and responsive/reduced-motion styles landed in `848baf8`. |
| Journey-before-arrival-focus correction | Stash ordering is older and incomplete. `c69c5c2` plus live QA is authoritative. |
| Duplicate battle-modifier key fix | Absent from the stash; applying the stash must not disturb `7c36f80`. |
| Final live movement QA | Stash predates the accepted Ashen Chapel/Rift Whispers evidence and cannot override it. |

## File-by-file classification

### `src/client/styles.css`

Recommended outcome: **PRESERVE_SELECTED_HUNKS**, but extract from the later dirty worktree rather than applying this stash file.

| Logical hunk | Classification | Assessment and action |
|---|---|---|
| Removal and re-addition of `.tv-tile-challenges` | `DUPLICATE_LANDED` | Net relocation only. Persistent challenge presentation is landed and tested. Drop from stash extraction. |
| `:root` Ashengate tokens and general motion tokens | `DUPLICATE_LANDED` / `FORMATTING_ONLY` | The token family and reduced-motion baseline exist at current HEAD. Do not replay the stash definitions. |
| Top dashboard/header/card surface cleanup | `DUPLICATE_LANDED` | Broad banner/command-board styling overlaps accepted host UI. Preserve committed behavior. |
| Split battle map context (`.tv-command-stage-battle-mode`, `.tv-command-map-shell--battle-context`) | `OBSOLETE_CONFLICT` | This keeps board context beside combat and conflicts with the approved dedicated battle chamber direction. Do not extract. |
| Generic battle instrument/stat-glass rules | `DUPLICATE_LANDED` | Later battle styling and `HostBattleOverlay` own this surface. Restore nothing wholesale. |
| Phone surface, inventory, bottom dock, and phone status grammar | `STILL_RELEVANT_WIP` / `UNKNOWN_REQUIRES_REVIEW` | Potentially useful, but outside this TV stash extraction and interleaved with separate phone WIP. Review under the phone/inventory track only. |
| Global `prefers-reduced-motion` override | `DUPLICATE_LANDED` | Current motion tokens and journey-specific behavior are verified. Avoid duplicate global overrides. |
| Movement journey styles and responsive rules | `DUPLICATE_LANDED` | Superseded by `848baf8` and the 1366×768 live correction. Applying the old rules risks legend collision and responsiveness regression. |
| Dedicated battle chamber styles | `STILL_RELEVANT_WIP` | Coherent candidate for a clean battle-stage extraction, but the current dirty worktree contains a later version. Use that later version as the source and revalidate 1280×720, 1440×900, and 1920×1080. |
| Dedicated battle reduced-motion rules | `STILL_RELEVANT_WIP` | Keep only with the dedicated battle-stage extraction and verify against current motion tokens. |

Dangerous regressions in this file:

- Reintroducing split map-and-battle composition would contradict the approved dedicated battle chamber.
- Reapplying old journey responsive rules could undo the live-verified 1366×768 legend fix.
- Reapplying all 529 added lines would mix phone redesign, host redesign, movement, challenge, and battle concerns in one commit.

### `src/client/tv/TalismanBoardSurface.tsx`

Recommended outcome: **DROP_ENTIRE_STASH_FILE_CONTENT**.

| Logical hunk | Classification | Assessment and action |
|---|---|---|
| Export `BoardTileImage` | `DUPLICATE_LANDED` | Landed as part of the host movement journey. |
| Optional `className` forwarding for real art | `DUPLICATE_LANDED` | Current canonical renderer supports journey composition. |
| Optional `className` forwarding for missing-art fallback | `DUPLICATE_LANDED` | Current fallback and warning behavior are tested. |

No independent board-rendering feature remains in this stash file. Applying it provides no value and risks overwriting later canonical tile-renderer changes.

### `src/client/tv/TvApp.tsx`

Recommended outcome: **EXTRACT_TO_CLEAN_BRANCH** for the dedicated battle stage only; drop the movement and old priority hunks.

| Logical hunk | Classification | Assessment and action |
|---|---|---|
| `HostMovementJourney` import/model wiring | `DUPLICATE_LANDED` | Landed in `848baf8`. |
| Movement event ID, origin name, visual step buffer, arrival state | `DUPLICATE_LANDED` | Current committed implementation has the accepted identity and timing behavior. |
| Starting a journey while battle is already authoritative | `OBSOLETE_CONFLICT` | The stash's older conditions do not encode the final journey-before-destination-focus contract as verified in `c69c5c2`. Do not restore. |
| Route timing (`360ms`, arrival `650ms`) | `DUPLICATE_LANDED` | Current implementation additionally handles reduced motion and accepted replay prevention. |
| Full-stage early return for `HostMovementJourney` | `OBSOLETE_CONFLICT` | The landed journey architecture and live correction are authoritative. The stash version would risk focus-priority and board-visibility drift. |
| `DedicatedBattleStage` component | `STILL_RELEVANT_WIP` | Self-contained conceptual feature: public battle data, location context, focus entry, board removal. Extract against current HEAD, preferably into a focused component rather than preserving the inline snapshot verbatim. |
| Dedicated battle focus return via `commandMainRef` | `STILL_RELEVANT_WIP` | Useful accessibility behavior, but must be validated with the current battle lifecycle and movement focus queue. |
| Removal of split map battle wrapper | `STILL_RELEVANT_WIP` | Consistent with the approved dedicated battle view. Extract only with current battle tests and responsive browser evidence. |
| Shop overlay conditions | `DUPLICATE_LANDED` / `UNKNOWN_REQUIRES_REVIEW` | Current shop focus is already landed. Do not replace it from this snapshot. |
| Journey completion callback restoring host focus | `OBSOLETE_CONFLICT` | The final live flow owns arrival-to-focus sequencing. An unconditional callback risks focusing the board before a challenge or battle handoff. |

The current dirty `TvApp.tsx` already contains a later dedicated-stage/focus-return implementation. That later dirty version should be audited and extracted; the stash should be retained only as safety evidence until that comparison is complete.

### `src/client/tv/__tests__/TvApp.test.tsx`

Recommended outcome: **PRESERVE_SELECTED_HUNKS** only for battle-stage focus tests; discard movement replacements and regression deletions.

| Logical hunk | Classification | Assessment and action |
|---|---|---|
| Replacing arrival-focus assertions with journey assertions | `DUPLICATE_LANDED` | Current movement journey has focused component/integration coverage and live QA. Use current tests. |
| Canonical route art/fallback assertions | `DUPLICATE_LANDED` | Covered by landed `HostMovementJourney` tests. |
| `queryByText("Tactical map").not...` during movement | `TEST_REGRESSION` | This is the stale expectation involved in the dirty-worktree mismatch. It conflicts with committed HEAD behavior and should not be transplanted. |
| Deletion of recurring-challenge separation regression | `TEST_REGRESSION` | Dangerous. It would remove protection for public recurring challenges versus Threats. Discard this deletion unconditionally. |
| Dedicated battle stage focus/location assertions | `STILL_RELEVANT_WIP` | Useful with the dedicated battle-stage extraction. Rebase onto current fixture/state names. |
| Battle-exit focus restoration test | `STILL_RELEVANT_WIP` | Valuable accessibility regression test, provided it is updated to the extracted current implementation. |
| Existing battle/shop/movement assertions changed only to accommodate unfinished layout | `UNKNOWN_REQUIRES_REVIEW` | Keep current committed expectations unless the future battle extraction intentionally changes the tested public contract. |

## Dangerous regressions

The stash must not be restored wholesale because it would risk:

1. Deleting the recurring-challenge TV regression test.
2. Reintroducing the stale movement-era “Tactical map absent” expectation.
3. Replacing the live-verified journey-before-arrival-focus queue with an earlier implementation.
4. Restoring split battle/map CSS that conflicts with the dedicated battle direction.
5. Mixing phone inventory redesign into a host-TV commit.
6. Overwriting later canonical tile-image, responsive, reduced-motion, and focus-priority work.
7. Losing the duplicate battle-modifier rendering-key correction, which postdates the stash.

## Still-useful WIP

The strongest future extraction candidate is:

### `feat: add dedicated host battle chamber`

Candidate scope:

- Dedicated battle-stage component or equivalent current implementation.
- State-driven switch from board to public battle chamber.
- Public battle location context.
- Focus entry and return behavior.
- Battle-only responsive and reduced-motion CSS.
- Focused TV tests for entry, waiting/resolution/result states, board absence, exit, and focus restoration.

Exclude:

- All movement-journey logic and CSS.
- Selected-destination preview changes.
- Shop focus behavior.
- Phone inventory styling.
- Challenge/mission mechanics.
- The stale `Tactical map` movement expectation.
- Any deletion of recurring-challenge tests.

The current dirty worktree is the preferred source because it contains a later version than this stash. Build the feature in a clean worktree and compare against the accepted host UI commits before landing.

Secondary future decision:

### Phone/Cinder Instrument styling review

The stash contains potentially useful phone inventory and system-state styling, but it is not a TV extraction and requires its own canonical phone review. Do not preserve it through a TV commit.

## Recommended action by file

| File | Outcome | Reason |
|---|---|---|
| `src/client/styles.css` | `PRESERVE_SELECTED_HUNKS` | Dedicated battle CSS and separate phone ideas may remain useful; movement, split-map battle, and broad duplicate rules should be discarded. |
| `src/client/tv/TalismanBoardSurface.tsx` | `DROP_ENTIRE_STASH_FILE_CONTENT` | Entire logical delta is landed canonical image resolver/export support. |
| `src/client/tv/TvApp.tsx` | `EXTRACT_TO_CLEAN_BRANCH` | Extract only the later dedicated battle-stage/focus-return implementation. |
| `src/client/tv/__tests__/TvApp.test.tsx` | `PRESERVE_SELECTED_HUNKS` | Keep/rewrite battle focus tests; discard stale movement expectations and recurring-challenge deletion. |

## Can the stash eventually be dropped?

Yes, but **not yet**.

It can be dropped safely only after:

1. The current dirty dedicated battle-stage and related focus-return WIP is compared with this stash.
2. Any approved battle work is reconstructed and verified on a clean branch.
3. Potential phone styling is either extracted under its own track or explicitly rejected.
4. A final diff confirms the stash contains no unique approved behavior or safety-only work.

Until those conditions are met, retain the stable stash object as a backup. Do not rely on its moving stash index.

## Verification

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: 690 passed, 1 failed. The sole failure is the already-isolated dirty-worktree `TvApp` assertion expecting `Tactical map` to be absent during the movement journey. The same test passes at committed checkpoint HEAD; this audit did not modify it.
- `git diff --check`: passed.
- `git diff --cached --check`: passed.
- Staged files: none.
- Source files changed by this audit: none.
- Stash order/content changed by this audit: none.
