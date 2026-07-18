# The Broken Concordance

Stable ID: `scenario_broken_concordance`

Antagonist: The Hollow Regent

Eligibility: standard co-op multiplayer, 2–6 operatives

## Lore

Before the Reach fractured, the Concordance carried warnings and stored memory between every relay settlement. Now the Hollow Regent gathers those broken voices into one obedient chorus, stripping survivors of memory, identity, and independent will. The operatives must restore the severed nodes, hold fast to their separate names, and silence the Regent before the Reach becomes a single mind.

## Preparation

| Objective ID | Sector | Skill | Difficulty | Requirement |
|---|---|---|---:|---|
| `concordance-node-black-relay` | `black-relay-spire` | Signal | 12 | Active operative present; 1–2 accepted helpers |
| `concordance-node-webglass` | `middle_webglass_breach` | Command | 12 | Active operative present; 1–2 accepted helpers |
| `concordance-node-cinder-lattice` | `inner_cinder_lattice` | Guile | 16 | Active operative present; 1–2 accepted helpers |

Success marks the exact stable objective once and increments public `concordanceNodes` preparation. It neither changes topology nor advances confrontation progress. Failure leaves the node severed and advances existing Global Escalation by 1. Reconnect preserves stable objective identity and completed nodes cannot replay.

## Core gate

The confrontation is available only at canonical `center_cinder_gate`. It requires all three node objective IDs, the existing owner note `gate-of-cinders-breached`, and the normal center-entry lifecycle. Node work cannot start victory, side objectives cannot start victory, and scenario artwork never changes sector identity or topology.

## Final confrontation

| Stage | Skill | Difficulty | Rule |
|---|---|---:|---|
| Break the Chorus | Command | 12 | At least one accepted helper; success adds one confrontation stage |
| Sever the Relay | Signal | 12 | At least one accepted helper; success adds one confrontation stage |
| Hold Your Name | Grit | 15 | At least one accepted helper; final success invokes canonical scenario victory |

Each failure advances Global Escalation by 1 and leaves stage progress unchanged. Only the third successful Core stage records victory, once.

## Loss

The scenario uses existing cooperative loss systems and Global Escalation. It introduces no hidden collapse counter, no Heat mechanic, and no Heat-to-Scar path.

## Art and board language

Original runtime art is `public/assets/scenarios/broken-concordance.png`: a fractured black-iron relay cathedral, pale memory light, broken masks carried by signal echoes, restrained embers, and the Hollow Regent beneath a severed command halo. The three canonical board sectors receive public Severed/Stable scenario markers.
