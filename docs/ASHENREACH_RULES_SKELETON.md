# Ashenreach Rules Skeleton

This document is an original Ashenreach rules spine. It borrows broad tabletop
adventure-game structure only: tiered board progression, scenario-driven
victory, challenge decks, character growth, and escalating table pressure.

It does not replace the current implementation. Use it as the design target for
future rules, content, UI, and test work.

## 1. Design Goal

Ashenreach is a dangerous board adventure about operatives crossing ruined
sectors, taking contracts, gaining gear and artifacts, surviving Heat, and
forcing a scenario confrontation before the board collapses.

The game should produce clear table stories:

- a weak operative survives the outer ring by choosing safer routes
- a stronger operative returns to defeat a persistent enemy
- a contract changes wandering into a directed objective
- Heat makes delay feel costly
- the scenario changes what victory means each session

## 2. Core Character Profile

Current implemented stats:

- Command: leadership, intimidation, tactical control
- Grit: endurance, close violence, physical survival
- Signal: perception, tuning, strange communications
- Guile: deception, evasion, ambush work
- Forge: repair, salvage, machines, field craft

Future condensed challenge model, if we choose to simplify:

- Might: mainly Grit and Forge challenges
- Resolve: mainly Command and Signal challenges
- Guile: stealth, trickery, lies, and timing

Do not rename implemented stats until the UI, cards, content validation, and
tests are migrated together. For now, cards should continue using the five
implemented stat keys.

Other character values:

- Life/Wounds: how close the operative is to recall
- Heat: exposure, suspicion, signal pollution, and pressure
- Rank: long-term advancement tier, not yet fully implemented
- Trophies: defeated enemy value used for stat growth
- Trophy Pile: defeated enemy cards saved for display and spending
- Gear: usable equipment with slots and timing windows
- Artifacts: powerful discoveries with strong upside and possible pressure
- Scars: lasting penalties and story marks after recall or severe failure

## 3. Session Setup

1. Host creates a room.
2. Host chooses session mode:
   - Standard
   - Nemesis Relay
   - Single-player tuning
3. Host chooses a scenario sheet.
4. Players join by phone, enter a name, choose a character, and mark ready.
5. Host starts only when occupied seats are ready.
6. Characters begin on their scenario-defined starting sectors.
7. Scenario pressure, initial decks, and board markers are set.

Setup should be fast. The host screen explains public pressure. The phone
explains private character readiness.

## 4. Board Structure

Ashenreach uses a tiered board:

- Outer Ring: survivable routes, starter contracts, weak enemies, basic gear
- Middle Ring: faction pressure, stronger rewards, scar and Heat risk
- Inner Ring: brutal enemies, artifact gates, scenario pressure, boss lanes
- Core: final scenario confrontation space

Design rule:

Outer sectors teach. Middle sectors punish greed. Inner sectors test whether
the operative is ready. The Core decides the session.

## 5. Deck Structure

Use separate decks by gameplay role:

- Enemy Threats: combat enemies, warbands, roaming pressure
- Anomaly Threats: signal storms, void hazards, reality damage
- Salvage/Event Threats: traps, ambushes, collapsing routes, complications
- Gear: weapons, armor, tools, followers-as-equipment if needed
- Artifacts: rare major rewards and gate keys
- Contracts: directed objectives and progression fuel
- Heat/Scar/Escalation cards: consequence engines

Current implementation note:

Threat content is currently one validated threat pool with `enemy` and `hazard`
types, plus separate anomaly, artifact, scar, contract, and escalation content.
Future color/type splitting should be implemented as deck metadata, not by
duplicating cards.

## 6. Turn Order

Each turn should follow this visible rhythm:

1. Start of Turn
   - refresh timing windows
   - resolve start-of-turn Heat, scars, followers, or scenario effects
2. Movement
   - move to a connected sector
   - roll movement/check if the route demands it
3. Encounter
   - reveal sector card or resolve sector text
   - show reveal on TV and phone
4. Action Window
   - use gear, assist, accept/complete contract, stabilize, or fight
5. Resolution
   - show dice, modifiers, total, target, success/failure, and outcome
   - apply final effects only after the result is displayable
6. End of Turn
   - advance turn order
   - update round pressure if needed

Nemesis Relay adds a Nemesis Phase after the active player's turn.

## 7. Movement

Movement is board-topology first:

- no teleporting unless a card explicitly says so
- legal destinations are connected sectors
- route difficulty comes from sector danger, scenario state, and Heat

Failed movement should usually still move the operative, but at a cost:

- gain Heat
- take a wound
- reveal an extra threat
- lose a timing window
- trigger scenario pressure

Movement should rarely waste a turn entirely. It should change the risk state.

## 8. Encounters

When an operative enters a sector:

1. Check scenario or sector forced effects.
2. If the sector has unresolved threats, reveal the next relevant threat.
3. If no threat blocks the action, allow sector text, contracts, artifacts, or
   stabilization.

Every encounter needs:

- reveal moment
- stat or battle requirement
- dice result
- success/failure explanation
- outcome summary

The event log is secondary. The primary display is the active resolution panel.

## 9. Battle Rules

Battle should be simple and readable:

1. Reveal enemy.
2. Show battle setup.
3. Show player battle value.
4. Show enemy battle value.
5. Open gear/card timing window.
6. Roll dice.
7. Add modifiers.
8. Compare totals.
9. Show win/loss result.
10. Apply effects after the result is visible.

