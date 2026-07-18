# Host UI Rare-State Closure

## Integration

- Integration branch: `ui/host-rare-state-closure`
- Base checkpoint: `72e9ce8`
- Source branch: `ui/host-complete-audit`
- Integrated commits: `f313796`, `3a1479a`, `26fd325`
- Merge commit: `556f7b8`
- Merge conflicts: none

The integrated movement HUD, consolidated battle outcome, tie wording, concise shop guidance, reconnect precedence, startup QR, reduced-motion, and privacy changes remain intact. Gameplay authority, save version, phone workflows, movement topology, economy transactions, and authored outcomes were not changed.

## Rare-state coverage

| State | Authoritative fixture/evidence | Host treatment | Result |
|---|---|---|---|
| Four stacked operatives | Four normal occupied seats projected at `outer_anchor_market` | Stable seat-order 2x2 marker cluster; active seat receives restrained priority | Complete at both TV viewports |
| Multi-stage reaction | Existing Suture Storm ordered-consequence lifecycle | Current pending owner and applied consequence dominate; private effect/choice identifiers remain absent | Complete, including reconnect and reduced motion |
| Wound / recall / Scar | Existing Wound threshold, recall, pending Scar, and `CONTINUE_SCAR_CONSEQUENCE` lifecycle | Recall is explicitly not defeat; pending and settled Scar states are distinct | Complete for public TV states |
| Server unavailable | Real WebSocket interruption and authoritative reconnect | Last safe board remains visible; stale shop/battle/movement framing and actions are suppressed | Complete through lost, recovering, and restored states |

The QA fixture writes deterministic authoritative state through the same server projection and normal TV components. It does not grant gameplay authority to the browser. The network capture closes the real TV socket, waits for reconnect, and accepts the restored screen only after a fresh `STATE_PATCH`.

## Defects found and corrected

The first rare-state capture exposed three presentation defects:

1. A stale shop overlay outranked pending reaction, recall, and resolved Scar presentation.
2. The shop sidebar remained visible while the server connection was unavailable.
3. A WebSocket `open` event could briefly be presented as restored before authoritative state synchronization.

Corrections:

- Added explicit presentation precedence for reaction, pending Scar, resolved Scar, and recall states.
- Suppressed stale focused-event overlays and the right rail until the host is authoritative again.
- Added subscription synchronization state that becomes true only after a server patch.
- Preserved the last safe board under a clear connection-loss/recovery overlay.
- Added public-safe Scar resolution metadata; no effect, timing, or outcome changed.

## Screenshot review

New captures are stored in `reports/host-ui-qa/rare-states/`:

- `stacked-operatives-1920x1080.png`
- `stacked-operatives-1366x768.png`
- `reaction-stage-pending-1920x1080.png`
- `reaction-stage-final-1920x1080.png`
- `reaction-reconnect-1920x1080.png`
- `reduced-motion-reaction-1920x1080.png`
- `recall-triggered-1920x1080.png`
- `scar-pending-1920x1080.png`
- `scar-resolved-1920x1080.png`
- `server-unavailable-1920x1080.png`
- `server-recovering-1920x1080.png`
- `server-restored-1920x1080.png`

Visual review confirmed zero horizontal overflow, stable four-marker ordering, readable active-seat priority, one dominant rare-state panel, preserved board context, and no stale focused-event UI during network recovery. Browser assertions reported zero console/page errors and no representative private strings.

## Authority and privacy

- The TV receives only server-projected public state.
- Reaction IDs, private effect choices, source event IDs, Artifact choices, follower notes, hidden Contract objectives, Rivalry targets, and private routes are not rendered.
- Animation and reduced-motion preferences never advance gameplay.
- Reconnect restores the projected stage and does not replay completed reactions or Scar consequences.
- Scar resolution metadata contains only public title and summary.

## Four critique seats

- **New player:** the active stacked operative, pending responder, recall-versus-defeat distinction, and lost-server condition are explicit.
- **Optimizer:** stable marker order prevents route ambiguity; reconnect does not reroll choices or replay reaction/Scar presentation.
- **Family/casual:** rare states use one couch-readable panel and avoid long reaction histories or alarming false defeat copy.
- **Rules lawyer:** each screen reflects the projected authoritative stage and owner; private choices remain absent and restored state is labelled as recovery.

## Remaining combinations

The deterministic Suture Storm sequence covers a genuine ordered reaction, but not every possible authored combination of chained item reactions. Character replacement is still completed on the owning phone; TV shows the recalled public state and operative rail rather than inventing a separate replacement cinematic. These are full-session playtest combinations, not known presentation defects.

## Verification

- `npm.cmd run validate:content`: passed (17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers).
- `npm.cmd run typecheck`: passed.
- `npm.cmd run test:client`: 26 files / 279 tests passed.
- `npm.cmd run test:engine`: 62 files / 724 tests passed after the initial three-minute command window timed out.
- `npm.cmd run test:rules`: 7 files / 40 tests passed.
- `npm.cmd run test:integration`: 27 files / 244 tests passed, including reconnect flapping.
- `npm.cmd run audit:assets`: 418 present; zero missing, invalid, placeholder, or release-blocking assets.
- `npm.cmd run qa:host-ui:rare`: 11 states / 12 screenshots; zero overflow, canvas, console, page, or privacy assertion failures.
- `npm.cmd run test`: 115 files / 1,247 tests passed.
- `npm.cmd run build`: passed (144 modules transformed).
- `git diff --check`: passed.
- `git diff --cached --check`: passed.

## Readiness

The four genuine rare-state gaps are closed for deterministic QA. The Host/TV presentation is ready for full-session playtesting; further broad isolated redesign is not warranted.
