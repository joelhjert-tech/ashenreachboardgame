# P9 Cross-System UX Backlog

## P12 closure update

- Implemented: P9-009 and the ranked Quest/Contract/private-Agenda presentation candidate.
- Active-play terminology now distinguishes the public Shared Mission, owner-private Contract, absent/non-mechanical Quest concept, and Rivalry/Ruthless Private Agenda without renaming stable schema fields.
- Public projection no longer links players to private Contract IDs, progress, rewards, or map destinations. Locked Agenda payloads omit protected objective/scoring fields, and owner-private required-action detail is absent from waiting-phone and TV payloads.
- Validation: 39 screenshots, six supported-flow recordings, 0 horizontal overflow, 0 horizontal control clipping, 0 console errors, 414/414 client, 355/355 integration, 763/763 engine/rules, 435/435 assets. The aggregate wrapper timed out at 484.0 seconds without a reported failure; independent suites all passed.
- Evidence: `docs/implementation/P12_OBJECTIVE_PRESENTATION_REPORT.md` and `docs/qa/P12_OBJECTIVE_SCREENSHOT_INDEX.md`.

## P11 closure update

- Implemented: P9-010 Host board/map refinement.
- The active operative now has text-and-shape emphasis, selected/current sectors receive a bounded public-safe brief, dense mission markers group predictably, and authoritative route, ring, challenge, shop, scenario, objective, and occupant context remain visible without a permanent rail.
- Validation: 30 screenshots across 1366x768, 1600x900, and 1920x1080; seven recordings; 0 overflow; 0 console errors; aggregate 1,526/1,526; assets 435/435.
- Evidence: `docs/implementation/P11_HOST_MAP_INFORMATION_REPORT.md` and `docs/qa/P11_HOST_MAP_SCREENSHOT_INDEX.md`.

## P10 closure update

- Resolved: P9-001 arrival continuity, P9-002 Shop control collision, P9-003 waiting duplication, P9-004 setup focus, P9-005 TV status wrapping/repetition, P9-006 P2/P3 harness races, and P9-008 enemy-calculation wording.
- Narrowly resolved: P9-009 no longer exposes a raw Contract ID on the player-facing Mission surface. The broader content-language inventory remains a later editorial task.
- Still open by design: P9-007 active Rivalry and genuine server-outage visual evidence. Neither state was fabricated in P10.
- Evidence: `docs/implementation/P10_TRANSITION_RESPONSIVE_RECOVERY_REPORT.md` and `docs/qa/P10_TRANSITION_RESPONSIVE_SCREENSHOT_INDEX.md`.

## Triage rule

This backlog is evidence-led and presentation-only. It does not authorize changes to gameplay authority, rules, privacy, saves, movement topology, encounter outcomes, or economy. P0 means the game cannot safely ship; P1 means the problem should be repaired before starting another feature; P2 belongs in the next bounded presentation slice; P3 is later polish or terminology work.

## Must fix before a new feature

| ID | Severity | System / mode / screen | Evidence | Player impact | Probable presentation cause | Focused correction | Likely files | Authority / privacy / responsive risks | Regression evidence |
|---|---|---|---|---|---|---|---|---|---|
| P9-001 | P1 | Movement / all modes / TV arrival | Two fresh P2 runs never observed `.tv-movement-journey.is-arrived`; the final movement screenshot already shows the following Hazard result. | The operative appears to skip from travel to encounter, so players lose confirmation of where the piece landed. | Arrival is represented by a transient render state that is replaced immediately when the authoritative encounter projection arrives. | Preserve a short, non-blocking visual arrival hold from the completed authoritative route before presenting the next overlay. State must drive animation; animation must not delay resolution. | TV movement journey/presentation components and their focused tests; P2 capture harness | Must not hold server state, replay movement on reconnect, or expose a hidden destination. Verify 1366/1600/1920 and reduced motion. | Route remains canonical; encounter appears once; reconnect skips completed travel; reduced motion conveys arrival; no duplicate callback. |
| P9-002 | P1 | Shop / phone / stock carousel | Fresh P6 captures at 390×844 and 360×800 show sticky `LEAVE SHOP` overlapping the stock Previous/Next controls. | A visible legal control is obscured, making offer comparison and shop exit unreliable on common phones. | Two independently sticky bottom regions reserve the same vertical space. | Use a single measured sticky action region or reserve shared safe-area space so carousel navigation and Leave Shop never collide. | Phone shop layout/styles and viewport tests | Must not alter transactions, stock, private choices, or navigation authority. Check browser chrome and safe areas at 360/390/430. | All controls ≥44 px, no overlap, no horizontal overflow, purchase/leave remains one submission. |

