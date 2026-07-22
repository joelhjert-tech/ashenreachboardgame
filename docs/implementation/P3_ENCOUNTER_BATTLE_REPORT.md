# P3 Encounter and Battle Presentation Report

## Outcome

P3 makes encounter and battle presentation auditable without changing encounter rules, dice probability, rewards, penalties, or turn authority. The server now projects one canonical `battlePresentation` model to both clients. The phone presents the owner's next legal action and private choices; the TV presents only public-safe state.

Branch at completion: `ui/tv-movement-focus-mode` at `6bd4fc0`. Work remains uncommitted and unpushed.

## Architecture boundary

Before P3, authoritative battle state already lived on the server, but phone and TV components independently reconstructed presentation stages and parts of the arithmetic from low-level resolution fields. That made totals harder to audit and let legacy payload shapes be interpreted differently.

P3 adds a server-built `BattlePresentation` projection in `src/server/roomServer.ts` with:

- stable battle identity and presentation stage;
- public actor and encounter identity;
- tested skill;
- active base/effective value and named additive modifiers;
- raw operative and enemy dice;
- authoritative final totals and outcome;
- public consequence/reward copy;
- owner-filtered waiting and private-decision state.

The canonical game state remains `activeResolution`, `currentEncounter`, and the existing outcome/event lifecycle. `BattlePresentation` is a view projection, not a second resolver. Clients never calculate success, apply rewards, roll dice, or advance a phase.

Legacy presentation compatibility is explicit: older payloads stored the complete effective value in `modifierTotal`. The TV fallback treats that legacy value as already included rather than adding it twice, while still listing named sources for explanation.

## Encounter flow

The phone and TV now present a coherent sequence:

1. Encounter identity and art.
2. Tested skill and opponent/difficulty.
3. Owner roll or the current private/public waiting reason.
4. Raw dice.
5. Named modifiers and final totals.
6. Success, failure, or canonical tie policy.
7. Consequence or reward.
8. One owner `Continue` action when authoritative state permits it.
9. Clean return to the board.

Long encounter text is clamped in the focused presentation with details available separately. Persistent encounters remain identifiable. The board stays faintly visible behind the TV chamber so location context is not lost.

## Battle arithmetic

Phone and TV consume the same server projection. The phone equation is shown as:

`Base skill + Roll + Modifiers = Total`

The TV shows both sides together, with raw dice, named modifier sources, final totals, and the winning side. Enemy dice remain server-generated and are not exposed as a client action. Tests prove the same projection reaches the owner phone and TV while non-owners receive only safe waiting information.

## Rerolls and reactions

P3 does not alter reroll eligibility or cost. The server continues to own the reaction window, use tracking, charge spending, replacement roll, replay rejection, and completion. The phone now labels the action explicitly as `Reroll — spend 1 charge`, explains that the current roll is replaced, and shows remaining charges. No reroll control is shown to an ineligible phone.

## Reconnect and replay protection

Battle identity is persisted in session storage on both presentation surfaces. If a completed or already-seen battle is restored, `data-battle-restored="true"` suppresses entrance, card-flip, dice, and result animation. This changes presentation only; the restored server state is still authoritative.

Server projection equality across reconnect is covered by tests. The isolated reconnect-flapping integration test passed, and the complete integration suite passed without contention. A restored board may legitimately omit the completed chamber when the canonical phase has already advanced; the QA capture records that behavior rather than fabricating a replay.

## Privacy

- TV receives public combatants, rolls, totals, outcomes, and public results.
- TV never receives private equipment candidates, Scar choices, reactions, missions, or private prompt options.
- The owner phone receives its typed private controls.
- Other phones receive a generic, player-readable waiting state.
- Browser review found no stable internal IDs or private option leakage.

## Accessibility and responsive behavior

- Minimum actionable target size is 44 by 44 pixels.
- Long labels wrap without horizontal overflow.
- Phone layouts were verified at 390×844 and 360×800.
- TV layouts were verified at 1920×1080 and 1366×768.
- `prefers-reduced-motion` disables battle animations and transitions without removing state information.
- Reconnect-restored battles also suppress animation independently of the OS preference.
- Encounter and operative art use contained/cropped responsive images with a fallback.

The QA pass exposed a cached-image race in `HostImage`: decoded images could be reset to a loading state after the browser had already completed the load, leaving a valid portrait at zero opacity. The component now checks `HTMLImageElement.complete` and `naturalWidth`, and loading images remain visible while failure fallback behavior is preserved.

## Browser QA corrections

The first capture pass identified and corrected:

1. Private prompt residue leaking between deterministic QA fixtures. Fixture reset now clears transient prompts, reactions, assistance, and Scar state.
2. Multiple phone pages sharing one browser storage context and overwriting authentication. The capture harness now uses isolated contexts per phone.
3. Valid cached Host art remaining invisible because of the loading-state race.
4. Duplicate encounter/result labels and a center heading competing with the actual totals.
5. A legacy modifier path that could visually double count an already-effective stat.

Final capture: 84 screenshots, five WebM recordings, zero browser console errors, and zero horizontal-overflow findings.

## Four-seat critique

### New player

The acting operative, opponent, tested skill, next action, final winner, and consequence are now visible in a single reading order. Removing duplicate result headings made the outcome easier to identify.

### Optimizer

Raw dice, named modifiers, and totals remain visible simultaneously. The server projection and reconnect identity prevent presentation from implying a second roll or result. Reroll cost is visible before activation.

### Family/casual player

The phone uses one primary action and the TV gives art and totals more space. Long lore no longer displaces the important result, and reduced motion preserves the same information without flips or travel.

### Rules lawyer

Both surfaces display the same server-authored arithmetic and stage. Private prompts stay owner-only, the enemy still rolls exactly once on the server, and reconnect does not replay a completed animation as a new resolution.

## Deliberately unsupported states

- A one-die battle was not fabricated because canonical combat rolls two operative dice.
- A draw fixture was not fabricated because the current resolver applies the canonical tie-success policy.
- The stale-action banner remains owned by the P1 required-action shell; its existing P1 evidence is reused instead of adding a duplicate P3 battle banner.

## Verification

| Command | Result |
|---|---|
| `npm.cmd run validate:content` | PASS — canonical content validated |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test:engine` | PASS — 70 files, 763 tests |
| `npm.cmd run test:rules` | PASS — 12 files, 64 tests |
| `npm.cmd run test:integration` | PASS — 40 files, 348 tests; reconnect flapping included |
| `npm.cmd run test:client` | PASS — 46 files, 397 tests |
| focused P3 projection/UI/fixture/image tests | PASS |
| `npm.cmd run audit:assets` | PASS — 435/435 assets present |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | Wrapper timed out after 364 seconds with no reported failure; all constituent suites passed independently |
| browser QA | PASS — 84 captures, five recordings, zero overflow, zero console errors |

An earlier focused parallel run produced one reconnect timing failure under contention (63/64). The exact test passed in isolation, and the required full integration rerun then passed all 348 tests without contention. Assertions and timeouts were not weakened.

No gameplay authority, encounter probability, reward, penalty, inventory, shop, lobby, movement rule, save version, or privacy rule was changed by P3.
