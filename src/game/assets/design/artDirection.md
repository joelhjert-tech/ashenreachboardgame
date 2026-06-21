# Ashen Reach Asset Direction

## Purpose

This folder defines the original visual and content language for the Antias
Sector board-game mode. The Google Drive reference dump is used only for
component hierarchy, readability, and tabletop layout study.

Do not copy:

- Art
- Portraits
- Symbols
- Faction marks
- Names
- Exact text
- Card backs
- Sheet layouts pixel-for-pixel

## Visual Pillars

- Dark science-fantasy tabletop interface
- Ancient plated metal frames with worn fasteners
- Ash-white paper panels with burn marks and seal notches
- Blue-white Rift glow against rust-black steel
- Strong color coding for red, blue, yellow, green, bronze, and violet systems
- Large title bands and clear stat dials readable at TV distance
- Portrait-first character sheets with strong silhouette contrast
- Mobile-safe text sizing and simplified card framing for phone views

## Attribute Language

The live engine still uses Ashen Reach's existing stat schema. This design
layer can describe a future Antias board-game mode with:

- `strength` for red pressure
- `willpower` for blue pressure
- `cunning` for yellow pressure
- `life` for vitality
- `influence` as a resource, not a test stat

## Layout Guidance

- Character sheet: progression band at top, portrait left-center, ability panel
  right, stat row bottom.
- Mission card: title, flavor line, objective, reward, tier marker.
- Threat card: color frame, art window, type line, rules text, trophy value if
  hostile.
- Board tile: strong title, compact icon row, legible rules text, unique
  top-down vignette.

## Original Lore Tone

Antias is a collapsing frontier around a reality breach. Its factions should
feel oathbound, desperate, ritualized, and industrial rather than militarily
bureaucratic. Core motifs:

- Saint reliquaries
- Rift scars
- Salvage fleets
- Broken watch-beacons
- Funeral steel
- Choir relays
- Breach pilgrimages

## Implementation Rule

All assets remain data-driven. UI components may render these definitions, but
they must not encode gameplay text, icon mapping, or card effects inline.
