# Ashenreach Card, Event, Gear, and Shop Spine

This document translates the adventure-board card economy into Ashenreach's own
terms. It is a design and implementation bridge: some pieces already exist in
the repo, some are now represented as schema metadata, and some remain future
engine work.

## Current Repo Foundation

Already present:

- characters with five stats, Heat, wounds, gear, trophies, and contracts
- board spaces with red, blue, and yellow threat icons
- exploration math that counts printed icons and existing face-up cards
- engagement queue ordering for public board cards
- content-driven threats, contracts, anomalies, artifacts, scars, escalations,
  gear, sectors, and scenarios
- visible resolution panels for combat, checks, reveals, and outcomes
- phone inventory timing windows for battle assistance

New non-breaking metadata hooks:

- threat lanes: `red`, `blue`, `yellow`
- threat resolution roles: `event`, `enemy`, `nemesis`, `encounter`, `asset`
- sector `threatIcons` exposed in live sector state
- gear economy fields: `cost`, `tier`, `timingWindows`, `exhausted`

## Turn Structure

Use this rhythm as the long-term rules target:

1. Navigation
   - roll or choose movement
   - move only through connected board routes
   - resolve route checks and movement penalties
2. Exploration
   - read the sector's red, blue, and yellow threat icons
   - count unresolved face-up cards already on the sector
   - draw only enough cards to fill missing icons
3. Engagement
   - resolve public sector cards in strict order
   - unresolved blockers remain on the sector
4. Recovery
   - raise stats from trophies
   - complete contracts
   - claim artifacts if requirements are met
   - use shops only when the sector is clear
   - discard or exhaust beyond limits
5. Broadcast
   - host screen updates public board state
   - phone shows private rewards, wounds, Heat, gear, and next actions

Current implementation still uses the existing engine phases:

- `navigation`
- `sector`
- `action`
- `resolution`
- `broadcast`

The new structure should be mapped onto these phases rather than replacing them
in a disruptive migration.

## Threat Lanes

Threat lanes are public board signatures.

| Icon | Lane | Primary stats | Purpose |
| --- | --- | --- | --- |
| Red | Hostile Contact | Grit, Forge | enemies, brutes, shield units, direct violence |
| Blue | Void Anomaly | Signal, Command | anomalies, signal ghosts, reactor curses, resolve pressure |
| Yellow | Rogue Salvage | Guile, Forge | traps, ambushes, bargains, theft, unstable loot |

Board tier guidance:

- Outer: one red or yellow, or one blue on strange sectors
- Middle: mixed two-icon sectors
- Inner: three-icon pressure or scenario-defined gates
- Core: scenario-defined only

## Exploration Rule

When an operative enters a sector:

1. Count printed threat icons on the sector.
2. Count unresolved face-up cards already there.
3. Any face-up card's first icon counts as its occupied slot.
4. Additional icons on face-up cards add pressure.
5. Draw only enough red, blue, and yellow cards to fill the missing counts.

This is already implemented in `calculateExplorationDraws`.

Design result:

- cleared sectors feel safer
- neglected sectors become memorable trouble spots
- enemies and encounters can create board memory
- players can choose to route around known danger

## Engagement Order

Resolve face-up sector cards in this order:

1. Event
2. Enemy
3. Nemesis
4. Encounter
5. Asset

Current helper: `buildEngagementQueue`.

Rules intent:

- events happen first and leave
- enemies and nemeses block progress
- encounters resolve only after danger is handled
- assets are claimed last
- sector text and shops require the sector to be clear, except inner/core
  scenario spaces that explicitly override this

## Threat Resolution Roles

### Event

Fast tactical disruption.

- resolves immediately
- usually one roll or one consequence
- discards after resolution
- should not become a persistent mini-game

Examples:

- sector-wide signal scream
- sudden patrol alarm
- route splice
- reactor gust

### Enemy

Normal battle blocker.

- must be fought or bypassed
- losing usually ends the engagement
- may remain on the sector
- adds trophy value when defeated

Enemy cards should have one memorable rule:

- armored
- disables a slot
- gains power from Heat
- returns to the sector
- punishes gear-heavy players
- causes Heat when defeated

### Nemesis

Named persistent threat.

- blocks like an enemy
- may move by special mode rules
- should be public on the host board
- should create pressure beyond one card draw

Nemesis cards should stay rare and legible.

### Encounter

Persistent board problem.

- can be a test, obstacle, bargain, shrine, machine, or blocked route
- may remain until passed
- should create decisions, not only damage

### Asset

Public loot or recoverable salvage.

- acquired only after danger is clear
- may become gear, artifact progress, salvage, a follower, or a contract lead
- should feel useful but not stronger than artifacts

