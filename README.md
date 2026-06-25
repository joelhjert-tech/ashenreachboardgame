# Ashen Reach

Ashen Reach is a local-first co-op / competitive artifact-crawl prototype with a TV host screen, phone controllers, live WebSocket play, and a dark gothic sci-fi presentation layer.

This repository currently targets an MVP loop:

- Create a lobby in `single-player` or `multiplayer`
- Join seats from phones
- Start a live session
- Move through sectors, resolve threats, accept contracts, and push scenario progress
- Manage escalation before the breach collapses the run
- Win through the active scenario confrontation or lose to collapse

## Current MVP Scope

- 1 to 6 player support
- Host TV dashboard with tactical board overlay
- Portrait and landscape phone controller views
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
- `npm run generate:card-images:gemini` generates missing card art from `generated/card-image-prompts.json`
- `npm run generate:card-images:openai` generates missing card art with ChatGPT Image 2.0 / `gpt-image-2`

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

## Rules and Design Docs

- MVP rules: [docs/MVP_RULES.md](docs/MVP_RULES.md)
- Originality guardrails: [docs/ORIGINALITY_CHARTER.md](docs/ORIGINALITY_CHARTER.md)
- Design pillars: [docs/GAME_DESIGN_PILLARS.md](docs/GAME_DESIGN_PILLARS.md)
- Restricted terminology: [docs/BANNED_TERMS.md](docs/BANNED_TERMS.md)

## Content Layout

- `content/characters` playable operatives
- `content/gear` equippable rewards
- `content/cards/threats` enemies and hazards
- `content/cards/contracts` contract objectives
- `content/cards/anomalies` anomaly encounters
- `content/cards/artifacts` artifact rewards
- `content/cards/scars` persistent wound / Heat scars
- `content/cards/escalations` breach pressure events
- `content/sectors` authored sector deck references

## Validation Strategy

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

## MVP Loop Notes

The current playtestable loop is intentionally tight: one board region, one validated content set, escalating pressure, scenario confrontations, and seat-based phone play. Milestone 2 and 3 build on this base with richer abilities, broader encounter text resolution, stronger host controls, and release-facing documentation.
