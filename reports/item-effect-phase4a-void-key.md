# Phase 4A: Void Key Charged Artifact

## Approved rule

Void Key uses Personal Gate Override with two starting/maximum charges, a cost of one charge, and no recharge:

> After selecting a movement route that would be legal except for one gate restriction, you may spend 1 charge before confirming the route. Ignore that gate restriction for this movement only. Movement distance and all other route, destination, scenario, threat, and blocker requirements still apply. The gate remains locked after you pass.

## State and migration

The catalog defines maximum, starting count, cost, no-recharge lifecycle, movement-confirmation timing, equipped requirement, and typed personal-gate effect. Acquisition creates a stable exact instance with `currentCharges: 2` and catalog-derived maximum 2. Runtime spending targets that instance. Legacy owned Void Keys fall back to their stored `charges` until the first mutation writes `currentCharges`; this preserves depleted legacy state and prevents reconnect refills. Duplicate instances retain independent counters. Removing an instance removes its charge state.

No turn, round, reconnect, mission, shop, battle, encounter, or scenario transition replenishes charges.

## Gate eligibility and atomic spend

The authoritative movement planner offers Void Key only for an exact-distance route whose destination is tagged as a gate and whose sole block is one authored movement requirement on that gate. Region-transition failures, Nemesis Relay Crown-Key requirements, invalid adjacency, insufficient distance, invalid destinations, scenario locks, threats, and unrelated blockers remain ineligible.

The movement request includes the exact Void Key instance. The server revalidates seat, ownership, equipped utility slot, positive charge count, destination, movement value, route, and sole supported gate restriction. The reducer commits the one-movement override and subtracts one charge in the same accepted action. Any stale or invalid request is rejected without movement or charge loss. The gate has no persistent unlocked state and cannot benefit another player.

## Phone and TV

Inventory projects current/maximum charges and retains inspection at zero, where activation is disabled with the existing no-charges reason. An eligible blocked destination shows a focused `Use Void Key — 1 charge` confirmation, the one-movement scope, and remaining count. The phone only renders server-projected eligibility.

The existing public movement preview remains available. A committed move may use the ordinary public outcome/log without exposing private inventory counts; no TV control or new focus mode was introduced.

## Coverage and deferrals

Schema, movement-planner, reducer/server, projection, phone, reconnect, duplicate-instance, depletion, stale-request, and regression tests cover the vertical slice. The remaining nine charged Artifacts—including Ashen Route Compass—remain unapproved and unchanged. Recharge services and charged normal Equipment remain deferred.
