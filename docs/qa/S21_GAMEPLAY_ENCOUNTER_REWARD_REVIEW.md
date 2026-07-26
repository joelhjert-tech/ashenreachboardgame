# S21 Gameplay, Encounter, and Reward Review

## Outcome

A genuine single-player run of **The Broken Seal** completed on the connected Samsung S21+ using ordinary visible controls and authoritative server outcomes.

- Device: Samsung SM-G996B.
- Measured viewport: 384 × 722 CSS pixels at DPR 2.8125.
- Final outcome: Defeat.
- Duration: 42.454 seconds under the automated legal-control play policy.
- Legal phone actions: 64.
- Terminal state: `ended`, `broadcast`.
- Reconnect evidence: result-ready state restored.
- Phone console errors: 0.
- TV console errors: 0.
- Request failures: 0.
- Horizontal overflow: 0.
- Canvas nodes: 0.

The run covered setup, movement, cross-reach guidance, tile challenges, enemy battles, rewards, shop access, inventory, pressure, result acknowledgement, reconnect, and endgame. The event trace and screen evidence are stored under `.tmp-playtest/s21-gameplay-map-review/natural-broken-seal-after-fix`.

## Confirmed defects and fixes

### Direct sector checks could strand the turn

The first natural run stopped at the Cinder Fields direct sector check. The server had rolled authoritatively, but the phone received a required-action projection with no actionable control.

Cause: direct `RESOLVE_SPACE_TEXT` checks did not run the same automatic consequence lifecycle as Threat checks.

Fix: direct sector resolutions now process non-interactive consequence work and settle at the same stable result-ready state. A regression proves the board-text event resolves once and one final Continue clears the result.

Evidence:

- Before: `.tmp-playtest/s21-gameplay-map-review/natural-broken-seal/broken-seal-1p/stall-s21-physical.png`
- After: `.tmp-playtest/s21-gameplay-map-review/natural-broken-seal-after-fix`

### Redundant Continue stages

Previously, the server exposed roll result, outcome summary, and awaiting acknowledgement as separately actionable stages. This could require two generic Continue presses.

Fix:

- Non-interactive consequences are applied automatically.
- Settled resolutions stop at `awaiting_continue`.
- One generic Continue advances from the final stable result.
- Actual reactions or failure acceptance retain specific decision labels.
- Legacy `outcome_summary` restoration is consumed safely without requiring two generic presses.

### Early or stale results

Fix:

- Battle and challenge results are shown only during authoritative result stages.
- Pre-roll screens show the card, tested stat, authored difficulty, and stakes, but no dice, calculated total, success/defeat label, crest, reward, or consequence.
- Presentation data must match the active resolution identity.
- A stale previous encounter cannot populate the current challenge.

Physical evidence:

- `resolution-entry-s21-physical.png` shows the ready state without a result.
- `result-ready-s21-physical.png` shows the final total and consequence after the roll.

### Misleading passive inventory controls

Passive equipped bonuses no longer receive an active-use control unless the authoritative object-use projection explicitly marks that instance usable. Their contribution remains visible as already applied.

## Gameplay and UI findings

### Movement

The roll, destination, confirmation, journey, and arrival controls remained within the 384 × 722 viewport. The bottom navigation stayed separate from the command viewport. No horizontal overflow was observed.

Movement results required one final Continue before arrival processing. The authoritative route and destination remained server-owned.

### Encounters and battles

Card reveal and battle-ready states did not expose outcome information. Final opposed battles project authoritative final totals. Raw intermediate arithmetic is not required for the compact result verdict.

Repeated `Enter combat` and `Roll` trace entries represented successive queued Threats, not repeated submissions for one resolution identity.

### Rewards and inventory

The focused lifecycle regression confirms a successful encounter grants Salvage once, reconnect does not duplicate it, and the final Continue does not reapply it.

Passive permanent bonuses remain equipped and are not presented as consumable actions.

### Services

The run reached shop/service presentation after its Threat queue. Existing server-side service eligibility remained authoritative; this pass did not alter the successful-clear gate.

### Endgame

The S21 endgame view remained readable and free from navigation overlap. The full-width Leave Room target measured at least 44 CSS pixels high.

## Typography

Primary controls and outcome copy were visually readable on the physical device. Some compact metadata intentionally remains below the general 12px target, including short all-caps progress labels. It is supplementary, paired with larger values, and did not clip or carry exclusive meaning.

The automated text probe reported one line-box clipping candidate on the endgame heading, but the physical screenshot showed the heading fully visible. This was classified as a measurement false positive rather than a layout defect.

## Signal Cartography

The approved phone control and TV schematic are described in `docs/design/SIGNAL_THEATRE_CARTOGRAPHY_PROTOTYPE.md`.

The prototype:

- Uses all 49 canonical sectors and connections.
- Uses no old tile art.
- Shows only public information.
- Supports route, challenge, persistent-encounter, and six-player density examples.
- Uses a server-validated presentation command and public host-view projection.
- Returns automatically for encounters, resolutions, services, handoffs, and endgame.
- Remains outside saved gameplay state and defaults safely to Signal Theatre on server restoration.

## Verification

Passed:

- Content validation.
- Typecheck.
- Focused phone/TV/server regressions: 103 tests.
- Full WebSocket room integration: 44 tests.
- Required-action, tile-arrival, single-player movement, scenario confrontation, and server API selection: 120 tests.
- Production build.
- Development asset audit: 516/516 present, zero invalid, zero placeholders, zero release blockers.
- Natural physical S21 game after the fix.

Not passed:

- Full client suite exceeded the three-minute execution window without returning a result.
- Full engine/rules run completed with 48 failures. Two are stale expectations for the removed intermediate result stages; most remaining failures are in the pre-existing, currently modified Heat Retirement/Threat revision work and expect consequences to remain pending instead of being automatically applied. These failures were not silently rewritten because that work is outside this hardening pass.

## Asset and authority audit

- New artwork generated: 0.
- Existing artwork edited by this pass: 0.
- Gameplay randomness remains server-owned.
- Movement legality and routes remain server-owned.
- Save version changed: no.
- Network protocol changed: no.
- Privacy boundary changed: no.
- Production map mode enabled: yes.
- Host-view state changes gameplay or saves: no.
