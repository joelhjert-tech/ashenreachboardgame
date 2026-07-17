# Forced-Displacement Source Approval

Status: **approved for foundation implementation; no mechanics changed in this report commit**.

## Baseline and scope

The prerequisite baseline was restored before this audit. The multi-seat websocket test was observing the transient `sector` phase after a generic server tick even though it subsequently awaited the authoritative `action` projection. Moving the direct assertion behind that projection wait preserves production behavior and makes the test deterministic. The focused test, all 38 room-server integration tests, and the full 761-test suite pass.

Rift Anchor Spike remains unimplemented. There is no `pendingDisplacement`, no displacement reaction ID, no displacement phone action, and no authored runtime effect that forcibly relocates an operative.

## Search method

The audit searched current content, schemas, engine rules, server resolution, tile challenges, anomalies, Threats, scenarios, Scars, missions, board rules, and historical content for forced movement, relocation, teleport, rift pull, push, knockback, drag, ejection, scatter, clockwise movement, sector transfer, and inward/outward movement. Current typed effects and runtime resolution were checked separately from descriptive text.

## Candidate audit

| Candidate | Current wording or history | Current typed effect | Operative displacement now? | Classification | Suitability | Migration risk |
|---|---|---|---:|---|---|---|
| `route-splice` — Route Splice | Current: “Two wrong streets join at the cut…” Historical rule in `src/game/data/threatDecks.ts`: “Each character on an outer space tests Guile 7. Fail: move 1 space clockwise.” | Active yellow, middle, uncommon hazard; Guile 8; failure `take_wound 1` | No | Clear historical forced displacement whose active substitute is not equivalent | **Best first source**: deterministic destination can be derived from authoritative board order and adjacency | Medium: current Wound balance changes and the historical all-player scope must not be restored accidentally |
| `rift-whispers-ashen-chapel` — Rift Whispers | Movement-tagged recurring anomaly; routes argue about what is real | Failure gains `scar-wound-6` | No | Route-themed persistent challenge, not authored relocation | Poor: converting it would disturb recurring challenge, Scar, Censer, and mission integration | High |
| `anomaly-gutter-star-orbit` — Gutter-Star Orbit | “drags loose metal into a slow halo” | Gain Blackstar Ampoule, then take 1 Wound | No | Environmental pull affects metal, not operatives | Unsuitable without rewriting the anomaly | High |
| `mudglass-sinkhole` — Mudglass Sinkhole | Ground drinks the operative’s boots | Failure `take_wound 1` | No | Immobilization/hazard language, not relocation | Possible bespoke rewrite, but no destination intent exists | Medium-high |
| `cinder-gate-backlash` — Cinder Gate Backlash | Gate throws a pulse through carried Artifacts | Failure `take_wound 2`; success legacy no-op `lose_heat 2` | No | Backlash, not an operative move | Unsuitable; also intersects deferred Heat-only content work | High |
| Devourer Beneath scenario | Devourer token moves clockwise/toward sectors | Scenario moves the Devourer token | No | Scenario-token movement | Ineligible: Rift Anchor Spike protects an operative, not a nemesis token | High if generalized |
| Labyrinth Engine rotation | Operative **may** move one sector when clear | Voluntary scenario movement | No forced move | Ordinary optional movement | Ineligible | Low |
| Blackstar Road Trial | Moves roaming Nemesis pressure toward an operative | Board/scenario token instruction | No | Nemesis-token movement | Ineligible | High if generalized |
| Marrow Route Key | Owner chooses an adjacent legal detour after a failed movement test | Existing charged Artifact reaction | No hostile forced displacement | Voluntary reaction/detour | Explicitly out of scope | High if reinterpreted |
| Route Star, Route Compass, Void Key, Gate-Saint Key | Route choice, distance adjustment, or gate authorization | Existing charged Artifact effects | No | Ordinary authoritative movement modifiers | Explicitly out of scope | High if reinterpreted |
| Movement-tagged Threats and route flavor | Tags or prose mention movement, dragging equipment, scatter, or push tempo | Wounds, notes, Heat no-ops, or other non-movement effects | No | Flavor/metadata only | Not evidence of relocation | Medium |

### Count and conclusion

- Current authored typed operative forced-displacement sources: **0**.
- Historical rules that explicitly move an operative: **1 relevant source**, Route Splice.
- Current movements deliberately excluded: ordinary/optional movement, charged route Artifacts, character jump movement, nemesis/scenario-token movement, and route correction.

