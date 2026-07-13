# Phase 4D5 — Rift Anchor Spike implementation

## Implemented rule

**Refuse Displacement — Reaction:** When an effect would forcibly move or relocate you, but before that displacement resolves, spend 1 charge to remain in your current sector. The source event still counts as having occurred, and all non-displacement effects resolve normally.

Rift Anchor Spike is an owner-only, exact-instance charged Artifact with 2 maximum charges, 2 starting charges, a 1-charge activation cost, and no recharge. It must be equipped in the utility slot, matching the existing charged-Artifact activation architecture.

## Acquisition migration

The Artifact card now grants owned gear ID `rift-anchor-spike`. Acquisition creates the normal stable owned instance and initializes it at 2/2. The obsolete conversion into `veil-hook` and its conversion-only note were removed. The Artifact card is still consumed from its sector by the existing Artifact acquisition transaction; the owned Spike is not consumed on use.

Existing Veil Hooks are not inspected, removed, renamed, or converted. Independent Veil Hook acquisition paths are unchanged. No old save is backfilled from logs because provenance does not exist. An embedded legacy Spike without current-charge fields reads the catalog starting value once; after its first spend, persisted instance charge state controls reconnect and cannot refill.

## Authoritative reaction flow

The owner phone receives the pending reaction ID, source-event ID, public-safe source/origin/destination, and an authoritative eligible Spike instance. It sends only the exact instance ID plus the two server-issued identities. The server revalidates the authenticated seat, instance ownership, equipped slot, charge availability, source type/ID, pending status, reaction ID, source event, origin, unresolved status, and current destination legality.

Successful use atomically clears `pendingDisplacement`, records the source event resolved, spends exactly one charge, and publishes the prevention result. It does not move the operative, create arrival continuation, restart the origin sector, convert failure to success, or suppress unrelated effects. Duplicate, stale, depleted, wrong-seat, wrong-origin, unsupported-source, and newly illegal-destination requests spend nothing.

## Route Splice semantics

When Clockwise Misroute has a legal destination, Spike prevents that displacement and the operative remains at the origin. The Route Splice check remains failed. Its fallback Wound does not occur because that fallback belongs only to the no-legal-destination branch. When no legal clockwise destination exists, the foundation applies one Wound immediately, creates no pending displacement, and offers no Spike reaction. If legality changes while a reaction is open, Spike confirmation is rejected without charge and the unchanged foundation resolves its fallback when displacement is accepted.

Route Splice content, direction, distance, same-ring rule, legality, and fallback behavior were not modified.

## Projection and presentation

- Inventory uses the established charged-item presentation: Charges X/2, No Recharge, approved rule, and Depleted at zero.
- The owner phone shows `Refuse displacement — 1 charge` and `Accept displacement`, with source and public sector names.
- Other phones receive no actionable reaction or inventory details.
- TV continues using the existing public resolution surfaces. Successful use reports `Rift Anchor Spike deployed` and that the operative resisted forced displacement; no charge count is projected and no focus mode was added.

## Persistence and idempotency

The existing persisted `pendingDisplacement` reconstructs on reconnect. Owned-instance charges are embedded in character gear state. Successful suppression closes the pending state and records the source-event ID, so reconnect and duplicate intents cannot replay suppression, displacement, arrival, or charge spending. Duplicate Spike copies retain independent instance IDs and charge counts; only the submitted exact instance is spent.

## Validation and tests

The gear schema now admits only the bounded `pendingForcedDisplacement` timing and `suppressForcedDisplacement` typed charged effect. Rift Anchor Spike must declare 2/2 charges, cost 1, no recharge, and no activation cost. Content-focused tests protect self-acquisition, absence of Veil Hook conversion/note behavior, independent Veil Hook identity, Route Splice isolation, legal suppression, failed-test preservation, no arrival, no fallback Wound after suppression, stale-legality rejection, and foundation fallback.

Phone tests protect the owner-only typed intent and the no-Spike case. Existing engine, client, movement Artifact, mission, tile-challenge, asset, and build suites provide regression coverage.

## Four-seat review

- **New Player:** the prompt states the charge and immediate outcome; it does not imply success, movement immunity, or a hidden cost.
- **Optimizer:** exact-instance spending, source-event resolution, legality revalidation, and duplicate rejection prevent free suppression or double use. A second copy cannot affect a closed reaction.
- **Family Player:** the reaction has two choices and no extra meter beyond visible charges. Accepting displacement remains the normal path.
- **Rules Lawyer:** the timing is before resolution; the source failure persists; only displacement is suppressed; fallback applies only when no pending displacement was created; no arrival occurs at the unchanged origin.

## Explicit boundaries

No rollback, automatic recharge, permanent anchor, general movement immunity, Heat/Scar/pressure cost, Veil Hook migration, route/gate bypass, ordinary movement change, or Route Splice rule change was introduced.
