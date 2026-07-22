# P9 Cross-System Usability Audit

## Overall verdict

P0-P8 now form a coherent playable command flow. The active phone almost always answers “what do I do now?”, the TV consistently presents public context, and reconnect/stale-command protections remain intact. No P0 critical defect or privacy leak was found.

The remaining work is a bounded continuity/polish slice, not a new subsystem. Movement-to-encounter presentation and the small-phone Shop collision are the only high-severity findings.

## Coverage

- Co-op: setup, turn, movement, battle, result, private choice, shop, inventory, End Turn, handoff, reconnect.
- Solo: current partial movement campaign and existing canonical single-player state.
- Rivalry: mode selection and public/private projection boundaries; active agenda progression not reached in browser.
- Reduced motion: setup, movement/shared states, shop, inventory, result, handoff.
- Viewports: phone 360x800, 390x844, 430x932; TV 1366x768, 1600x900, 1920x1080.
- Fresh evidence: 344 screenshots and 14 curated recordings, including partial captures from two failed legacy slice harnesses.

## Core questions

### Does the player always know what to do?

Yes in authoritative states. Setup, movement, battle, private choices, Continue, Shop, Return to Action, and End Turn expose one dominant action. The exception is visual rather than authoritative: the movement arrival explanation can vanish before it is understood.

### Does the host show the correct public context?

Yes. The map dominates planning/movement, focused overlays dominate public resolution, and private options do not appear. Some supporting status copy is truncated or technical, but the public state itself is correct.

### Is the phone the primary action surface?

Yes. TV contains no actionable gameplay controls. Owner-only choices, Salvage, inventory use, and confirmations stay on phone.

### Are transitions coherent?

Mostly. Setup, result, Shop, inventory, End Turn, handoff, and reconnect are coherent. Movement arrival to encounter is abrupt and fails the intended arrival beat.

### Does information disappear or duplicate?

Battle results persist correctly. Waiting phones duplicate actor/context in two panels. Movement arrival disappears prematurely. TV live-status support sometimes repeats enough context to truncate.

### Does reconnect restore stable experience?

Yes in P4, P5, P6, and P7 evidence. The P8 “restored” Join Room screenshot is caused by its audit URL retaining `resetAuth=1` and is not a product failure.

## Phone hierarchy

- Primary actions stay above the fold in audited required states.
- Movement presents roll, route count, destination risk/reward/mission relevance, then confirmation.
- Battle result clearly shows outcome, arithmetic, consequences/reward, and Continue.
- End Turn is above Useful Now content.
- Return to Action remains prominent during inventory inspection.
- Shop is the exception: sticky Leave Shop collides with Previous/Next at 390x844 and 360x800.
- Setup mission selection is long but understandable; mechanics precede lore within the first mission card.

## Host continuity

- Lobby room code and QR are readable at 1366 and 1920.
- Board is dominant during movement and general play.
- Destination markers use letters as well as color.
- Battle participant art and totals are couch-readable.
- Result and acting owner remain visible together.
- Shop art and public transaction state are strong.
- Handoff is brief and non-blocking.
- `BATTLE 0` on enemy arithmetic is mechanically derived but reads like an internal category value.

## Waiting-player experience

Waiting states reliably answer who is acting and broadly what they are doing. Private choices use safe wording. Waiting players can inspect their own public/player-card information without seeing owner options.

Weakness: the waiting phone repeats `P4Owner is acting` and `Waiting for P4Owner` in adjacent framed regions. This feels static and more verbose than necessary, though it does not expose private data.

## Copy consistency

Strengths:

- `YOUR TURN`, `WAITING`, `RESULT READY`, `CONTINUE`, and `TURN READY` are consistent.
- Player display name remains primary; operative identity is secondary.
- Equipment and Item categories are distinct in Shop/Inventory.

Issues:

- TV enemy arithmetic says `BATTLE 0` where “Enemy roll” or “Base 0” would be clearer.
- TV live status sometimes appends actor/context after a complete sentence, producing a visibly truncated tail.
- Setup says “Mission,” while some underlying systems/reports use “Contract.” The rendered setup flow is internally consistent; documentation/content naming should be normalized in a later copy pass without changing rules.

## Image consistency

- Shared card and portrait frames contain all audited art.
- Fallbacks are meaningful and contain no identifiers.
- Shop and battle focal art use appropriate large presentation.
- Inventory card art does not bury required controls.
- No blank cached image was observed.
- The P3 audit wait is stale because it checks every source image rather than visible resolved/fallback frames; this is a tooling issue.

## Accessibility

- Automated measurements found no undersized current controls or horizontal overflow.
- Reduced motion preserves all information.
- Setup does not focus the first operative/mission choice after stage change.
- Shop overlap is an effective touch-access failure despite nominal target sizes.
- No duplicate active live announcement was measured.

## Privacy

Rendered and projected evidence shows:

- TV receives no private Salvage, inventory details, charges, Scar options, Rivalry targets, hidden rewards, or private Artifact options.
- Waiting phones receive no acting-owner options or inventory.
- Owner phone receives its private state and legal controls.
- Fallback, alt, error, reconnect, and live-region copy expose no raw IDs or paths.

## Error and recovery

