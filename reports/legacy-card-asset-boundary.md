# Legacy Card Asset Boundary

Baseline: `4d39e96 archive-promoted-legacy-contract-assets`

This report locks the card-art boundary after the Equipment, Artifact/Relic, Threat, and Contract promotion/archive passes.

## Boundary Rule

`public/assets/riftfall/cards/` is no longer an active runtime card-art source.

It may contain only deferred, reference, or prompt-only material. Active card art belongs under `public/assets/cards/`.

## Active Card Roots

- `public/assets/cards/threats/red/`
- `public/assets/cards/threats/blue/`
- `public/assets/cards/threats/yellow/`
- `public/assets/cards/contracts/`
- `public/assets/cards/anomalies/`
- `public/assets/cards/artifacts/`
- `public/assets/cards/equipment/`
- `public/assets/cards/scars/`
- `public/assets/cards/escalations/`
- `public/assets/cards/fallbacks/`

## Remaining Legacy Files

These files are intentionally retained as reference/deferred material:

| legacy file | status |
|---|---|
| `public/assets/riftfall/cards/heat/card_back_heat.png` | deprecated Heat reference only |
| `public/assets/riftfall/cards/heat/heat_card_black_mirror.png` | scar/corruption inspiration only |
| `public/assets/riftfall/cards/heat/heat_card_hollow_voice.png` | scar/corruption inspiration only |
| `public/assets/riftfall/cards/heat/heat_card_rift_scar.png` | scar/corruption inspiration only |
| `public/assets/riftfall/cards/route-notes/card_back_route_note.png` | route-note reference only |
| `public/assets/riftfall/cards/route-notes/route_note_command_burst.png` | route-note reference only |
| `public/assets/riftfall/cards/route-notes/route_note_last_second.png` | route-note reference only |
| `public/assets/riftfall/cards/route-notes/route_note_rift_focus.png` | route-note reference only |
| `public/assets/riftfall/cards/contracts/mission_lattice_witness.png` | deferred contract candidate |
| `public/assets/riftfall/cards/contracts/mission_hold_the_ridge.png` | deferred contract candidate |
| `public/assets/riftfall/cards/contracts/mission_span_of_the_last_seal.png` | deferred contract candidate |
| `public/assets/riftfall/cards/gear/relic_choir_route_orb.png` | deferred artifact candidate; artifact cap is full |
| `public/assets/riftfall/cards/contracts/card_back_contract.png` | card back reference only |
| `public/assets/riftfall/cards/threat-red/card_back_threat_red.png` | card back reference only |
| `public/assets/riftfall/cards/threat-blue/card_back_threat_blue.png` | card back reference only |
| `public/assets/riftfall/cards/threat-yellow/card_back_threat_yellow.png` | card back reference only |
| `public/assets/riftfall/cards/artifacts/card_back_artifact.png` | card back reference only |
| `public/assets/riftfall/cards/wargear/card_back_wargear.png` | card back reference only |

## Guardrails

- Do not add new active art under `public/assets/riftfall/cards/`.
- Do not create an active Heat category or `/assets/cards/heat/`.
- Promote legacy art only by creating real content and copying art to `public/assets/cards/<category>/`.
- Archive promoted legacy sources only after the active copy is verified.
- Runtime catalogs, browser/client code, and active asset manifests must not emit `/assets/riftfall/cards/`.

## Runtime Boundary Confirmation

The runtime guard test verifies:

- browser/client runtime source does not reference `/assets/riftfall/cards/`
- runtime card art catalog output paths do not reference `/assets/riftfall/cards/`
- active card art paths resolve under `/assets/cards/`
- no active path emits `/assets/cards/heat/`
- deferred/reference legacy files are not active card art entries

## Current Asset Audit

Current `audit:assets` result:

- total: 404
- present: 404
- missing: 0
- invalid: 0
- placeholders: 0
- contract art: 30/30

Heat remains deprecated/reference-only. No gameplay mechanics changed in this boundary pass.
