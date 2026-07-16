# Ashen Reach Motion Bible

Motion in Ashen Reach is a rules layer. It explains what changed, why it matters, and which surface owns the moment. It is not decoration and it must never be required to understand the game state.

## 1. Motion Principles

- Motion must explain state change.
- Motion must never hide important information.
- Motion must never delay required player input too long.
- Motion must have a reduced-motion fallback.
- Motion must use shared timing and easing tokens.
- TV motion can be more cinematic because it is public theatre.
- Phone motion must stay fast and responsive because it is private command input.
- Motion must reinforce the TV and phone split:
  - TV shows public drama.
  - Phone confirms private commands.

Every motion pattern should answer one rule question:

| Pattern | Rule question |
| --- | --- |
| Move token | Where did the operative go? |
| Dice throw | What value did fate produce? |
| Card flip | What was revealed? |
| Wound, scar, affliction reveal | What lasting harm changed? |
| Battle impact | Who took the hit? |
| Reward pulse | What did the player gain? |
| Tab transition | What command mode am I in? |
| Blocked action | Why can I not do this? |

## 2. Motion Timing Tokens

Use these tokens in CSS and TypeScript instead of one-off durations.

| Token | Duration | Use |
| --- | ---: | --- |
| `motion.instant` / `--motion-instant` | 80ms | State swap, reduced-motion fallback, small acknowledgement |
| `motion.quick` / `--motion-quick` | 140ms | Phone button response, blocked pulse, quick tab feedback |
| `motion.normal` / `--motion-normal` | 220ms | Standard phone transition, result chip pulse |
| `motion.deliberate` / `--motion-deliberate` | 360ms | Card reveal, scenario progress, shop transaction |
| `motion.cinematic` / `--motion-cinematic` | 520ms | TV card flip, dice reveal, public banner moment |
| `motion.heavy` / `--motion-heavy` | 760ms | Scar, affliction, major wound, heavy battle consequence |

## 3. Easing Tokens

Use named easing tokens so Figma timelines, CSS, and React code describe the same behavior.

| Token | Easing | Use |
| --- | --- | --- |
| `ease.command` / `--ease-command` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Phone command mode switches and route progression |
| `ease.impact` / `--ease-impact` | `cubic-bezier(0.16, 1, 0.3, 1)` | Battle hit, wound pulse, hard result settle |
| `ease.warning` / `--ease-warning` | `cubic-bezier(0.4, 0, 0.2, 1)` | Invalid action, lock state, danger warning |
| `ease.snap` / `--ease-snap` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Dice snap, reward count lock, selected tab confirmation |
| `ease.fade` / `--ease-fade` | `ease-out` | Reduced motion, readable crossfades, soft reveal |

## 4. Motion Categories

### A. Chess-Piece Board Movement

Purpose: show travel, not teleportation.

Behavior:

- Token slides along route points.
- Each step has a short settle.
- Route glow leads the movement.
- Current tile pulse fades after leaving.
- Destination pulse confirms arrival.

Timing:

- 180-240ms per step.
- Long paths should cap visible travel around 900ms.

Reduced motion:

- Fade token to destination.
- Show route highlight only.

### B. Dice Throw

Purpose: show chance resolving.

Behavior:

- Dice enters with a quick throw or shake.
- Dice rolls for a short duration.
- Dice snaps to final value.
- Result number locks.
- Math row updates after lock.

Timing:

- 450-700ms total.
- Phone should be faster than TV.

Reduced motion:

- Quick fade or swap to final die value.

### C. Card Reveal / Card Flip

Purpose: show hidden information becoming public or private.

Behavior:

- Face-down card lifts.
- Slight `rotateY` flip.
- Reveal glow uses the card type.
- Card settles into readable state.

Timing:

- 360-520ms.

Reduced motion:

- Crossfade.

### D. Wound / Scar / Affliction Reveal

Purpose: show lasting harm or persistent condition.

Behavior:

- Red or burgundy flash.
- Card or status slides into player area.
- Brief "scar gained" or "affliction gained" pulse.
- Affected stat, equipment, or restriction area highlights.

Timing:

- 520-760ms.

Reduced motion:

- Static badge and result chip.

### E. Battle Impact

Purpose: show result of combat.

Behavior:

- Attacker and defender cards brace.
- Dice and math lock before impact.
- Impact flash appears on loser.
- Wound, trophy, and other authored result chips pulse after impact.

Timing:

- 220ms math lock.
- 160ms impact.
- 360ms result chip pulse.

Reduced motion:

- No shake. Use highlight only.

### F. Reward / Loot / Upgrade Pulse

Purpose: show gain.

Behavior:

