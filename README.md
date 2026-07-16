# Ashen Reach

Ashen Reach is a local-first digital board game with a shared host TV command display, private phone controllers, live WebSocket play, and an original dark gothic sci-fi presentation layer.

This repository currently targets a Talisman/Relic-style play pattern without reusing those games' names, text, layout, lore, or art. The current implementation direction is documented in:

- [docs/CURRENT_PROJECT_STRUCTURE.md](docs/CURRENT_PROJECT_STRUCTURE.md)
- [docs/UI_DIRECTION.md](docs/UI_DIRECTION.md)
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md)
- [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md)
- [docs/DEPRECATED.md](docs/DEPRECATED.md)

The MVP loop is:

- Create a lobby in `single-player` or `multiplayer`
- Join seats from phones
- Start a live session
- Move through sectors, resolve threats, accept contracts, and push scenario progress
- Manage escalation before the breach collapses the run
- Win through the active scenario confrontation or lose to collapse

## Current Scope

- 1 to 6 player support
- Host TV command dashboard with compact status, active operative focus, tile-PNG board view, and Command Hub diagnostics
- Portrait phone controller as the primary player surface
- Six built-in scenarios
- Content-driven characters, threats, gear, contracts, anomalies, artifacts, scars, and escalation cards
- Automated engine, client, and server integration tests

## Getting Started

Requirements:

- Node.js 20+
- npm

Install:

```bash
npm install
```

Run the full local stack:

```bash
npm run dev
```

Useful scripts:

- `npm run dev` starts the HTTP API, WebSocket server, and Vite client
- `npm run dev:server` starts only the server
- `npm run dev:client` starts only the client
- `npm run validate:content` validates all content files and cross-references
- `npm run test:client` runs TV / phone UI tests
- `npm run test:engine` runs engine and room-server logic tests
- `npm run test:integration` runs WebSocket and end-to-end server integration tests
- `npm run audit:assets` checks asset coverage
- `npm run export:image-prompts` refreshes the typed prompt catalogs and transient `generated/card-image-prompts.json`
- `npm run generate:card-images:gemini` refreshes prompts, then generates missing card art
- `npm run generate:card-images:openai` refreshes prompts, then generates missing card art with `gpt-image-2`

Generate missing card images with ChatGPT Image 2.0:

```powershell
$env:OPENAI_API_KEY="your_key_here"
npm run generate:card-images:openai
```

For a small smoke test, run `npm run generate:card-images:openai -- --limit 1`.

Generate missing card images with Gemini:

```powershell
$env:GEMINI_API_KEY="your_key_here"
npm run generate:card-images:gemini
```

For a small smoke test, run `npm run generate:card-images:gemini -- --limit 1`.

## Validation

Run the core safety checks before and after behavior changes:

```bash
npm run validate:content
npm run typecheck
npm run test:client
npm run build
npm run audit:assets
```

`npm run audit:assets` writes detailed JSON reports under `artifacts/assets/`. Those files are local QA output and are ignored by Git.

## Current Docs

- Current structure: [docs/CURRENT_PROJECT_STRUCTURE.md](docs/CURRENT_PROJECT_STRUCTURE.md)
- UI direction: [docs/UI_DIRECTION.md](docs/UI_DIRECTION.md)
- Content guide: [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md)
- Asset pipeline: [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md)
- Deprecated concepts: [docs/DEPRECATED.md](docs/DEPRECATED.md)
- MVP rules reference: [docs/MVP_RULES.md](docs/MVP_RULES.md)
- Originality guardrails: [docs/ORIGINALITY_CHARTER.md](docs/ORIGINALITY_CHARTER.md)
- Restricted terminology: [docs/BANNED_TERMS.md](docs/BANNED_TERMS.md)

## Content Layout

- `content/characters` playable operatives
- `content/gear` equippable rewards
- `content/cards/threats` enemies and hazards
- `content/cards/contracts` contract objectives
- `content/cards/anomalies` anomaly encounters
- `content/cards/artifacts` artifact rewards
- `content/cards/scars` persistent consequences of the Wound and Scar lifecycle
- `content/cards/escalations` breach pressure events
- `content/sectors` authored sector deck references

Content validation checks:

- schema correctness for every content type
- cross-references from sectors to encounter decks
- cross-references from effects and rewards to gear and scar cards
- character starting gear and equipment integrity
- duplicate IDs across runtime content pools

## CI

GitHub Actions runs:

- `npx tsc --noEmit`
- `npm run validate:content`
- `npm run test:client`
- `npm run test:engine`
- `npm run test:integration`

## Cleanup Notes

The project has old generated prompts, QA screenshots, asset-audit artifacts, and design notes. Do not delete them casually. Start with [reports/project-cleanup-audit.md](reports/project-cleanup-audit.md), then move uncertain design/reference material to `_archive/` only after proving it is outside the runtime path.
