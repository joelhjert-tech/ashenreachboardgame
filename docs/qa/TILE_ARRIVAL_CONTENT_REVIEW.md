# Tile Arrival Content Review

## Scope

This review covers the 49 canonical sectors and the server-authoritative arrival
pipeline. It distinguishes a sector's ordinary arrival content from the
separate recurring Tile Challenge card family.

## Findings

- All 49 canonical sectors resolve to authored board-space definitions.
- The board contains 24 outer, 16 middle, 8 inner, and 1 center sector.
- Every sector has non-empty public rule text, lore, and a registered
  `textBox.effectKey`.
- Board-text validation reports zero missing effects, zero unused effects, zero
  invalid checks, and zero mismatched choices.
- 41 sectors draw from one or more authored Threat lanes on arrival.
- The eight sectors without Threat icons still have authored board actions:
  Pilgrim Lock Gate, Three-Ash Entry, Marshal's Road, Observatory Trial, Dead
  Star Claim, Crypt Petition, Last Signal, and the final scenario sector.
- There is currently one authored recurring Tile Challenge: **Rift Whispers**
  at Ashen Chapel. It triggers on every arrival, reveals the existing
  `rift-whispers` art presentation, tests Signal against difficulty 8, grants a
  route note on success, and opens the canonical Scar choice on failure.

## Authoritative Order

On a confirmed arrival, the server advances through:

1. Authored recurring Tile Challenges for that sector.
2. Threat draws for each printed Threat icon.
3. Scenario confrontation when applicable.
4. The sector's optional board-text action or service.

The phone cannot select a card, invent a challenge, or bypass the ordering.
Reconnect restores the pending authoritative stage.

## Interpretation

The reported impression that challenges are not triggering is understandable,
but it is not caused by a broken general arrival hook. Most sectors have
Threat-lane encounters and board actions, not a recurring record from the
`tile-challenges` content family. Calling every one of those records a “Tile
Challenge” in the interface would be misleading.

The UI should therefore label the incoming content precisely:

- **Local challenge** for a recurring Tile Challenge.
- **Threat contact** for a Threat-lane draw.
- **Sector action** for board text.
- **Confrontation** for the center/scenario resolution.

No probabilities, rewards, card content, or arrival mechanics were changed by
this review.
