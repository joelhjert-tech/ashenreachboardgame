# Phone Action Layout Options

## Approval status

Three development-only options are available. None replaces the production Action tab, and no option was committed or pushed.

Open them with:

- `/?phoneActionLayout=context-command-deck`
- `/?phoneActionLayout=tactical-action-rail`
- `/?phoneActionLayout=priority-stack`

The query parameter is honored only by a development build. All three render the same `PhoneActionViewModel` and send the same existing typed actions, including the new authoritative encounter-start action.

## Canonical states used

The browser archive uses a real single-player session and the normal WebSocket projection. QA fixtures create state through the same server data structures used by play; start buttons submit a real server intent and the after-start images are captured from the returned authoritative `battle_setup` projection.

States exercised were free action, Hazard ready, Hazard started, recurring Challenge ready, Challenge started, Event ready, Event started, Salvage payment, large Gear/Item/Follower inventory, legal End Turn, blocked End Turn, optional board action, and stale/wrong-owner encounter start. The shared adapter also classifies battle, Scar choice, mission completion, forced destination, and other owner prompts.

## Comparison

| Criterion | A — Context Command Deck | B — Tactical Action Rail | C — Priority Stack |
|---|---|---|---|
| Immediate action clarity | Excellent | Good | Excellent |
| Hazard/Challenge adaptation | Excellent | Good | Excellent |
| Event/Battle adaptation | Excellent | Good | Excellent |
| Scroll length | Shortest in ready states | Shortest overall | Moderate with many useful actions |
| Gear/Item/Follower discovery | Relevant actions are immediate | Best for browsing categories | All useful entries remain visible |
| End Turn clarity | Dominant only when it is the next action | Dedicated End category | Bottom of priority order |
| One-handed use | Strong | Strong; one extra category tap | Strong until inventories grow |
| Large inventory | Collapses irrelevant entries | Best | Longest |
| Accessibility | Direct sequence and 44 px targets | Strong labels plus counts | Semantic priority headings |
| Component reuse | High | High | Highest |
| Implementation complexity | Highest ranking/filtering burden | Moderate panel-state burden | Lowest |
| Hidden-action risk | Moderate; mitigated by Blocked summary | Highest; actions live one tap deeper | Lowest |
| Regression risk | Moderate | Moderate | Lowest |
| Performance | One visible list | One visible category | Largest simultaneous list |
| 360×800 | Primary remains above fold | Rail and active action remain above fold | Primary remains above fold |

## Option A — Context Command Deck

Flow: context → one primary action → only currently legal tactical support → collapsed blocked summary. During a ready encounter, support that cannot yet be used is demoted until the test timing window opens.

Strengths:

- Fastest answer to “what do I do now?”
- Best transformation around Hazards, Challenges, Events, payments, and forced prompts
- Minimal scrolling in mandatory states
- End Turn disappears from competition until it is genuinely next

Weaknesses:

- Ranking metadata must stay trustworthy
- Players who want to inspect all inventory must open the normal Inventory surface
- A large blocked count can feel opaque until expanded

## Option B — Tactical Action Rail

Flow: pinned context → Primary/Gear/Items/Allies/End rail → one category panel. Empty categories are disabled and every category displays a count.

Strengths:

- Best large-inventory browsing
- Predictable location for each action family
- Lowest visible page height
- End Turn has a stable dedicated location without competing with encounter actions

Weaknesses:

- Legal support may be one tap deeper
- Requires careful selected-panel restoration after context changes
- The rail is the densest control at 360 px

## Option C — Priority Stack

Flow: Required Now → Useful Now → collapsed Passive/Blocked. Entries are ordered by current timing value instead of inventory family.

Strengths:

- Closest to existing architecture and lowest implementation risk
- Lowest chance of hiding a legal action
- Strong distinction between required and merely useful actions
- Clear canonical blocked reasons

Weaknesses:

- Becomes longest with many simultaneous actions
- Less visually distinct from the current Action page
- Trustworthy urgency sorting is still required

## Visual review and corrective pass

The first browser render found four issues:

1. The existing tile-arrival panel repeated the new encounter context and pushed the primary action down. It is now suppressed only in prototype mode.
2. Ready encounters initially displayed equip and utility controls before their timing windows opened. They are now retained in the shared model but demoted to the collapsed Blocked group until the authoritative test stage begins.
3. Required cards repeated their label in both the card body and button. The body now carries context while the full-width button carries the action.
4. Option B’s category names clipped at narrow widths. The labels are now Primary, Gear, Items, Allies, and End, with stable counts.

The 1280-style narrow blocked card also wrapped badly during the stale-start review; blocked cards now use a single-column layout. All affected screenshots were recaptured.

## Actions difficult to classify

- Equip/unequip actions are canonically legal during the broad Action phase but are not encounter support. They remain represented in the model and are demoted while an encounter owns the context.
- Followers do not all project a tested-skill field. The adapter relies on the canonical disabled reason and timing projection; this is adequate for current content but richer effect metadata would improve future ranking.
- A ready encounter is a distinct state from a pre-roll timing window. Item controls are therefore hidden from the ready view and appear only after the server starts the encounter.

## Encounter metadata findings

- Recurring Challenges use the Challenge stable ID for execution but may use a different art-card ID for presentation. Encounter start now validates the projected encounter ID plus resolution revision instead of incorrectly requiring those two content IDs to match.
- Events are canonical Hazard-family checks with an Event presentation category. The view model labels them Event while sending the same server-owned test path.
- The old tab router accepted a disabled locally selected Action tab. This was the direct cause of “encounter displayed, cannot start.” Disabled stale selections now fall back to the enabled Encounter/Battle surface in production.

## Four-seat review

### New player

Option A makes the next action clearest. Option C is nearly as clear and reveals more supporting context. Option B needs the player to understand its category rail.

### Optimizer

Option B compares a large inventory fastest. Option C minimizes hidden-action risk. Option A is fastest during mandatory resolution but deliberately demotes non-current actions.

### Family/casual player

Option A requires the least reading. Every unavailable control is either absent from the immediate flow or backed by an exact reason in Blocked.

### Rules lawyer

Option C exposes the most complete timing picture. All options preserve the same canonical action entries and encounter identity; none calculates legality locally.

## Recommendation and approval gate

Option A is the strongest clarity-first direction. Option B is the strongest inventory-browsing direction. Option C is the safest implementation direction. No final option has been selected or installed; user approval is required.

## Screenshot archive

All 35 reviewed captures are in `reports/ui/phone-action-options/`. The required A/B/C filenames are present, plus matching 412×915 Hazard captures, Event ready/started captures, all three real encounter-start transitions, the optional-action state, and the blocked stale/wrong-owner start state.

## Verification

- Content validation: passed (18 characters, 71 Gear, 109 Threats, 36 Missions, and all other canonical catalogs).
- Typecheck: passed.
- Focused Action/encounter tests: 6/6 passed.
- Existing phone navigation regressions: 123/123 passed.
- Client suite: 383/383 passed.
- Aggregate suite: 1,487/1,487 passed across 154 files.
- Asset audit: 435/435 present; zero missing, invalid, placeholder, or release-blocking assets.
- Production build: passed.
- Browser QA: 35/35 captures completed; no horizontal overflow or console errors.
- `git diff --check` and `git diff --cached --check`: passed.
