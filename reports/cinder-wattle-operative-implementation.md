# Cinder Wattle Operative Implementation

## Canonical operative

- Stable ID: `cinder-wattle`
- Display name: Cinder Wattle
- Short name used in authored ability copy: CW
- Role: Adaptive Scavenger
- Base skills: Command 3, Grit 3, Signal 3, Guile 3, Forge 3 (total 15)
- Starting sector: `hollow-veil-yard`
- Starting Equipment: `bridge-spike`
- Starting Contract: `map-broken-paths`

Bridge Spike was selected from the existing normal starting-Equipment pool. It is a standard, starting-eligible utility item, is not an Artifact, cannot produce a Salvage loop, and does not alter CW's canonical base-stat total. Rivet Spurs were not created.

## Lore

Cinder Wattle was hatched inside a failed manufactorum brood-vat intended to produce disposable tunnel scouts. It survived by consuming wire, bone, and machine fragments, eventually armouring itself in scavenged metal. No faction admits creating it, but several factions want it recovered.

## Scrap-Crowned Instinct

The owner may prepare +1 for the currently staged eligible skill test before dice are revealed. The server derives the tested skill and source from authoritative encounter, board-test, or scenario state; the client submits only the stable ability ID. The modifier is stored in the existing append-only pending-roll event lifecycle, applies once, stops after the matching resolved test, and the use guard resets only at `ROUND_COMPLETED`.

Movement and enemy dice never read the modifier. A late or duplicate request is rejected. Version 2 snapshots preserve the prepared event through reconnect without replaying it.

Cooperative assistance uses the character definition's intrinsic skill value through `getIntrinsicBaseStat`. CW therefore contributes exactly 3. Equipment, Artifacts, Followers, temporary effects, and Scrap-Crowned Instinct are excluded from helper contribution.

## Presentation

The phone shows ability availability, the authoritative skill/source, prepared state, and the used-this-round reason. The action is owner-only and remains a secondary pre-roll choice. Battle and assisted-test screens reuse the same component.

The TV uses the public ability-trigger telemetry and normal modifier breakdown. Scrap-Crowned Instinct appears once as a +1 modifier and never as another die. Its restrained crown sheen is disabled under reduced motion.

Original portrait: `public/assets/riftfall/characters/cinder-wattle.png`. The image was generated for Ashen Reach with a monstrous black avian silhouette, riveted iron feathers, serrated beak, ember eye, mechanical talons, broken rust crown, and industrial hatchery background. No external franchise assets or iconography were used.

## Browser QA

Captures are under `reports/ui/cinder-wattle/`:

- phone character selection
- player card
- ability available
- ability activated/prepared
- ability unavailable after use
- enemy battle calculation
- Hazard calculation
- cooperative assistance contribution of 3
- TV operative/battle card
- TV reduced-motion activation

The first visual pass exposed an oversized ability panel and compressed used-state copy. The corrective pass moved the panel into the assistance header, constrained the button, and kept disabled reasoning in the readable body copy. Final 390x844 captures have no horizontal overflow and the browser run reported no console errors.

## Boundaries

- Save version remains 2.
- No Heat field, effect, loss condition, or gameplay path was added.
- No Artifact was added to the starting loadout.
- Starting Salvage, Wounds, Scars, Trophy advancement, inventory capacity, and reconnect behavior continue to use canonical defaults.
- No unrelated content or gameplay definition was changed.

## Verification

- `npm.cmd run validate:content`: passed (18 character definitions; 17 playable plus the gated QA operative).
- `npm.cmd run typecheck`: passed.
- Focused CW, cooperative-assistance, phone, TV, catalog, schema, item-tier, and Heat-boundary tests: passed.
- `npm.cmd run test:engine`: passed, 66 files / 738 tests.
- `npm.cmd run test:rules`: passed, 10 files / 49 tests.
- `npm.cmd run test:integration`: passed, 34 files / 299 tests.
- `npm.cmd run test:client`: passed, 38 files / 348 tests.
- `npm.cmd run test`: reached the six-minute wrapper timeout; every constituent suite above was run independently and passed as required.
- `npm.cmd run audit:assets`: passed, 421/421 present with zero invalid, placeholder, or release-blocking assets.
- `npm.cmd run build`: passed.
- Browser QA: passed at 390x844 phone and 1920x1080 TV, including reduced motion, with zero overflow or console errors.
- `git diff --check` and `git diff --cached --check`: passed.
