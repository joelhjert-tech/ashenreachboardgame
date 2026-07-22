# P12 Objective Presentation Report

## Outcome

P12 separates the table's Shared Mission, the owner's private Contract, and the owner's Rivalry/Ruthless Agenda without changing objective rules. The repository has no mechanically distinct Quest system, so the phone tab is now **Objectives** and no false Quest lifecycle was created.

The server remains authoritative for progress, completion, rewards, reveal state, replacement options, and visibility. The client presentation adapter only groups and formats already-authoritative state.

## Architecture

| Term | Canonical meaning | Authority | Visibility |
|---|---|---|---|
| Shared Mission | The selected Scenario's public objective and progress | Scenario state, pressure state, preparation/confrontation state, result events | Public to all phones and TV |
| Contract | One operative-owned typed personal objective | `activeContract`, Contract catalog, reducer completion and deterministic replacement selection | Full detail on owner phone; generic activity/completion publicly |
| Quest | No schema, catalog, reducer, assignment, progress, or projection exists | None | Not presented as a separate system |
| Agenda | Rivalry/Ruthless private objective and scoring state | `player.private.rivalryAgenda` and server trigger rules | Owner only until canonical reveal permits a generic public event |

Before P12, the phone mixed Scenario, Contract, and Agenda under Quest terminology. Public player projection exposed Contract identity/progress, allowing the TV and map to reconstruct private objectives from the public Contract catalog. Locked Agenda projections also serialized protected objective fields.

After P12:

- `objectivePresentation.ts` builds pure display models from the existing projections.
- Shared Mission is first and includes stage, win progress, loss pressure, next action, and collapsed briefing.
- Owner Contract shows current condition first, exact progress, reward, and collapsed lore.
- Replacement Contract selection follows the completed reward/archive step and remains owner-private.
- Completed Contracts are a collapsed audit history.
- Agenda locked states omit objective and scoring fields; revealed/completed states expose only the owner's authorized fields.
- Public player state contains only `privateObjectiveStatus`, never Contract identity, condition, progress, reward, or destination.
- Contract resolution details and deltas are owner-private; TV and waiting phones receive generic display-name-based wording.
- P11 private Contract map markers disappear because no private ownership ID crosses the public projection boundary. Public Scenario context remains.

## Mission UX

The Objectives tab leads with **Shared Mission**. It uses the selected Scenario's authoritative name, public premise, stage label, progress label/current/required values, Loss Pressure, and next instruction. Long briefing and conditions are collapsed. The TV command header now includes the Shared Mission name beside Win Progress, while the map-first layout retains canonical public Scenario progress and public markers.

The current runtime exposes one active Scenario stage presentation rather than a separate ordered stage-history schema. P12 does not invent hidden or completed stages. Scenario completion continues through existing Scenario result/victory authority.

## Contract UX

The owner sees one active Contract because that is the canonical model. Typed objectives are translated into player-facing conditions; raw keys such as `multiStopRoute` and `shopTransaction` never render. Multi-stop conditions are ordered current, remaining, then completed. Exact reward wording comes from canonical typed reward data.

Contract rewards still apply automatically through the existing reducer. There is no canonical reward-claim action, Contract failure, expiration, or abandon command, so none was fabricated. Completion remains reward once, archive once, clear active Contract, then deterministic private replacement selection.

## Agenda UX

- **Locked:** title, target, progress, stakes, and scoring are absent from the serialized payload. The owner sees a sealed objective and reveal timing hint.
- **Reveal available:** only the owner receives the typed reveal action.
- **Revealed/in progress:** the owner sees canonical objective, progress, stakes, and private notes.
- **Completed/failed:** the owner sees canonical scoring/completion text. Public surfaces receive only the existing generic event summary.

Reconnect rebuilds the exact server reveal state. No cached client inference is used.

## Completion and stale state

Contract completion identity and reward idempotency remain in the reducer/event log. Owner detail is attached to an owner-private resolution origin. Public result deltas contain no Contract ID, title, target, progress, or reward. Replacement selection retains its canonical selection ID and stale/duplicate rejection. Because automatic rewards do not expose a Claim command, no artificial stale-claim UI or fixture was added.

## Files changed for P12

