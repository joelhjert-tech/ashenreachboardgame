# Final character roster RC verification

Audited cleanly at `87127f5` on 2026-07-09. The audit worktree was created at
that commit with no phone WIP or QA screenshots present.

## Verdict

**Not RC-ready: one release gate remains.** Mira's player path is now
implemented and server-authoritative, and Deepdale no longer promises missing
rules. The first-eligible timing implementation is plausible in code, but it
has no targeted real-path tests for Kira, Rumi, Lane, or Popelord. The stated
release criterion requires ineligible-before-eligible and second-eligible
coverage for each of those abilities; the focused test search found none.

This is a contained test-coverage blocker, not a character redesign request.

## Mira, Vow Notes, and Cinder Oath

* Phone-private `self.noteResources` projects only typed `vow` counts.
* `cinder-oath` is the only reviewed character-facing named Note spend. Other
  named notes are narrative/private entries and do not offer spending.
* The phone renders **Prepare Cinder Oath** only for Mira in the active Action
  flow at the Cinder Gate with an active scenario and no encounter. It shows a
  disabled, explicit zero-Vow reason when unavailable and sends
  `USE_CHARACTER_ABILITY` with `abilityId: cinder-oath` when chosen.
* The server validates character, action phase, Cinder Gate location, active
  seat, once-per-round event marker, and one available Vow; all resolution and
  mutation remain server-side. It deducts exactly one Vow and applies +2 to
  every confrontation test for the prepared round.
* Phone tests cover visible/available, disabled at zero, hidden off-site, and
  exact intent dispatch. Engine coverage proves zero-Vow rejection, repeat
  rejection, payment, and the confrontation summary. It does **not** cover a
  real phone-to-server gain/spend/reconnect sequence, so that remains useful
  non-blocking hardening.

The wrong-character, wrong-phase, wrong-location, zero-Vow, and repeated-use
server rejections are explicit. "Wrong test type" is structurally prevented:
the action is accepted only before the scenario confrontation; it has no
generic check/test target payload to misuse.

## First-eligible timing review

| Character | Sheet / implementation | Eligibility behavior | Coverage verdict |
| --- | --- | --- | --- |
| Kira | First Grit battle started this turn, +1. | Marker is created after an eligible battle resolves; non-battle checks do not mark it. | Missing ineligible-then-battle and second-battle tests. |
| Rumi | First Signal or Guile battle/test each round, +1. | Marker is created after a matching Signal/Guile result; Forge/Command/Grit do not mark it. | Missing ineligible-then-eligible and second-eligible tests. |
| Lane | First Blue Anomaly each round, -1 difficulty. | Hazard modifier is gated by a `hush-static` round marker and marked after the matching hazard. | Missing the two required timing tests; also exercise the separate space-text trigger path. |
| Popelord | First yellow hazard each round, -1 difficulty. | Hazard modifier is gated by a `compost-cape` round marker and marked after matching hazard. | Missing the two required timing tests. |

The hooks no longer use the previous generic “any resolved check/combat” guard,
so an unrelated event no longer consumes them by implementation. The absent
tests are the remaining RC blocker because timing errors are precisely where
regressions are easy to conceal.

## Deepdale and terminology

Deepdale's four unsupported abilities are now explicitly descriptive and no
longer promise target inspection, repair, Signal bonus, or a shop discount.
Stats remain C1/G3/S4/U2/F5 (15), role remains Deep Route Delver, and no
mechanical redesign occurred.

No reviewed player-facing character sheet uses deprecated Heat terminology.
`heat-sink-prayer` remains a commented legacy save-compatibility ID; the
displayed name is Scar-Sink Prayer. Typed Vow Note wording appears only in
Mira's supported resource package. Pressure, Scar, and route-note wording is
consistent with the current private/public split.

## Roster matrix

