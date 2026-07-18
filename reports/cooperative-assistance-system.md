# Cooperative Assistance System

## Authoritative rule

In an active standard multiplayer co-op session, the active operative may request help from one or two eligible teammates after the tested skill and source are known and before any operative or enemy dice are exposed. Each requested helper independently accepts or declines. The active operative may lock any accepted subset, up to two helpers, and then rolls normally.

The calculation is:

`active operative effective stat + active operative 2d6 + active modifiers + accepted helper base stats = operative final total`

Only the active operative rolls. Helpers never roll dice. Enemy resolution remains exactly one authoritative enemy roll where the encounter uses one.

## Base-stat boundary

Helper contribution is derived by `getIntrinsicBaseStat`: the stored character stat minus `character.statUpgrades[stat]`. This returns the intrinsic value from the operative definition. Equipment, Artifacts, Followers, temporary effects, scenario modifiers, reaction bonuses, dice, rerolls, and Trophy advancement are excluded. Values are snapshotted when the active operative locks assistance, so an accepted helper disconnecting afterward cannot erase or refresh the contribution.

The active operative continues through the existing modifier resolver. Their normal stats, valid equipped modifiers, scenario modifier, reactions, and current encounter modifiers retain their existing authority.

## Eligible and excluded rolls

Eligible skills are Command, Grit, Signal, Guile, and Forge. The shared window is used by enemy battles, Threat Hazards, persistent tile challenges including Anomalies, named board-space skill tests, Broken Concordance preparation tests, and Broken Concordance confrontation stages.

The system is not offered for movement, enemy dice, draws, stock generation, reward or Artifact randomization, payments, Salvage possession checks, Trophy spending, Contract progress without a roll, passive effects, automatic consequences, single-player, Rivalry/ruthless interaction, Nemesis Relay, or ended sessions.

## Server lifecycle

1. The server identifies the active seat, source stable ID, skill, and eligible helper seats.
2. `COOPERATIVE_ASSISTANCE_REQUESTED` stores a server-owned request ID and one or two stable seat IDs.
3. Each requested seat submits only Accept or Decline. Wrong-seat, unrequested, unavailable, duplicate, and stale responses reject.
4. The active seat may cancel before locking or lock one/two accepted helpers. A pending second response does not block proceeding with one accepted helper.
5. Lock snapshots each intrinsic base value. Clients never submit values, totals, or rolls.
6. The ordinary authoritative resolver rolls once, adds locked values once, resolves the existing encounter, and appends `COOPERATIVE_ASSISTED_ROLL_RESOLVED`.
7. The request closes. A completed request cannot reopen or replay.

Events are append-only equivalents for requested, accepted, declined, locked, cancelled, test staged, and assisted roll resolved. Stable request/source identity protects against stale responses and replay.

## Disconnect, reconnect, and cancellation

- Pending requests, responses, tested skill, and locked values serialize inside save version 2.
- A helper disconnected before answering is no longer eligible; reconnect restores eligibility to answer the still-current request.
- A helper disconnected after accepting retains the locked contribution for that roll.
- The active operative can cancel an unlocked request and select again.
- Assistance does not expire on a gameplay timer. It ends by cancellation, authoritative resolution, or session reset.
- Reconnect cannot reroll either side or duplicate a locked contribution.

## Projection and privacy

The active phone receives eligible stable seats, names, and intrinsic contributions. A requested phone receives only its own contribution and Accept/Decline controls. Unrequested phones receive a public-safe waiting state. TV receives public request/response status and locked contribution values, never controls, inventories, missions, reactions, or helper selection options.

## Phone and TV flow

Phone: source and tested skill → helper selector → response status → one Roll action → helper-by-helper result breakdown. Mandatory scenario tests omit Roll Solo. Optional encounters retain Roll Solo.

TV: the existing encounter chamber remains authoritative. A compact banner introduces requested helpers, locks accepted base values, then the normal single active roll resolves. The calculation keeps `Active stat`, `Roll`, and `Help` distinct; no helper dice are animated.

## Repetition

The only new frequency limit is two helpers per roll. No hidden once-per-turn or once-per-round cooldown was added. Every later roll requires a fresh request and fresh consent.
