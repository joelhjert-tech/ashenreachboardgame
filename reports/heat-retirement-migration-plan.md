# Heat retirement migration plan

## Strategy

Use six gated phases (0 through 5). Do not combine player-copy cleanup, mechanical redesign, and persisted-field deletion in one commit.

## Phase 0 — Lock intended semantics

**Decide:** each active/no-op Heat consequence; Black Route Fuse cost; Heat-cost shop service; direct reduction; old-save policy; Mirror threshold naming; public mode/attribute vocabulary.

**Likely files:** design reports and approval sheets only.

**Risks:** runtime low; balance high if decisions are rushed.

**Tests:** none changed; identify required golden cases.

**Rollback:** revert documents.

**Entry:** inventory accepted. **Exit:** every C/F inventory row has an owner and approved outcome; explicit statement that Heat is not automatically Scar/Wound.

## Phase 1 — Hide player-facing Heat

**Work:** replace migration jargon in logs; prevent raw IDs/fields in UI, a11y, errors, and fallbacks; clarify “Risk” only where its actual rule is approved; update current docs and generated descriptions without touching historical evidence.

**Likely files:** phone/TV copy formatters, shared result chips, current docs, content display text, generated-text source templates.

**Risks:** runtime low; UI medium; balance none if no mechanics change.

**Tests:** public/phone projection leakage, accessible-name scans, generated-content scan, snapshot review.

**Rollback:** copy-only revert.

**Entry:** canonical terms approved. **Exit:** normal play cannot display Heat as a resource; stable compatibility IDs remain hidden.

## Phase 2 — Quarantine compatibility Heat

**Work:** central legacy adapter; forbid new Heat-authored mechanics; narrow allowlists for `character.heat`, `heatThreshold`, stable keys/ID; separate historical/generated exceptions; document deprecation.

**Likely files:** schemas around adapters (additive only), validation scripts, content loaders, projection builders, compatibility tests.

**Risks:** runtime medium; save medium; UI low.

**Tests:** old state parses, reconnect preserves it, public projection omits it, new content using Heat fails, exact legacy IDs still load.

**Rollback:** disable guard/adapter while retaining fields.

**Entry:** Phase 1 green. **Exit:** no new Heat dependencies can enter; all remaining references sit behind enumerated boundaries.

## Phase 3 — Redesign active Heat mechanics

**Work:** migrate each content family and direct server flow individually. Candidate outcomes are removal, specific Scar, Wound, Loss Pressure, Global Escalation, Salvage, exact-instance charge, cooldown, or scenario-local parameter.

**Likely files:** affected content, approved engine actions, server validation, phone/TV prompts, focused tests.

**Risks:** runtime high; balance high; UI medium; privacy medium for Scar identities.

**Tests:** per-card frequency/severity, atomic costs, invalid intent, reconnect, co-op/rivalry projection, scenario win/loss, shop affordability.

**Rollback:** one mechanic family per commit with content compatibility alias.

**Entry:** item/card approval blocks complete. **Exit:** no active game outcome depends on numeric Heat or Heat-shaped costs.

## Phase 4 — Migrate persistence and projections

**Work:** introduce versioned saved-state migration; split Mirror threshold; read legacy Heat fields but stop writing them; version WebSocket/public/private payloads; update fixtures/local storage/session restoration.

**Likely files:** session schema, session loader, room persistence, shared payload types, projection builders, reconnect tests.

**Risks:** runtime critical; save critical; privacy high.

**Tests:** legacy saved room at multiple nonzero Heat values, reconnect mid-reaction, stale intent, mixed-version payload rejection, no private Scar leakage, browser local storage.

**Rollback:** dual-read/dual-write period and schema-version feature flag.

**Entry:** no mechanic writes Heat. **Exit:** production can load legacy saves and emit Heat-free current payloads.

## Phase 5 — Remove dead Heat code

**Work:** delete old effect variants, threshold action, compatibility payload fields, no-op adapters, obsolete fixtures and current docs; preserve historical audit records.

**Likely files:** card/session/character schemas, actions/reducer, server, shared types, tests, content, validation allowlists.

**Risks:** runtime medium after gates; save high if Phase 4 incomplete.

**Tests:** full suite, legacy migration suite, content validation, assets/build, repository terminology scan.

**Rollback:** restore adapter release; do not require history rewrite.

**Entry:** compatibility telemetry shows supported migration window complete. **Exit:** no runtime Heat fields/effects; only stable legacy ID aliases and historical documents remain where deliberately retained.

## Safeguards

1. Context-aware content validation rejecting new mechanical Heat terminology.
2. Import-boundary guard restricting legacy adapters to persistence/content loading.
3. Public TV and owning-phone projection tests proving no Heat and no private Scar leakage.
4. Explicit save schema version and migration fixtures.
5. Reconnect tests with legacy nonzero Heat and pending reactions.
6. Generated-content and snapshot scans.
7. Asset fallback test that displays canonical names rather than raw filenames.
8. Exhaustive schema-key inventory in CI.
9. One content/mechanic family per commit.
10. Dual-read compatibility before field deletion.

## Four-seat critique

**New Player.** Current “Risk” costs lack a visible resource explanation, while legacy logs mention pressure that does nothing. Phase 1 must remove these contradictions before teaching Scars and Wounds.

**Optimizer.** Inert Heat drawbacks make some items/cards stronger than authored; nonzero legacy saves may satisfy costs without a gain source. Never compensate or convert values without exploit analysis.

**Family Player.** Wounds, Scars, Loss Pressure, and Global Escalation are enough distinct consequence systems. Retired Heat should not survive as another visible meter; digital enforcement should absorb compatibility bookkeeping.

**Rules Lawyer.** Define whether a migrated event can inflict both a Wound and a Scar, how prevention orders apply, what happens to nonzero legacy Heat, and whether old effects count as “resolved” for mission/scenario triggers. Compatibility must not silently change success/failure records.

## First safe implementation phase

After Phase 0 decisions, Phase 1 is safest: conceal player-facing Heat and migration jargon without changing schemas or mechanics. It must exclude “Risk” costs until their true currency is approved.