## Next controlled slice

| ID | Severity | System / mode / screen | Evidence | Player impact | Focused correction | Likely files | Risks and tests |
|---|---|---|---|---|---|---|---|
| P9-003 | P2 | Waiting / multiplayer / phone | P4 private-decision capture repeats the same actor/context in two framed blocks. | Players must parse duplicate status before finding the actual waiting reason. | Consolidate actor, activity, and waiting reason into one canonical status block while retaining the accessible live region. | Phone waiting/status components | Preserve owner privacy and screen-reader announcements; test private/public waits and reconnect. |
| P9-004 | P2 | Setup / all modes / phone | Fresh P5 setup run leaves focus on document/body when operative and mission choices appear. | Keyboard/switch users do not land at the newly required choice. | Focus the authoritative stage heading or first legal option once when stage identity changes. | Phone setup selection components | Avoid stealing focus after user interaction or reconnect; test stage changes and back navigation. |
| P9-005 | P2 | Shared status / TV | Fresh P8 supporting live-status text repeats actor/phase context and visibly truncates. | Couch viewers see incomplete copy and redundant information beside otherwise clear primary state. | Keep the primary status complete; shorten or safely ellipsize secondary context only. | TV status ribbon/shared presentation shell | Test longest player name at 1366 and all public/private projections. |
| P9-006 | P2 | QA / movement and battle capture | P2 waits for a transient arrival class; P3 waits for every document image, including intentional fallbacks. Both fail repeatably while partial captures and runtime remain usable. | Regression evidence is harder to trust and future audits can mistake harness drift for product failure. | Wait on stable authoritative visible states, not animation classes or all-image completion. Record intentional image fallback separately. | P2/P3 capture scripts only | Do not add product debug state. Prove repeat runs and server cleanup. |
| P9-008 | P2 | Battle / TV result | Fresh P8 battle result labels enemy arithmetic as `BATTLE 0`. | The number reads like a round or score instead of enemy roll/base contribution. | Use a player-facing arithmetic label such as `ENEMY ROLL` or the canonical term represented by the value. | TV battle calculation presenter | Do not change totals or tie rules; snapshot all battle outcomes. |

## Later validation and polish

| ID | Severity | Area | Evidence / reason | Next action |
|---|---|---|---|---|
| P9-007 | P2 | Rivalry and true server-loss coverage | Current automated rules protect privacy and recovery, but this audit did not fabricate active Rivalry agenda play or a real server outage. | Add bounded real-session visual coverage when those authoritative states can be reached safely. Never synthesize private data on TV. |
| P9-009 | Implemented in P12 | Mission/Contract vocabulary | Canonical audit confirmed Scenario as Shared Mission, Contract as private operative objective, no distinct Quest system, and Agenda as Rivalry-private. | Closed with presentation-only terminology, owner-private projections, and serialized privacy tests; stable IDs and setup mechanics remain unchanged. |
| P9-010 | Implemented in P11 | Host board/map refinement | Full-flow evidence identified active-operative, sector-context, and six-player marker-density weaknesses. | Closed with a bounded public sector brief, explicit active identity, stable marker grouping, and authoritative route/context presentation. |

## Candidate ranking after P11

| Rank | Candidate | Why now / why later | Risk |
|---:|---|---|---|
| 1 | C — Quest/Contract/private agenda | Host-map context is now stable; terminology debt and incomplete Rivalry visual evidence remain. Begin with an authority/privacy audit. | Medium-high: private projection risk. |
| 2 | A — Dice presentation | Dice and totals are readable and auditable; further work should remain evidence-led and restrained. | Medium: easy to over-animate a functioning system. |
| 3 | B — Objectives/endgame | Current evidence is insufficient for a safe presentation redesign and this area has the highest rules and scenario coupling. | High: victory, privacy, and progression authority. |

## Explicitly rejected changes

- Do not redesign the board, battle chamber, shop, inventory, or phone navigation broadly.
- Do not delay authoritative encounter progression to make an animation finish.
- Do not make TV controls actionable.
- Do not expose Rivalry agendas, private mission details, Artifact choices, or inventory decisions.
- Do not reinterpret tie rules or battle arithmetic.
- Do not add client-authored status or timing state.
- Do not treat the P8 `resetAuth=1` Join Room capture as a reconnect defect.
- Do not invent server-unavailable or Rivalry screenshots.