## Gear Economy

Existing slots stay:

- weapon
- armor
- utility

Added metadata:

- `cost`: salvage price
- `tier`: starter, standard, advanced, artifact
- `timingWindows`: when phone should surface it
- `exhausted`: runtime-ready state for future work
- `charges`: existing limited-use count
- `heatCost`: existing pressure cost

Use timing windows consistently:

- `beforeBattleRoll`
- `afterBattleRoll`
- `beforeTakingDamage`
- `startOfTurn`
- `movement`
- `shop`
- `anyTime`

Battle rule target:

- one weapon and one armor can apply to a battle
- utilities apply only when their timing window allows
- charged gear spends a charge before or after a roll
- empty charged gear remains only if its text says it still has passive value

## Salvage Economy

Salvage is the main shop currency.

Rules target:

- each operative starts with 3 Salvage
- enemies, contracts, assets, and shops can grant Salvage
- shops spend Salvage
- gear can be sold or scrapped for Salvage
- risky shortcuts can trade Heat for Salvage value

Implementation note:

Salvage is not yet a first-class character field in the schema. Until it is,
use notes, gear rewards, and contract effects as the transitional layer.

## Shop Sectors

Shops are board text actions that require the sector to be clear.

Recommended shop roles:

- Anchor Market: buy, sell, and refresh gear
- Black Vault: draw tactic cards and risky power options
- Chapel of Seals: heal wounds, cool Heat, relieve scars
- Contract Spire: draw, replace, and turn in contracts
- Salvage Foundry: recharge, repair, and upgrade gear
- Smuggler Dock: discount gear with Guile risk
- Bunker Clinic: recall recovery and scar choices
- Cartographer Shrine: scouting and safe movement tools

The rule is simple:

If unresolved threats are face-up on the sector, resolve those before shopping.

## Contracts and Artifact Access

Contracts should become the directed mission economy.

Rules target:

- each operative may hold one active contract
- completed contracts go into a completed contract pile
- completed contracts can be spent as progress currency
- spending 3 completed contracts should unlock artifact access
- artifacts should help qualify a character for inner-ring or core attempts

Current implementation:

- active contracts exist
- contract objectives exist
- contract completion rewards exist
- completed-contract currency is not first-class yet

Low-risk migration:

1. Add completed contract tracking to character state.
2. Add contract-spend action at a shop or core gate.
3. Add artifact draw/keep flow.
4. Add scenario rules that require artifact access only after UI is ready.

## Tactic Cards

Tactics are the best future phone-only hidden hand.

Target rules:

- each tactic has a value from 1 to 6
- play for text or as a die replacement
- discard after use
- hand limit scales with rank
- timing windows match inventory helpers

Recommended starting set:

- movement burst
- stat substitution
- wound prevention
- reroll
- Heat dump
- assist another operative

Do not add tactics until the engine has a hidden-hand resolver and clear phone
buttons. The current inventory helper is the right UI base.

## Scars and Corruption Pressure

Scars are Ashenreach's lasting corruption/injury layer.

Rules target:

- gain scars from recall, severe anomaly failures, or boss failures
- scars apply persistent penalties
- some scars include a small upside
- at 3 scars, the operative retires or transforms unless the scenario says
  otherwise

This creates hard choices without adding a copied corruption deck.

## Content Targets

Long-term targets:

- 40 red threats
- 40 blue threats
- 40 yellow threats
- 36 gear cards
- 36 tactic cards
- 24 contracts
- 18 artifacts
- 24 scars
- 18 escalations
- 8 shop sectors

Current content should grow toward these targets only after the engine can
surface the matching mechanics. Do not author 120 threats before persistent
sector cards and lane draw rules are wired into live gameplay.

## Implementation Roadmap

Recommended order:

1. Expose sector threat icons to TV and phone.
2. Convert current threat cards to optional `threatLane` metadata.
3. Add persistent unresolved sector cards to session state.
4. Use `calculateExplorationDraws` during live sector entry.
5. Resolve sector cards through `buildEngagementQueue`.
6. Add event and encounter card handling.
7. Add asset acquisition after danger is cleared.
8. Add Salvage to character state.
9. Add shop sector text actions.
10. Add completed contracts as currency.
11. Add artifact-gated inner/core access.
12. Add tactic cards and hidden-hand phone UI.

## Design Guardrails

- Keep Ashenreach names and lore original.
- Do not copy protected text, factions, symbols, or visual identity.
- Prefer one clear rule per card.
- Let cards remain on sectors when unresolved.
- Make the host screen show public board pressure.
- Make the phone show private choices and usable timing windows.
- Keep validation and tests ahead of content scale.