Enemy cards should use one memorable rule:

- armored
- heat on defeat
- damages gear
- spawns pressure
- disables a slot
- returns to the space
- copies or punishes a stat

Avoid multi-paragraph enemy rules. The board story should be strong, but the
combat operation should stay fast.

## 10. Skill Tests

Non-combat checks use the same visibility standard as battle:

1. reveal hazard or test
2. show stat and difficulty
3. show roll and modifiers
4. show success/failure
5. apply effects

Test examples:

- Command: hold a line, negotiate authority, break a rout
- Grit: survive a crossing, resist injury, force a barricade
- Signal: read a relay, resist anomaly noise, tune a gate
- Guile: evade a patrol, exploit a blind angle, lie under pressure
- Forge: repair machinery, dismantle traps, salvage under fire

## 11. Gear and Inventory

Gear should be useful without becoming a private minigame.

Slots:

- weapon
- armor
- utility

Timing windows:

- before battle roll
- after battle roll
- before taking damage
- start of turn
- movement
- any time

Phone UI should surface usable gear only when it matters:

- "You have 2 cards that can help."
- show only cards usable in the current timing window
- host sees only that the player is choosing, not the full inventory

## 12. Contracts

Contracts are the game's directed-progression layer.

Good contracts should:

- point the player toward a type of action or sector
- give a reason to take risk
- grant a useful reward
- sometimes unlock inner access or scenario leverage

Contract objective types:

- defeat enemies
- resolve sector text
- collect artifacts
- stabilize pressure
- reach named sectors
- clear persistent threats

Each player should hold one active contract by default. Future upgrades may
allow extra active contracts through character abilities or artifacts.

## 13. Artifacts

Artifacts are major rewards, not routine equipment.

They should do at least one of the following:

- unlock inner routes
- swing a battle or check
- reduce Heat in a dramatic way
- progress the scenario
- create a tempting drawback
- mark a character as ready for the Core

Artifacts should feel dangerous enough that gaining one changes how the table
talks about that operative.

## 14. Heat and Escalation

Heat is personal pressure. Escalation is table pressure.

Heat can come from:

- failed movement
- loud battle outcomes
- enemy reveal effects
- artifact use
- contracts with faction pressure

Escalation can come from:

- full rounds passing
- scenario events
- certain enemy failures
- Nemesis movement
- too many wounds or recalls

Heat should make a character's next decisions harder. Escalation should make
the whole board more dangerous.

## 15. Leveling and Trophies

Defeated enemy cards enter the Trophy Pile.

Trophy rules:

- each defeated enemy adds trophy value
- trophy value can raise stats
- default stat raise cost stays 4 unless balance changes
- automatic trophy spending is acceptable for now
- manual trophy selection can come later

The phone should show:

- defeated enemy cards
- available trophy value
- stats that can be raised
- what will be spent

This makes progression feel like a pile of victories, not just a number.

## 16. Scenario Victory

Every scenario sheet should define:

- setup
- special board pressure
- objective
- confrontation steps
- victory condition
- failure condition
- solo/co-op tuning if needed

Scenario examples:

- seal breaches before the Core opens
- hunt a moving boss
- stabilize three sectors before attempting the final test
- gather artifacts to unlock the inner route
- survive a countdown while Heat rises

The scenario should be the reason the same board feels different each session.

## 17. Vanquished and Recalled Operatives

When an operative reaches the wound threshold:

1. The operative is recalled.
2. They gain or resolve a scar.
3. Their trophy pile and trophy value reset unless a scenario says otherwise.
4. Gear/artifact retention follows the current replacement rule.
5. The player chooses a replacement if available.

Loss condition options:

- all operatives recalled at the same time
- too many total recalls
- escalation reaches collapse
- scenario-specific defeat
- Nemesis reaches and holds the Core

Standard mode can stay forgiving. Co-op and solo need clearer loss pressure.

## 18. Nemesis Relay Add-On

Nemesis Relay is the co-op pressure mode.

Core loop:

- each player has one bound Nemesis Champion
- after a player turn, that Nemesis activates
- Nemeses move by board adjacency toward the Core
- Heat increases movement pressure
- players win by defeating all Nemeses or securing the Core
- players lose if a Nemesis holds the Core through its countdown

This mode should turn the board into a chase map. Farming becomes dangerous
because the enemies are moving while players improve.

## 19. Implementation Priorities

Recommended next build order:

1. Keep five implemented stats, but add UI copy that groups them into combat,
   resolve, and trickery roles.
2. Split threat presentation into Enemy, Anomaly, and Salvage/Event lanes
   without duplicating content.
3. Add contract objective variety beyond defeat counts.
4. Make artifacts more central to inner-ring access.
5. Add clearer rank/progression rules.
6. Add explicit defeat/loss conditions for standard, solo, and co-op.
7. Add scenario-specific setup cards or quick-reference panels.

## 20. Design Guardrails

- Use original Ashenreach names only.
- Do not copy protected card text, faction names, symbols, or layouts.
- Prefer one-rule enemies over rules bloat.
- Preserve visible staged resolution for every roll.
- Make the phone private and tactical.
- Make the TV cinematic and public.
- Let the board create stories through risk, route choice, and pressure.
