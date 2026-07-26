# Legacy Reference and Ashenreach Tile Comparison

## Purpose

This report compares generic interaction behavior observed through an extended
isolated-emulator walkthrough and a first-pass physical S21+ walkthrough with
Ashenreach's current authoritative implementation. Both reference-game passes
used ordinary visible controls. The physical-device pass modified no repository
file and used no out-of-band game-state mutation.

The emulator run supplies the retained lifecycle evidence used by the behavior
matrix. The S21+ pass supplies first-pass physical-device corroboration only;
it does not create an additional rule claim where no separate lifecycle record
exists.

The comparison does not copy or paraphrase proprietary text, terminology,
geometry, stats, fiction, or assets.

No production behavior changed as part of this report.

## Current Ashenreach baseline

Ashenreach has 49 canonical sectors:

| Reach | Sectors | Sectors with Threat draws | Printed Threat icons |
|---|---:|---:|---:|
| Outer | 24 | 23 | 27 |
| Middle | 16 | 16 | 26 |
| Inner | 8 | 2 | 5 |
| Center | 1 | 0 | 0 |
| Total | 49 | 41 | 58 |

Eight sectors have no printed Threat draw. All eight still have authored
board-space behavior. The board has one currently authored recurring Tile
Challenge.

On authoritative arrival, Ashenreach resolves:

`sector brief → recurring Tile Challenges → printed Threat queue → scenario confrontation → optional sector action or service`

Clients do not choose the drawn card, roll private randomness, invent legality,
or reorder the queue. Completed Threats are removed or otherwise resolved by
their authored lifecycle. A recurring Tile Challenge remains bound to its
sector and runs again on a qualifying arrival.

## Behavior comparison

| System | Sanitized reference observation | Current Ashenreach | Assessment |
|---|---|---|---|
| Zero-card spaces | Direct challenges and services can replace a draw | Eight sectors omit Threat draws but still expose authored actions | Same useful distinction; retain |
| One-card spaces | Space announces one investigation, then the card defines the outcome | Each printed Threat icon queues one server-selected lane card | Ashenreach is explicit and authoritative |
| Multi-card spaces | Draw count is announced first; cards resolve separately | Multiple printed lane icons become an ordered Threat queue | Strong structural match without shared rules |
| Direct challenge | Space can supply the check without a card | Board text and one recurring Tile Challenge supply direct tests | Ashenreach has the capability but recurring content is sparse |
| Persistent encounter | Some unresolved cards remain associated with a space | Threat lifecycle and recurring challenge lifecycle are distinct | UI must explain consumed versus recurring content |
| Optional service | Service can be inspected, cancelled, or selected | Sector action/shop is available only after mandatory arrival work | Ashenreach ordering is safer and clearer |
| Player interaction | Shared occupancy can create a public interaction | Rivalry and public occupant state are server-authored | Preserve public/private projection boundaries |
| Region crossing | Legal movement leads into a harder region and a fresh arrival | Authoritative routes and reach gates control outer, middle, inner, center progression | Preserve route and gate authority |
| Automated turn | Public actor, movement, challenge, and result are staged | Automated public resolution is projected to TV | Preserve truthful progress; never fake AI reasoning |
| Reconnect | Cold restore works; ordinary surface resume can fail | Stable snapshots and replay suppression restore authoritative state | Ashenreach architecture is stronger; keep surface fallback |
| Late-game continuation | A Round 35 movement roll restored consistently, but no inspected destination exposed its normal confirmation action | Required actions and legal destinations are projected from authoritative state | Preserve an explicit legal-action fallback and test restored movement phases |

## Threat density and progression

Ashenreach deliberately shifts its content source across reaches.

- Outer and middle play are Threat-dense.
- Inner play is mostly authored board action, gate, and scenario pressure rather
  than repeated generic Threat draws.
- The center is scenario-controlled.

This is not a defect. It gives Ashenreach a distinct progression shape: broad
exploration first, then increasingly authored and objective-specific pressure.
Difficulty must remain tied to authored reach, lane, scenario, and server state;
no reference-game deck or rule is needed.

## Removal, recurrence, and revisit clarity

The reference walkthrough made persistent encounters visually evident because
an unresolved card remained on the space. Ashenreach has a more explicit data
distinction:

- Threat: queued from a printed lane and resolved through the encounter
  lifecycle.