- Gold or green pulse.
- Resource icon counts upward when the count is visible.
- Reward chip appears.
- Stat upgrade uses permanent glow, not temporary flash.

Timing:

- 220-360ms.

Reduced motion:

- Count updates and chip appears instantly.

### G. Shop Buy / Sell / Skip

Purpose: show transaction.

Behavior:

- Buy: item card pulses, salvage decreases, item moves or fades to inventory.
- Sell: item fades out, salvage increases.
- Skip: neutral fade, no resource pulse.

Timing:

- 220-360ms.

Reduced motion:

- Transaction summary appears with no movement.

### H. Mission / Scenario Progress

Purpose: show objective movement.

Behavior:

- Progress ring or bar advances.
- Scenario chip pulses.
- Last-trigger copy appears.
- Loss pressure and win progress use different colors.

Timing:

- 360-520ms.

Reduced motion:

- Progress updates instantly and the result chip remains visible.

### I. Phone Tab Transitions

Purpose: show command-mode switch.

Behavior:

- Active tab content crossfades or slides slightly.
- Tab accent changes immediately.
- No deep nested window movement.
- Primary action appears first.

Timing:

- 140-220ms.

Reduced motion:

- Instant tab switch.

### J. TV Public State Banners

Purpose: show table-level state without exposing private information.

Behavior:

- Public banner enters or updates with a restrained pulse.
- Current player, phase, and public waiting state remain readable.
- No private rivalry, hidden agenda, or owner-only mission detail is revealed.

Timing:

- 360-520ms.

Reduced motion:

- Static banner update.

### K. Blocked / Invalid Action

Purpose: explain "no."

Behavior:

- Button refuses with short shake or red border pulse.
- Disabled reason appears.
- No action is sent twice.

Timing:

- 140-220ms.

Reduced motion:

- Reason appears. No shake.

### L. Reconnect / Waiting / Network State

Purpose: show connection status.

Behavior:

- Reconnecting uses a subtle pulse.
- Reconnected uses green confirmation.
- Failed reconnect uses red warning.
- Screen is never blocked without explanation.

Timing:

- 220-520ms depending on surface.

Reduced motion:

- Static status text and icon.

## 5. TV vs Phone Motion Rules

TV:

- Can use cinematic timing.
- Can use larger route glow.
- Can use larger battle impact.
- Owns public result banners.
- Must not reveal private hidden information.

Phone:

- Uses faster timing.
- Avoids long blocking animations.
- Keeps the current prompt readable.
- Keeps confirm buttons responsive.
- Reduces animation when browser chrome leaves little space.
- Never substitutes animation for disabled reasons or math breakdowns.

## 6. Accessibility

Required:

- Support `prefers-reduced-motion`.
- Provide reduced-motion CSS overrides.
- Do not convey essential state only through animation.
- Avoid infinite flashing.
- Avoid aggressive screen shake.
- Stop or suppress animations when content is inactive or offscreen where practical.

Reduced-motion fallbacks must preserve the information:

- Movement still shows origin, route, and destination.
- Dice still shows final value.
- Card reveal still shows the card.
- Wounds, scars, and afflictions still show title, effect, and result chips.
- Invalid actions still show reasons.

## 7. Implementation Tokens

Shared CSS variables live in `src/client/styles.css`. Shared TypeScript tokens live in `src/client/shared/motionTokens.ts`.

Class names reserved for implementation hooks:

- `motion-token-step`
- `motion-route-glow`
- `motion-dice-throw`
- `motion-card-flip`
- `motion-wound-reveal`
- `motion-battle-impact`
- `motion-reward-pulse`
- `motion-shop-transaction`
- `motion-scenario-progress`
- `motion-tab-enter`
- `motion-tab-exit`
- `motion-invalid-action`
- `motion-network-status`
- `motion-reduced-fallback`

These classes should be added to components only when the matching rule moment exists. Do not attach motion classes just to make a screen feel busier.

## 8. Figma Motion Handoff

Each motion pattern should have a matching Figma component or prototype. Timeline keyframes should map to the code tokens above.

Every handoff entry should include:

- Trigger
- Start state
- End state
- Duration token
- Easing token
- Affected elements
- Reduced-motion fallback
- Implementation class or token

Figma timeline names should match code vocabulary. For example, a dice prototype should use `motion.diceThrow`, `motion.cinematic`, and `ease.snap`, not unnamed custom durations.

## 9. Implementation Order

Start with low-risk feedback before large board movement:

1. Phone tab transitions
2. Dice throw polish
3. Card flip reveal
4. Chess-piece movement
5. Battle impact
6. Wound, scar, and affliction reveal
7. Reward pulse

Chess-piece movement is the most visible and the most likely to touch route state. It should not be first.
