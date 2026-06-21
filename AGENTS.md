# Ashen Reach Agent Rules

## Originality And IP Rule

Ashen Reach is an original dark science-fantasy adventure board game built as a
web app with a shared TV display and private phone controllers.

Do not use, reference, or generate:

- Any Games Workshop or Warhammer 40,000 names, factions, terms, lore, card
  text, or iconography
- Any Talisman or Relic card text, board layout, stat names, or scenario text
- Any copied or paraphrased text or art from those properties

All names, stats, factions, lore, card text, board layout, and UI must be
original to Ashen Reach.

## Architecture Decisions

- Server-authoritative. The game server is the sole source of truth.
- Two client surfaces, one server. TV is the shared board. Phone is the private
  player controller.
- Realtime transport must use WebSockets.
- State model must use an append-only event log plus periodic snapshots.
- Visibility must support field-level public and private state splits.
- TypeScript is required across the project.

## Delivery Guidance

- Keep this repository focused on mechanics-only scaffolding unless a later task
  expands scope.
- Treat clients as thin views over server state.
- Randomness must be resolved only on the server.
- Future sessions should preserve the original-IP rule and architecture
  decisions unless the user explicitly changes them.
