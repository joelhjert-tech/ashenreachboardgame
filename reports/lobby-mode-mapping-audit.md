# Lobby Mode Mapping Audit

Date: 2026-07-09

## Scope

This audit reviews the current Ashen Reach local lobby/session setup model before changing the host UI. The goal is to expose only player-facing mode labels that match existing authoritative behavior.

## Worktree Safety

Before this pass, unrelated documentation/report edits were present:

- `README.md`
- `docs/CONTENT_GUIDE.md`
- `docs/DEPRECATED.md`
- `docs/MVP_RULES.md`
- `reports/phase-7-playtest-issue-template.md`
- `reports/phase-7-real-device-playtest-checklist.md`
- `docs/PLAYER_QUICKSTART.md`

They were stashed as:

`wip-docs-before-lobby-mode-audit`

## Internal Mode Concepts

Current code separates three concepts:

- `sessionMode`: `single-player` or `multiplayer`
- `interactionMode`: `co-op`, `rivalry`, or `ruthless`
- `gameMode`: `standard` or `nemesis_relay`

The server keeps session creation authoritative. Multiplayer creation requires an explicit interaction mode. Single-player forces `co-op`. `nemesis_relay` requires `co-op` and is capped at 4 players.

## Mapping Table

| Visible label | sessionMode | interactionMode | gameMode | hidden agenda? | player count | current behavior | safe to expose? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Solo Run | `single-player` | forced `co-op` | `standard` | No | 1 | Creates a one-seat authoritative session. Start still requires joined player, character, starting mission, and ready. | Yes |
| Co-op | `multiplayer` | `co-op` | `standard` | No | 2-6 | Shared scenario pressure. Phone projections omit private rivalry agenda. | Yes |
| Rivalry | `multiplayer` | `rivalry` | `standard` | Yes, phone-only | 2-6 | Competitive/private agenda behavior exists. TV receives public-safe summaries only. | Yes, with privacy copy |
| Nemesis | Unknown as a clean label | Unknown | `nemesis_relay` exists | No hidden agenda from relay itself | 2-4 for relay | Current `nemesis_relay` is a co-op relay/champion pressure variant, not the private hidden-agenda mode. Existing UI previously mislabeled Rivalry as Nemesis. | Not as hidden-agenda Nemesis |
| Ruthless | `multiplayer` | `ruthless` | `standard` | Yes, phone-only | 2-6 | Internal harsher rivalry branch. No clean player-facing setup contract in current lobby. | No |

## Findings

1. **Solo Run is safe as a player-facing label.** It should hide multiplayer furniture, but it must still use the server session/seat/start path.
2. **Co-op is safe.** It maps cleanly to `interactionMode: "co-op"` and has no private agenda panel.
3. **Rivalry is safe if framed as private-agenda competitive play.** Current rules and tests use `interactionMode: "rivalry"` for phone-only private agenda behavior.
4. **Nemesis is not safe as a hidden-agenda label yet.** The existing `gameMode: "nemesis_relay"` is explicitly co-op-only. It should not be presented as the betrayal/private-agenda mode.
5. **Ruthless must remain internal.** It should not appear in player-facing lobby text.

## Recommended Lobby Model

Use a mode-first host setup:

1. Game Selection
   - Solo Run
   - Multiplayer
2. Solo Run setup
   - Scenario selection
   - Create Solo Run
   - Start after joined character, starting mission, and ready
3. Multiplayer setup
   - Scenario selection
   - Player count
   - Co-op / Rivalry / disabled Nemesis card
   - Create Multiplayer
   - Start after all occupied seats complete character, mission, and ready

## Privacy Decision

TV may show:

- Public scenario pressure
- Public active mission/setup state
- Public rivalry reveal/completion summaries

TV must not show:

- Private rivalry objective title/body before reveal
- Owner-private notes
- Raw `ruthless`, `nemesis_relay`, or internal mode names as setup labels

## Implementation Decision

Implement only safe player-facing labels in this pass:

- `Solo Run`
- `Co-op`
- `Rivalry`

Show `Nemesis` as disabled/coming later until the product decides whether it means:

- co-op `Nemesis Relay`, or
- hidden-agenda betrayal mode.

