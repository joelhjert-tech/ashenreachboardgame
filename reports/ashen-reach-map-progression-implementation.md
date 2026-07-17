# Ashen Reach Map Progression Implementation

## Outcome

The canonical graph remains the sole movement authority. All 49 sectors are connected, all 13 physical cross-ring links are reciprocal, final Core access is restricted to two exact Inner origins, and no retired Heat mechanic exists in board authoring.

## Corrections

- Added `boardTransitions.ts`, a source-derived presentation and audit view of canonical cross-ring edges.
- Added deterministic JSON and Markdown manifests generated from the canonical nodes and board spaces.
- Corrected Customs Gate / Guardian Span text to its implemented Command 9 and Signal 9 choices.
- Replaced vague lock copy with `Requires Guardian Span Clearance` and `Breach the Gate of Cinders first`.
- Projected inward/outward transition identity, exact movement 1, and end-of-movement behavior from the server to the owner phone.
- Added persistent public TV route lines for all 13 canonical cross-ring links; gated links use the danger treatment.
- Added topology guards for counts, reciprocal edges, exact transition inventory, final origins, clearance acquisition, and the retired-Heat boundary.

## Authoritative lifecycle

Outer and Middle movement uses an exact server-generated distance. Same-ring movement follows clockwise or counterclockwise tracks. A cross-ring link is offered only when the final movement value is exactly 1; confirming it consumes movement by completing the movement action. Inner movement is fixed at 1. Forced displacement uses same-ring neighbours and cannot cross tiers.

On arrival, recurring tile challenges open before Threat exploration. Named text becomes available after mandatory blockers clear. Guardian and Gate notes are owner-private, persistent across reconnect, not consumed by movement, and cannot be borrowed by another operative. The TV shows public route geometry and gate state, never private notes.

## Final approach

- Customs Gate: Command 9 or Signal 9; success grants `guardian-span-clearance`.
- Melted Gate: only the Customs Gate origin accepts that clearance; arrival has its own Signal 10 or Guile 10 challenge.
- Crownless Observatory: approach notes are descriptive/preparation only.
- Last Signal Well: Grit, Signal, or Guile 12; success grants `gate-of-cinders-breached`.
- Core origins: `inner_gate_of_cinders` and `inner_blackstar_shortcut` only.
- Center: `center_cinder_gate`; the active scenario owns confrontation progress and victory.

## Four critique seats

- **New player:** must-fix clarity gap corrected; phone now names the tier crossing and clearance.
- **Optimizer:** no hidden edge, gate bypass, cross-ring forced movement, duplicate note award, or alternate Core origin was found.
- **Family/casual:** seven/ four entrances reduce backtracking; exact movement 1 is the main friction and is now stated explicitly.
- **Rules lawyer:** every link, direction, owner note, failure result, movement cost, reconnect rule, and center origin is now captured in generated evidence.

## QA and limitations

Automated component coverage verifies the phone and TV surfaces and the canonical graph. Eight browser screenshots are stored under `reports/ui/map-progression/`: phone and TV at Guardian locked/cleared and Core locked/cleared.

The first screenshot pass showed all 13 transition lines crossing the map simultaneously and obscuring the center. The corrective pass keeps a compact Route marker on every transition endpoint but draws a line only when that crossing is current, selected, or legal. The locked phone captures also showed an apparently active Select control; the final pass disables it visibly, removes the redundant “ignore” instruction, and keeps the exact lock reason beside the route. The final 390×844 and 1366×768 captures have no horizontal overflow, clipped lock text, stale gate state, or private-note exposure.

The scenario preparation state is intentionally not a movement key: it remains separate from confrontation progress and is applied by the scenario confrontation resolver after legal Core arrival.

No prices, rewards, Threat counts, scenario thresholds, save schema, legacy compatibility, or Heat behavior changed. The +116 Threat expansion remains unapproved.

## Verification

- `npm.cmd run audit:topology` — passed; 26 directed/13 physical transitions generated.
- `npm.cmd run validate:content` — passed; 17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, and 30 afflictions.
- `npm.cmd run typecheck` — passed.
- `npm.cmd run test:topology` — 141 tests passed.
- `npm.cmd run test:engine`, `test:rules`, `test:integration`, `test:client`, and aggregate `test` — passed.
- `npm.cmd run audit:assets` — passed.
- `npm.cmd run build` — passed.
- `npm.cmd run qa:map-progression` — eight screenshots captured and reviewed; no console errors or horizontal overflow.
- `git diff --check` and `git diff --cached --check` — passed.