| Character | Stat line | Total | Role | Main strength | Main weakness | Backing | Cx | Risk | RC status |
| --- | --- | ---: | --- | --- | --- | --- | ---: | ---: | --- |
| Joss Var | C3/G1/S3/U5/F3 | 15 | leverage broker | Guile control | direct fights | Yes | 3 | 3 | Ready |
| Bjornis | C2/G5/S1/U3/F4 | 15 | red bruiser | red pressure relief | Blue Signal | Partial | 3 | 3 | Wording polish |
| Deepdale | C1/G3/S4/U2/F5 | 15 | route delver | Forge/routes | low Command | Descriptive | 2 | 2 | Ready |
| Ker Von Ker | C1/G5/S1/U3/F5 | 15 | fortress | wound prevention | slow/low Command | Yes | 2 | 3 | Ready |
| Kira | C3/G5/S1/U4/F2 | 15 | vanguard | first battle | low Forge | Partial | 2 | 3 | Light tuning |
| Popelord | C3/G5/S1/U2/F4 | 15 | hazard scavenger | yellow hazards | low Signal/Guile | Partial | 3 | 3 | Light tuning |
| Rumi | C1/G3/S5/U4/F2 | 15 | riftblade | Signal/Guile burst | low Command/Forge | Partial | 3 | 4 | Light tuning |
| Mira | C2/G4/S3/U3/F3 | 15 | oathkeeper | confrontation burst | Vow economy | Yes | 4 | 4 | Ready |
| Orenna Tash | C5/G1/S4/U2/F3 | 15 | convoy lead | team routing | low Grit | Yes | 3 | 3 | Ready |
| Dessa Korr | C1/G3/S2/U4/F5 | 15 | grave engineer | Forge/Salvage | low Command | Yes | 3 | 4 | Ready |
| Reskin Hale | C4/G2/S1/U5/F3 | 15 | trickster | bargaining | low Signal | Yes | 3 | 4 | Ready |
| Senna Pell | C1/G2/S5/U5/F2 | 15 | cartographer | information | direct checks | Yes | 3 | 3 | Ready |
| Brask Ode | C2/G3/S1/U4/F5 | 15 | salvage warden | gear economy | low Signal | Yes | 3 | 4 | Ready |
| Dr. Yuna Castell | C3/G3/S2/U2/F5 | 15 | siege medic | wounds | low Signal/Guile | Yes | 3 | 4 | Ready |
| Lane | C1/G2/S5/U4/F3 | 15 | Signal witch | Blue Anomalies | low Command/Grit | Partial | 3 | 3 | Light tuning |
| Tarek Voss | C5/G3/S2/U2/F3 | 15 | void marshal | command | low Signal/Guile | Yes | 3 | 3 | Ready |

## Grouping

* **Ready for playtest (11):** Joss, Deepdale, Ker, Mira, Orenna, Dessa,
  Reskin, Senna, Brask, Dr. Yuna, Tarek.
* **Needs wording polish (1):** Bjornis.
* **Needs light tuning/test completion (4):** Kira, Popelord, Rumi, Lane.
* **Blocked (0 character-design blockers):** none. The roster-level RC gate is
  blocked only by the missing targeted timing regressions.

## Synchronization and compatibility

No client-only authority was found: Cinder Oath validation, Vow payment, and
confrontation bonus live on the server. Vow resources remain private to the
owning phone, while public projections omit them. The legacy Scar-Sink Prayer
ID remains save-compatible and cannot be player-facing through its display
content. The remaining risk is test confidence, not a discovered desync or
free-repeat path.

## Required next gate

Add real engine/server tests for each first-eligible rule: unrelated event,
first matching event, and second matching event in the same window. Include
Lane's space-text route. Then rerun this report-only audit; no content rewrite
is indicated.

## Verification

All commands passed in the clean worktree pinned to `87127f5`:

| Command | Result |
| --- | --- |
| `npm.cmd run validate:content` | Passed — all authored content validated. |
| `npm.cmd run typecheck` | Passed. |
| `npm.cmd run test:engine` | Passed — 14 files, 231 tests. |
| `npm.cmd run test` | Passed — 57 files, 633 tests. |
| `npm.cmd run audit:assets` | Passed — 404/404 present, no release blockers. |
| `npm.cmd run build` | Passed. |
| `git diff --check` | Passed. |

The test suite is green, but it does not supply the required targeted
first-eligible regression cases described in this report.