- Invalid room and full room produce player-facing text.
- Stale Continue and End Turn restore the current state without duplicate effects.
- Shop and inventory reconnect preserve authoritative state.
- Duplicate submission is blocked by immediate locking and server validation.
- Missing art produces a deterministic fallback.
- Active real-network server loss was not simulated; reconnect fixtures/reloads cover state restoration but not LAN outage messaging duration.

## Findings by severity

### P0 Critical

None.

### P1 High

1. **P9-001 Movement arrival presentation is skipped.** Two current P2 runs reached the following Hazard result without exposing `.tv-movement-journey.is-arrived`. This breaks narrative continuity, although server state remains correct.
2. **P9-002 Shop sticky control collision.** Leave Shop overlaps the offer carousel Previous/Next region on 390x844 and is more constrained at 360x800.

### P2 Medium

3. **P9-003 Waiting context duplication.** Actor/action is repeated in two large panels.
4. **P9-004 Setup focus gap.** Initial operative/mission stage leaves focus on the document.
5. **P9-005 TV status truncation.** Supporting context appends redundant actor/phase copy and truncates.
6. **P9-006 Legacy P2/P3 audit harness drift.** P2 observes a transient class that never appears; P3 waits on every document image including intentional fallbacks.
7. **P9-007 Active Rivalry and live server-loss browser coverage gap.** Tests protect authority/privacy, but current end-to-end visual evidence is incomplete.

### P3 Low

8. **P9-008 Technical enemy arithmetic label.** `BATTLE 0` is accurate data rendered with weak player-facing semantics.
9. **P9-009 Mission/Contract vocabulary debt.** Player-facing setup is consistent, but system-wide terminology remains mixed.

## Rejected or non-issues

- P8 Join Room on “reconnect” is caused by `resetAuth=1` in the audit URL.
- Tie shown as success is canonical current rule behavior, not a presentation contradiction.
- Focused battle/shop overlays temporarily hiding the board is intentional resolution framing.
- Long inventory pages requiring vertical scroll are acceptable because the required Return to Action control remains visible.
- No case showed a second actionable TV control or private TV data.

## Four-seat critique

### New player

The next action is clear through setup, movement, battle, result, and End Turn. Arrival-to-encounter is the one moment that feels like the game skipped a sentence.

### Optimizer

Destination markers, totals, offers, and Relevant Now are auditable. The Shop overlap can obstruct rapid offer comparison; otherwise legal options are not hidden.

### Family/casual player

Buttons and text are readable, and waiting identifies the actor. Duplicate waiting panels and abrupt arrival increase cognitive load unnecessarily.

### Rules lawyer

Phone/TV states match authoritative projections and stale/reconnect operations do not replay effects. `BATTLE 0` and truncated TV context should be relabeled so presentation does not imply a nonexistent stat.

## Candidate comparison

| Rank | Direction | Player impact and evidence | Readiness / risk |
|---:|---|---|---|
| 1 | Remaining cross-system polish | Repairs the missing movement-arrival sentence, the obstructed Shop controls, and several repeated/truncated status seams encountered in the main loop. | Best evidence and scope containment; low mechanical and privacy risk. |
| 2 | Host board and map information | The current board, markers, route, and active operative are already readable. More work should wait for long-session density evidence. | Medium surface-area risk; not currently blocking. |
| 3 | Quest, Contract, and private-agenda presentation | Terminology and active Rivalry visual coverage need a dedicated pass. | Privacy-sensitive and not sufficiently exercised by this campaign. |
| 4 | Dice presentation | Current dice, modifiers, totals, and result persistence are already auditable. | A broad pass risks slowing a working interaction; only one TV label is presently justified. |
| 5 | Objectives and endgame | Not reached deeply enough to support a safe redesign recommendation. | Highest progression, scenario, and privacy coupling. |

## Recommendation

Run **P10 — Transition Continuity and Responsive Recovery** before any new feature. It should preserve one visible, non-blocking TV arrival beat, repair the phone Shop bottom-control geometry, consolidate waiting copy, correct setup focus and TV status truncation, relabel the enemy arithmetic input, and stabilize the P2/P3 audit harness. The exact acceptance gates and explicit exclusions are in `docs/plans/P9_NEXT_IMPLEMENTATION_RECOMMENDATION.md`.

## Verification

- Branch: `ui/tv-movement-focus-mode`
- HEAD: `6bd4fc05a292df3749d024070260c27cf61c517a`
- Pre-existing status entries: 98 before and 98 after P9.
- Content validation: passed; 18 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 24 scars, 16 escalations, and 30 afflictions.
- Typecheck: passed.
- Client suite: 405/405 passed.
- Server integration suite: 353/353 passed.
- Engine/rules suite: 763/763 passed.
- Constituent total: 1,521/1,521 passed.
- Production build: passed (557 modules transformed).
- Asset audit: 435/435 present; zero missing, invalid, placeholder, or release-blocking assets.
- `git diff --check`: passed; only pre-existing line-ending warnings were printed.
- `git diff --cached --check`: passed.
- Ports 5173 and 8080: free after closing the audit fixture server that remained after the failed P2/P3 harness path.
- Runtime code, gameplay tests, content, save format, privacy boundaries, and production assets were not changed by P9.
- No commit or push was made.