- Recurring Tile Challenge: sector-bound and eligible on every authored
  arrival.
- Board action/service: optional only after mandatory arrival content.
- Scenario confrontation: controlled by scenario state.

The rules are sound, but the TV and phone should name the lifecycle source. A
player should never need to guess whether a card was consumed, remains on the
sector, or will recur next visit.

## Reconnect and authority

The legacy application can restore a saved stable state after a cold relaunch,
but its ordinary rendering surface can fail after background/resume. The long
run also restored into a reproducible movement-selection deadlock: the resolved
roll and destination previews remained visible, but the expected commit action
did not become available. No terminal or center rule is inferred from that
blocked state.

Ashenreach already has the right architectural separation:

- append-only authoritative events;
- periodic snapshots;
- server-authored randomness;
- public TV projection;
- private phone projection;
- completed-motion replay suppression.

Any presentation refinement should remain a projection of that state. Arrival
animation must never create a draw, repeat a reward, or advance the queue.

## Prioritized original Ashenreach proposals

### 1. Clarity improvement — label the source and queue

**Observed problem:** Direct space rules and card-created challenges can look
similar once the reveal animation begins.

**Ashenreach solution:** Keep the existing public labels precise: `Local
challenge`, `Threat contact`, `Sector action`, and `Confrontation`. For
multi-icon sectors, show `Threat 1 of N` with lane identity and mark completed
queue entries once.

### 2. Clarity improvement — state the revisit rule

**Observed problem:** A persistent encounter is understandable visually, but
its future behavior is not self-evident.

**Ashenreach solution:** Add concise, server-projected lifecycle copy such as
`Resolved and removed`, `Remains on this sector`, or `Returns on every arrival`.
Do not encode recurrence in animation alone.

### 3. Variety opportunity — broaden recurring local challenges carefully

**Observed problem:** Ashenreach supports recurring Tile Challenges but
currently authors only one, so most direct sector identity comes from board
actions after Threat resolution.

**Ashenreach solution:** In a future mechanics-approved pass, consider a small
number of original reach-specific recurring challenges where the board itself
should remain dangerous. Each must use existing Ashenreach stats, rewards,
pressure, privacy, and server resolution. No change is made in this report.

### 4. Progression improvement — explain the source shift inward

**Observed problem:** Players may interpret the lower Inner-reach Threat density
as missing challenges rather than a deliberate shift to authored gates and
scenario pressure.

**Ashenreach solution:** On the TV and phone, preview the next reach as
`fewer roaming Threats; harder fixed trials and scenario consequences`.
Continue to calculate all legality and difficulty on the server.

### 5. Presentation improvement — stage multi-Threat arrivals

**Observed problem:** Multiple sequential encounters can blur together,
especially during automated public turns.

**Ashenreach solution:** Use a bounded queue strip on TV:
`arrival → queue count → current Threat → result → next Threat`. On phone, show
only the owner's current legal prompt. Reconnect should restore the current
queue index without replaying completed reveals.

### 6. Presentation improvement — preserve the sector beneath resolution

**Observed problem:** Full-screen encounter presentation can make viewers lose
where the event occurred.

**Ashenreach solution:** Keep the authoritative sector name, reach, and active
operative anchored during the cinematic portrait reveal. Restore board focus
after the result without moving the piece a second time.

### 7. No change recommended — arrival authority

Ashenreach's mandatory ordering, server-selected Threats, server dice, and
reconnect-safe queue are stronger guarantees than a client-driven presentation.
Do not change them for visual similarity.

### 8. No change recommended — inner and center density

The sparse Inner-reach Threat draw and scenario-controlled center are a valid
original progression model. Improve explanation and evidence before considering
content changes.

## Verification targets

The comparison is grounded in:

- `src/game/data/boardSpaces.ts`;
- `src/game/rules/tileFunctions.ts`;
- `src/game/rules/explorationPhase.ts`;
- `src/game/engine/__tests__/boardSpaceRules.test.ts`;
- `src/game/rules/__tests__/tileFunctions.test.ts`;
- `src/server/__tests__/encounterLifecycleRegression.test.ts`;
- `docs/qa/TILE_ARRIVAL_CONTENT_REVIEW.md`;
- the P23 card lifecycle audit.

Focused validation results are recorded in the walkthrough report after the
test run.
