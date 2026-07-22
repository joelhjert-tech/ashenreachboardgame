# P1 Phone Primary-Action and Waiting-State Closure

## Scope

This slice presents the existing server-owned `requiredAction` projection. It does not alter command validation, movement legality, encounter math, shop transactions, card content, topology, save data, or gameplay outcomes. The pre-P0 client inference remains available only when a server projection is absent.

## Implementation

- `PhoneRequiredActionShell` provides one hierarchy wrapper around the existing Move, Battle, Shop, and Action features.
- On the projected destination tab, the shell uses a compact state rail so it does not repeat feature-owned titles or instructions.
- On passive tabs, the shell shows the public-safe action context and a 44 px `Return to …` control.
- Waiting phones receive a dedicated waiting/resolving body. Active-player feature controls are not mounted in that body.
- Command submission immediately disables the existing feature tree through native `fieldset` behavior. The layout remains stable until the next authoritative projection sequence.
- Rejected stale commands restore the current projected action and use player-facing copy rather than raw server identifiers.
- Automatic tab routing is keyed to the stable projected action ID and destination. A newer patch carrying the same action no longer overrides deliberate passive navigation; a new action ID routes once.
- The older `CurrentPromptCard` is suppressed only while the server projection exists, preventing duplicated instructions without removing backward compatibility.
- Result screens remain owned by their existing feature components. Battle QA confirms one visible `Continue` control while the result and consequence remain readable.

## Privacy

- Waiting copy comes only from the public-safe projection label, detail, and display name.
- No destination option, Scar option, private reward, inventory choice, mission detail, or Rivalry objective is rendered for a waiting phone.
- Source IDs and stable internal action IDs are not rendered as visible copy.
- The TV captures contain public state only and were checked for console errors and overflow.

## Responsive browser QA

The deterministic QA fixture uses real room creation, setup, WebSocket projection, and canonical feature components. Development-only events exercise connection interruption, stale rejection presentation, and frozen submitting/resolving visuals; they do not submit gameplay outcomes or exist in production builds.

- Phone: 390×844 and 360×800.
- TV regression: 1920×1080.
- Captures: 37.
- Horizontal overflow: 0 px in every capture.
- Console/page errors: 0.
- Bottom controls remained above the compact navigation and safe-area boundary.
- Long event copy stayed inside the feature scroll region.
- Battle result retained one `Continue` control.
- Shop confirmation stayed reachable as a focused overlay at 360×800.
- Waiting screens named the acting player and did not render active command controls.

Screenshots and machine-readable measurements are in `reports/ui/phone-required-action-p1/`.

## Screenshot states

Each phone state is captured at both requested phone sizes:

- dice ready, submitting, and resolving
- movement selection and submitting
- battle decision and battle result
- long event rules
- shop purchase confirmation
- reward/equipment selection
- private Scar choice
- End Turn/free action
- waiting for dice, movement, and battle
- reconnecting
- stale-action recovery

TV captures cover waiting for player action, resolving, and public result.

## Focused verification

- Required-action and deterministic privacy fixtures: 35/35.
- Shared shell, routing, command lock, and existing phone feature tests: 125/125.
- Client suite: 392/392.
- Server integration suite: 345/345.
- Engine/rules suite: 763/763.
- Independently run constituent suites: 1,500/1,500.
- Aggregate wrapper: exceeded the 424.1-second execution window without reporting a test failure. Per task instructions, every constituent suite was then run independently and passed; this is a timeout distinction, not an aggregate pass claim.
- Content validation: passed (109 Threats; 24 Scars; canonical catalogs valid).
- Typecheck: passed.
- Production build: passed (550 modules).
- Asset audit: 435/435 present.
- Browser QA: 37 captures, zero overflow, zero console/page errors.

## Four-seat review

- **New player:** the current action remains first, while waiting copy explicitly names who acts and what the table is resolving.
- **Optimizer:** unchanged projections no longer steal passive-tab navigation, and the submission lock prevents duplicate commands.
- **Family/casual:** concise status vocabulary (`ROLLING`, `MOVING`, `RESOLVING`, `CONFIRMING`) replaces network language; controls remain thumb-sized.
- **Rules lawyer:** UI status never advances gameplay. The next action appears only after an authoritative projection revision, and rejected stale actions restore the current server-owned state.

## Remaining risks

- The large inventory of optional free-action choices can still require scrolling. Those choices are not mandatory, and redesigning their ordering belongs to the separate Action-tab work already present in the worktree.
- The short-lived submitting/resolving frames are deterministic QA captures; real duration still depends on local network latency.

No commit or push was made.
