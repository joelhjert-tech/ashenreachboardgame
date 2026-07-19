# Ashen Reach Scar System Audit

Baseline recorded on branch `ui/tv-movement-focus-mode` at `cd3bcdd`, before Scar-system edits. The worktree already contained the uncommitted Admin Card Simulation Lab; those files are preserved in place and are not separated or overwritten.

## Current inventory

Ashen Reach currently loads 15 canonical Scar cards from `content/cards/scars/`. Every card has the legacy fields `trigger`, `penalty`, `effect`, `relief`, and optional `upside`. The stored operative model keeps only stable Scar IDs in `character.scars`.

| Stable ID | Name | Current executable effect | Current engine status |
|---|---|---|---|
| scar-wound-1 | Ash-Lanced | gain note | Supported reaction catalog entry |
| scar-wound-2 | Static Burn | gain note | Supported reaction catalog entry |
| scar-wound-3 | Broken Harness | gain note | Supported reaction catalog entry |
| scar-wound-4 | Bell-Deafened | gain note | Supported reaction catalog entry |
| scar-wound-5 | Glasslung | gain note | Supported reaction catalog entry |
| scar-wound-6 | Oath-Chain Drag | advance escalation 1 | Blocked: failure/abandon distinction absent |
| scar-wound-7 | Void-Salt Craving | take 1 Wound | Blocked: authored pre-reroll timing absent |
| scar-wound-8 | Webglass Afterimage | gain note | Supported reaction catalog entry |
| scar-wound-9 | Red March Tremor | take 1 Wound | Supported reaction catalog entry |
| scar-wound-10 | Marrow Debt | gain note | Blocked: does not alter trophy transaction |
| scar-wound-11 | Cinder Nerve | gain note | Blocked: pre-hazard consequence window absent |
| scar-wound-12 | Relay Ghost | gain note | Blocked: delayed follow-up state absent |
| scar-wound-13 | Blackstar Shadow | gain note | Blocked: suppression-strength model absent |
| scar-wound-14 | Gate Mark | take 1 Wound | Blocked: pay-or-Wound choice absent |
| scar-wound-15 | Choir Static | gain note | Blocked: owner/multi-target choice absent |

The typed trigger catalog contains 15 entries: seven are marked supported and eight remain mechanically incomplete or semantically mismatched. The current card effects are mostly notes or immediate generic effects rather than permanent Burden/Adaptation rules.

## Current acquisition sources

There are 17 canonical authored Scar-gain sources. Every source currently uses legacy `gain_scar` with an exact `scarId`.

### Threats (13)

- ash-choir-crusader
- choir-wraith
- grave-lattice-reclaimer
- hushed-chapel
- rift-whispers
- saint-of-ashes-echo
- sanctifier-beads
- specimen-null-arrives
- starless-taxation
- static-larva-swarm
- veil-censor
- veil-rift-judicator
- velvet-knife-confessor

### Tile challenge (1)

- rift-whispers-ashen-chapel

### Board text (3)

- middle_scarSurgery
- middle_relicCache
- inner_choirShrine

`threat_fail_gain_scar` also resolves an exact legacy Scar for Static Larva Swarm; it is an implementation key for an already-counted source, not an eighteenth gameplay source.

## Current lifecycle

1. A Threat, tile challenge, board action, ambient rule, or threshold action produces `gain_scar` or directly appends a Scar ID.
2. `reduceGameState` appends that ID to `character.scars` without a deck, uniqueness pool, candidate choice, source taxonomy, or selection identity.
3. Existing Scar source events may create `pendingScarConsequence` entries for supported reaction definitions.
4. Scar-Sink Prayer can suppress one pending effect from one owned Scar instance; the Scar remains.
5. Wound threshold recall currently appends an authored Scar and sets the operative to recalled.
6. Normal replacement recruitment carries existing accumulated Scars forward.
7. There is no canonical Scar-removal service, deck return rule, third-Scar deferred policy, or globally unique ownership rule.

## Recall and replacement

- Wounds are checked through the existing threshold action and recall lifecycle.
- Recall is not session defeat.
- The current replacement reducer inherits accumulated Scars and adds any replacement-character starting Scars.
- Scenario ambient code contains one direct Scar append and must be routed through the new compatibility adapter.
- Current test fixtures include three-Scar operatives but no general authoritative three-Scar retirement policy.

## Scar-Sink Prayer and surgery

- Scar-Sink Prayer is the stable legacy-ID item `heat-sink-prayer`, presented as Scar-Sink Prayer.
- It is a charged, equipped Artifact reaction for `pendingScarConsequence` and suppresses exactly one pending Scar effect.
- It does not remove a Scar and its charges do not refresh automatically.
- `middle_scar_surgery` is the canonical Sable Machine Choir location and already participates in shop/artifact content and the `middle_scarSurgery` board-text Contract trigger.
- No authoritative `Purge a Scar` service currently exists.

## Projection and UI baseline

- Owner phone projection includes stable Scar IDs and summarized card text in Player Card/Inventory.
- Owner-only `pendingScarConsequence` controls are projected only to the owning phone.
- TV exposes a public Scar-trigger status but no acquisition choice.
- There is no `Choose Your Scar` phone prompt, two-card TV reveal, third-Scar warning, deck mutation display, or removal prompt.
- Admin Library loads Scar cards through the general card editor; it has no structured source/Burden/Adaptation editor.
- The uncommitted Simulation Lab currently rejects text-only Scars and reserves a future `choose-scar` prompt contract.

## Assets

- Fifteen existing Scar PNGs resolve under the canonical active path `public/assets/cards/scars/`.
- Existing artwork must remain unchanged.
- Nine new canonical Scar artworks and corresponding runtime/prompt catalog entries are required.
- The asset audit currently has a separate pre-existing Node/tsx CSS-loader failure through `HostImage.css`; this is not caused by Scar content.

## Compatibility boundary

- Save version remains 2.
- Legacy v0–v2 state stores `character.scars` as stable strings and omits all new optional deck/choice/usage fields.
- Existing `gain_scar` must remain parseable as an inert-to-current adapter, but new current content must use `gain_scar_choice` and may not author exact Scar IDs.
- Legacy Heat is not converted into Scar state.
- Threat total remains 109 and topology remains unchanged.

## Existing test surface

- `scarTriggers.test.ts` covers the current reaction catalog, queue, replay, projection, and Scar-Sink Prayer.
- Engine recall tests cover Wound threshold, recalled action rejection, and replacement inheritance.
- Heat-retirement suites assert that many ordinary Threats do not gain Scars and that active Heat symbols remain confined.
- Session schema tests exercise legacy direct `gain_scar` parsing.
- Phone inventory and action tests cover Scar summaries and pending consequence actions.
- Nemesis, scenario, ambient, reconnect, and projection tests contain legacy Scar arrays that must continue parsing.

## Confirmed gaps to implement

- 24-card canonical content with exact 6 Flesh / 6 Mind / 6 Machine / 4 Rift / 2 Unbound distribution.
- Server-owned deterministic Scar decks and exactly-two choice lifecycle.
- Source-based acquisition and global owned uniqueness.
- Idempotent selection, continuation, return-to-bottom, reconnect, and pool exhaustion handling.
- Typed persistent Burden and Adaptation rules for every card.
- Deferred third-Scar scenario policy after the complete effect stack.
- Purification service and full cleanup.
- Owner-private phone selection, public-safe TV reveal, Admin editing, and Simulation Lab support.
