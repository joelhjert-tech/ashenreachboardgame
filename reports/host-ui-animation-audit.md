# Host UI Animation Audit

## Inventory

| Surface | Trigger | Implementation | Timing | Classification | Reduced motion | Audit result |
|---|---|---|---:|---|---|---|
| Board route march | Authoritative movement route | CSS stroke dash | 1.4s loop | Keep | Disabled by global reduced-motion rules | Communicates legal route. |
| Movement token | Player sector changes with canonical route IDs | DOM/SVG CSS variables | 760ms default | Keep | Settles without continuous travel | Route IDs and endpoints tested. |
| Arrival pulse | Token travel completion | CSS keyframe | 360ms after travel | Keep | Static arrival state | Restrained and readable. |
| Movement journey cards | Previous planner plus authoritative sector change | React visual step timer | 360ms per step; 650ms arrival hold | Refine | 120ms steps | State follows the server; timer only controls presentation. |
| Battle chamber entry | Battle focus mounts | `tv-battle-window-enter` | normal token (~220ms) | Keep | None | Fast scene change. |
| Battle card reveal | `battle_setup` | paired 3D CSS transforms | 1380ms | Keep | Instant settled faces | Operative begins before enemy; later stages do not replay setup. |
| Battle VS reveal | Battle setup | CSS | 460ms after 1120ms | Keep | Instant | Reinforces information order. |
| Victory / failure FX | Authoritative outcome tone | CSS shockwave / flash | 880ms / 760ms | Refine | Disabled | Result chips and text carry all information without FX. |
| Shop stock reveal | Revealed public stock/services | CSS stagger | 420ms | Keep | Disabled | Brief and presentation-only. |
| Shop atmospheric cards | Shop open | CSS float | 5.8s loop | Refine | Disabled | Low contrast; never blocks stock. |
| Shop risk pulse | Dangerous/blocked status | CSS | 1.6s loop | Keep | Disabled | Risk is also labeled, not color-only. |
| Purchase burst | Public completed transaction | CSS | 760ms | Keep | Disabled | Keys off result state, not client intent. |
| Threat/card reveal | Authoritative card reveal | CSS flip | 520ms | Keep | Fade/static fallback | Brief and type-labeled. |
| Ambient cinematic FX | Battle/shop/map event | DOM-only FX layer | 1.7-1.8s loops | Refine | Disabled | No Three.js/canvas; overlay pauses by unmounting outside focus. |

## Lifecycle findings

- Battle animation is keyed by authoritative resolution state. Reconnect at a later stage renders settled faces rather than replaying `battle_setup`.
- Movement state is authoritative; visual step timers do not dispatch actions or delay reducers.
- The movement HUD cascade defect was layout-related, not route-authority related.
- The capture runner asserts `canvasCount === 0`; all host effects remain DOM/CSS.
- No new infinite animation was added.

## Sound hooks

Existing state transitions provide stable future hooks for movement start/segment/arrival, cross-ring transition, card reveal, battle setup/result, shop entry/transaction, Wound/Scar deltas, scenario state, and endgame. No copyrighted or unapproved sound was added. Current mute controls remain TV-local.

## Performance

- Screens use existing images and no new dependency.
- Focus overlays preserve the mounted board and avoid a blank remount.
- Movement and battle keys remain stable.
- The final browser run reported no console errors, horizontal overflow or canvas fallback.
- Expensive filters are restricted to small HUD cards; the corrected movement root explicitly removes whole-stage backdrop filtering.