Git history confirms that commit `3b02f11` introduced Route Splice with the explicit clockwise failure. Commit `48f206d` promoted it into the active JSON catalog with `take_wound 1` instead. History clarifies intent but does not approve restoring the mechanic.

## Route Splice rule options

All options use source ID `route-splice`, retain its yellow Threat lane, middle-region placement, Guile 8 test, uncommon rarity, stable ID, and existing success note. None is approved.

### Option A — Clockwise Misroute (recommended)

**Exact rule text**

> Route Splice — Test Guile 8. Success: record the mapped-splice note. Failure: before the failure resolves, the server identifies the adjacent legal sector one step clockwise on your current ring. You are forcibly displaced there. The test still counts as failed. Gates, scenario locks, blockers, adjacency, and destination restrictions remain enforced. If no clockwise adjacent sector is legal, remain here.

- Trigger: failed Route Splice hazard test.
- Destination: one server-derived clockwise, same-ring, adjacent legal sector.
- Choice: none; owner accepts the authoritative result.
- Other consequence: replace the active substitute Wound; do not add a Wound.
- Failure history: recorded as failed whether displacement resolves or has no legal destination.
- TV: `Route Splice twisted the road` followed by the public destination if moved.
- Phone: `Forced displacement pending: [origin] → [destination]`, with `Accept displacement`.
- Balance: severity 2; positional loss instead of direct defeat pressure. The no-legal-destination fallback is severity 0 but deterministic.
- Readiness: highest. It restores the original card identity while avoiding all-player targeting and client route construction.

### Option B — Choose the Lesser Wrong Road

**Exact rule text**

> Route Splice — Test Guile 8. Success: record the mapped-splice note. Failure: the server identifies every adjacent legal sector on your current ring except the sector you just entered from. Choose one and be forcibly displaced there. The test still counts as failed. If no destination is legal, remain here.

- Destination: server-issued adjacent legal candidates; no unrestricted client destination.
- Choice: owner selects one candidate.
- Other consequence: replace the Wound.
- TV: waiting status only until confirmation, then the selected destination.
- Phone: private authoritative list of public sector names.
- Balance: severity 1–2; player choice softens the penalty and may become beneficial.
- Readiness: medium. Requires the first lifecycle to support destination selection and preserve arrival-origin context.

### Option C — Splice and Shatter

**Exact rule text**

> Route Splice — Test Guile 8. Success: record the mapped-splice note. Failure: suffer 1 Wound, then the server forcibly displaces you to the adjacent legal sector one step clockwise on your current ring. The test still counts as failed. If no destination is legal, suffer the Wound and remain here.

- Destination: same deterministic rule as Option A.
- Other consequence: preserves the active Wound before displacement.
- TV/phone: show the Wound and pending destination in authored order.
- Balance: severity 3 and substantially stronger than both current runtime and the historical card.
- Readiness: technically straightforward but not recommended without an explicit rebalance approval.

## Recommendation

Recommend **Option A — Clockwise Misroute**, subject to design approval. It is the only proposal grounded in explicit historical authored behavior, gives the foundation a deterministic server-validatable source, and avoids inventing a client-selected teleport. The implementation must define a canonical clockwise neighbor helper and validate that the selected sector is directly adjacent and legal at resolution time. Array index alone is not authority unless board data formally declares its ring order.

## Required source tests after approval

- Active Route Splice retains stable ID, lane, placement, rarity, success note, and Guile 8.
- Failure creates one pending displacement before any operative move.
- Historical all-player language is not restored; only the operative resolving the hazard is affected.
- Clockwise destination is deterministic, adjacent, same ring, and server-derived.
- Gates, scenario locks, threat blockers, and destination restrictions remain enforced.
- No legal destination produces a resolved no-move result without a loop.
- The failed test remains recorded as failed.
- Decline/continue resolves once; reconnect does not reapply it.
- Ordinary movement and every existing movement Artifact remain unchanged.

## Approval block

First forced-displacement source:

- Selected option: **Option A — Clockwise Misroute**
- Source ID: **`route-splice`**
- Final rule text: **“Clockwise Misroute: If you fail this test, the server attempts to move you one adjacent sector clockwise on the same ring. The destination must be legal under all normal gate, blocker, scenario, and destination rules. This displacement replaces the normal 1-Wound failure consequence. If no legal clockwise destination exists, remain in your current sector and suffer 1 Wound instead. The test still counts as failed.”**

Approval authorizes only the Route Splice source and shared displacement foundation. Rift Anchor Spike remains unapproved and unimplemented.
