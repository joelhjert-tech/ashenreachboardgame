# P20 Current Host Presentation Audit

## Audited baseline

The pre-edit host already had canonical public projections for required action,
movement, arrival, encounter, battle arithmetic, shop, result deltas,
progression, endgame, and reconnect. It also had focused battle, shop, and
movement surfaces plus reduced-motion behavior.

The baseline was exercised through lobby, setup, first turn, movement, arrival,
encounter, battle, reward, penalty, waiting, handoff, shop, progression,
pressure, final stage, victory, defeat, reconnect, reduced motion, long content,
missing art, and a six-player host.

## Problems observed

- Header, map overlays, side context, battle chamber, and progression overlays
  independently described the current state.
- A viewer could identify the pieces but had to assemble
  `actor → event → change → next` across several panels.
- Turn handoff used a separate timer-owned banner while other presentation
  identities used stable server data.
- Reward and penalty language was visually similar outside battle.
- Owner-private waiting states were safe but could resemble a frozen host.
- The first P20 baseline capture revealed two competing movement narrators: the
  compact motion cue and the dedicated route journey.
- A fixed-delay capture could record a lingering route under the handoff name.
- Sequential QA fixtures could inherit a prior movement roll, arrival lane, or
  displacement consequence.
- The route journey retained a sector brief that overlapped its title at
  1366×768.

## Existing strengths preserved

- Board-first default surface.
- Public-only TV projection.
- Server-authored dice, routes, outcomes, and arithmetic.
- Arrival-before-encounter ordering.
- Fixed opposition without a fabricated die.
- Canonical result and handoff data.
- Reconnect suppression for completed presentation.
- Existing art, framing utilities, and motion tokens.
- Six-player marker support.

## P20 correction

P20 adds one read-only Host Motion Cue for non-movement public context. It
co-locates actor, public state, public change, and next action. The dedicated
movement HUD/journey exclusively owns roll, destination, route, intermediate
step, and arrival focus.

Fixture setup now clears prior QA-only transient presenters. Browser evidence
waits for semantic milestones instead of assuming a fixed delay. Development
holds lengthen route beats only while the explicit QA query is active; normal
runtime timing and authoritative resolution are unchanged.

## Final evidence

- 29 states × 3 resolutions = 87 primary screenshots.
- Six-player host × 3 resolutions = 3 screenshots.
- Total required matrix = 90 screenshots.
- Resolutions: 1366×768, 1600×900, and 1920×1080.
- Complete host sequence: 136.36 seconds.
- Six-player sequence: 16.48 seconds.
- Zero horizontal overflow.
- Zero vertical overflow.
- Zero duplicate motion cues.
- Zero canvas surfaces.
- Zero console or page errors.
