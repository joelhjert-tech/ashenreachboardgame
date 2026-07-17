# Proposed Ashen Reach Rule Improvements

Nothing in this document is a current rule. Each proposal requires explicit approval and implementation.

## Proposal matrix

| Proposal | Problem | Inspiration | Original Ashen Reach adaptation | Benefit | Cost / requirements | Risks | Recommendation |
|---|---|---|---|---|---|---|---|
| Universal tie policy | Tests and battles lack one cross-system rule | Clear stand-off/pass thresholds in official references | Define explicit tie outcomes per test class, then encode one shared comparison helper | Fewer disputes | Engine/server audit, UI copy, regression matrix | Balance shifts in existing encounters | **Adopt after audit** |
| Timing stack contract | Equal-priority reactions and replacements are underdefined | Relic special timing and staged battle | Typed windows: pre-roll -> reroll/replacement -> final result -> prevention -> consequence; fixed server order within a window | Safer item growth | Schema timing IDs, reducer queue, phone prompt order, extensive tests | Combo regressions; hidden-info leaks | **Prototype** |
| One-reroll-per-result | Future reroll chains could loop | Talisman 5E's concise reroll limit | Mark result revision as rerolled; reject further rerolls unless a rule explicitly replaces that limit | Predictable balance | Small state/action/test addition | Existing exceptional abilities may need migration | **Adopt** |
| Heat retirement pass | Legacy Heat contradicts Scars | Corruption/life separation as comparative caution | Remove or quarantine visible Heat, migrate approved consequences to Wounds/Scars/Global Escalation | Terminology clarity | Content/schema/UI migration and saves | Broad compatibility risk | **Adopt in a dedicated phase** |
| Explicit impossible-effect policy | Partial resolution differs by handler | Golden-rule precision in both physical games | Every typed effect declares `allOrNothing`, `clamp`, or `skipUnavailableSubeffect` | Predictability | Schema migration, validator, reducer tests | Content workload | **Prototype** |
| Encounter-order UI strip | Players cannot easily predict post-arrival order | Relic's fixed engagement sequence | TV/phone show current and next public role: Challenge -> Threat -> Action | Less confusion | Projection/UI only if data already public | Could leak sealed cards | **Prototype with privacy audit** |
| Scenario rule hierarchy metadata | Exceptions are scattered | Scenario sheets overriding general rules | Explicit priority metadata only for actual conflicts, validated against supported hooks | Rules-lawyer clarity | Schema/server/test work | False confidence if coverage incomplete | **Defer until hook audit** |
| Carry-limit decision | No limit is verified, but inventory can grow | Object/asset limits in source games | Prefer slot-limited activity with a generous carried ledger; add a limit only if performance/balance proves need | Avoids cleanup chores | Design/balance/UI if adopted | Punitive mobile inventory management | **Reject for now** |
| Co-op assist tokens | Co-op has little general assistance language | Community cooperative assistance ideas | Server-offered once-per-round assist tied to specific public tests, owner phone confirms cost | More table cooperation | New resource/state/UI/security tests | Quarterbacking and balance | **Prototype later** |
| Anti-stall scenario cadence | Farming may prolong sessions | Community clocks; Relic scenario pressure | Scenario-authored escalation beats rather than universal turn cap | Maintains atmosphere and variety | Scenario content/rules/testing | Can punish slower/family players | **Adopt per scenario, not globally** |
| Rivalry end summary | Private agenda winner/ties may be unclear | Asymmetric role scoring | Ended-session public-safe score summary generated from authorized agenda completion fields | Clear closure | Projection/UI and tie design | Privacy leakage | **Prototype after tie policy** |
| Reconnect reaction matrix | Not every reaction has live reconnect evidence | Digital manuals' resume expectations | Deterministic QA fixtures for each pending reaction ID/effect ID lifecycle | Trustworthy digital rules | QA-only fixtures and browser automation | Fixture drift | **Adopt** |
| Authored selectable consequence IDs | Future composite consequences need safe prevention | Source timing granularity, adapted to digital authority | Content authors explicitly group independently suppressible effects with stable IDs; composites remain atomic | Safe prevention design | Schema/content validation/server/UI/tests | Migration complexity | **Adopt before more prevention items** |
| Public rule-explanation payload | Block reasons vary by surface | Digital adaptation clarity | Structured public/private-safe reason codes with localized player copy | Better accessibility/localization | Schema/projection/UI work | Accidentally exposing hidden cause | **Prototype with privacy review** |
| Quick-start tutorial scenario | Setup and phase terminology remain heavy | Intro scenarios in official rulebooks | A short Ashen Reach scenario that teaches movement, challenge, Threat, shop, mission, confrontation in order | Family/new-player onboarding | Scenario content, fixtures, UI hints | Tutorial diverges from full rules | **Prototype** |

## Detailed requirements for adopted candidates

### Timing stack contract

- **UI:** one dominant reaction, visible owner/waiting state, no private choice on TV.
- **Server:** unique window/reaction/result revisions; deterministic ordering; stale rejection.
- **Schema:** supported timing enum and mutual-exclusion/stacking metadata.
- **Tests:** every pair of reroll, replacement, prevention, and forced-movement reactions.
- **Security:** owner-private targets and choices never enter public projection.

### Heat retirement

- Inventory every schema field, content string, shop cost, result delta, test fixture, save migration, and UI label.
- Do not mechanically convert a Heat amount to a Scar or Wound without item-by-item approval.
- Preserve compatibility parsing separately from player-facing canonical state.

### Reconnect matrix

- Cover movement preview/accepted route, tile challenge pre-roll, reroll, Static Intercession, shop transaction, mission completion, battle stages, and ended session.
- Prove reconnect itself spends nothing and completed actions do not replay.

## Four-seat proposal filter

- **New Player:** prioritize tutorial, pressure labels, and encounter-order preview.
- **Optimizer:** prioritize timing stack, reroll cap, impossible effects, and anti-farming regression tests.
- **Family Player:** reject punitive inventory limits and universal hard clocks; keep software bookkeeping automatic.
- **Rules Lawyer:** prioritize tie policy, stable effect IDs, hierarchy metadata, and reconnect determinism.