- `src/client/shared/types.ts`
- `src/client/shared/objectivePresentation.ts`
- `src/client/shared/__tests__/objectivePresentation.test.ts`
- `src/client/phone/PortraitControllerView.tsx`
- `src/client/phone/PhoneActionPanel.tsx`
- `src/client/phone/usefulNowPresentation.ts`
- `src/client/shared/explainabilityPrompts.ts`
- `src/client/tv/TvApp.tsx`
- `src/client/tv/HostPlayerCard.tsx`
- `src/client/styles.css`
- `src/game/engine/reducer.ts`
- `src/server/roomServer.ts`
- `src/server/phaseOneQaFixture.ts`
- focused phone, TV, server, Agenda, session, fixture, map, privacy, and required-action tests
- `scripts/capture-p12-objectives.ts`
- P12 design, implementation, QA, timing, accessibility, privacy, and backlog documentation

## Deterministic QA

The environment-gated `objective-presentation` fixture uses normal game state and normal server projections. Supported stages are shared progress, Contract progress, near completion, completed/replacement selection, Agenda locked/revealed/completed, owner-private resolution, and long content. The browser harness creates a real two-player Rivalry room and reaches setup/start through normal phone commands before applying those isolated presentation stages.

Unsupported combinations were not fabricated:

- distinct Quest states (no Quest mechanics exist);
- Contract failure/expiration (no canonical states exist);
- explicit reward claim/stale claim (rewards apply automatically);
- hidden Agenda target presentation (current authored agendas do not expose a separate target field in the tested state);
- completed Scenario stage history (not separately projected).

## Four-seat critique

### New player

The Shared Mission now explains the table goal first; My Contract and Private Agenda are explicitly separated. Locked Agenda wording is clear without exposing its objective. The replacement picker says Contract consistently.

### Optimizer

Exact owner progress, remaining route stops, and rewards remain visible. Near-complete Contracts are not inferred or made public. Removing the public Contract linkage closes opponent reconstruction and private-map-target leakage.

### Family/casual player

Long lore and completed history are collapsed. The required information remains readable in one vertical phone flow. A screenshot review removed repeated locked-Agenda hint text and corrected the public waiting term from mission to Contract.

### Rules lawyer

All numbers come from authoritative state. Locked Agenda fields are absent rather than merely hidden by CSS. Contract rewards/completion are unchanged and idempotent. No unsupported Claim, Quest, failure, target, or stage behavior was invented.

## Verification

Focused P12 regression set: **251/251 passed** across objective presentation, locked/revealed Agenda, Agenda progress, session projection, deterministic fixture, TV, BoardMap, phone, inventory, and required-action tests. The subsequent private-resolution regression set passed **45/45** after adding the serialized required-action assertion.

- Content validation: passed (18 characters, 71 Gear, 109 Threats, 36 Contracts, 20 Anomalies, 30 Artifacts, 24 Followers, 24 Scars, 16 Escalations, 30 Afflictions)
- Typecheck: passed
- Client: **414/414 passed**
- Integration: **355/355 passed**
- Engine/rules: **763/763 passed**
- Rules-only: **64/64 passed**
- Production build: passed (561 modules)
- Asset audit: **435/435 present**, 0 invalid, 0 placeholders, 0 release blockers
- Aggregate wrapper: timed out at **484.0 seconds** without reporting a test failure; it is not reported as passed. Every constituent suite passed independently as listed above.
- Browser QA: 39 screenshots, six supported-flow recordings, 0 horizontal overflow, 0 horizontally clipped controls, 0 forbidden visible identifiers, 0 console errors
- Ports: 5173 and 8080 free after QA
- Diff checks: working-tree and cached checks passed
- Git: branch `ui/tv-movement-focus-mode`, HEAD `6bd4fc05a292df3749d024070260c27cf61c517a`; the pre-existing dirty work remains preserved, and P12 was not committed or pushed

Browser evidence is indexed in `docs/qa/P12_OBJECTIVE_SCREENSHOT_INDEX.md`.

## Remaining risks

1. The public TV uses a compact mission/progress instrument in the map-first header rather than reopening the removed permanent sidebar; very long Scenario names ellipsize after remaining identifiable.
2. The canonical model supports only one active Contract per operative, so multiple-active-Contract ordering cannot be demonstrated without changing mechanics.
3. No canonical explicit Contract reward claim, failure, expiration, or separate Quest lifecycle exists; future mechanics need their own projection and QA pass.
