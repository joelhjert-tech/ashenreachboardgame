# Phase 1K decision specification

Status: **all recommendations pending user approval**.

## Decision

The exact authored-default population is the 17 character IDs listed in `heat-authored-defaults-inventory.md`. They must stop being a general authoring capability, but none may be deleted as a content-only change under the current required schema.

Preferred next phase: **Batch B, validation-only quarantine**. Split the current legacy manifest into effect approvals and authored-default approvals. Permit `heat: 0` only for the 17 existing character IDs. Reject new IDs, nonzero character defaults, schema-like Heat defaults elsewhere, and any attempt to treat a default as a gameplay resource. Keep the 71-ID compatibility union behavior unchanged from a content-validation perspective.

## Exact next target and containment

- Target: HD-01 through HD-17 as retained legacy authoring exceptions.
- Preserve: all 17 JSON values, required `Character.heat`, old nonzero values, session serialization, reconnect, generic Heat discriminators, Rust Choir Peddlers, 29 Heat-only IDs/32 branches, Mirror `heatThreshold`, projection compatibility keys.
- Safe to stop authoring immediately: new IDs and nonzero authored character Heat defaults.
- Safe to omit immediately: none.
- Runtime/session/schema/content/UI impact: none in the next phase.
- Validation impact: separate field-level manifest and precise zero-only rule.

## Required validation and tests

1. Manifest contains exactly the 17 IDs and maps each to `character.heat = 0`.
2. Current content passes unchanged.
3. A new character with Heat fails approval.
4. An approved character changed to Heat 1 fails.
5. Heat effect approvals do not implicitly authorize defaults, and default approvals do not authorize effects/text/costs.
6. The total compatibility union remains 71 until later content work deliberately changes it.
7. Existing active-read/write scans remain zero.

Diff containment: validation module, its focused tests, and the Phase 1K implementation report only. No runtime, schema, content, fixture, generated, save, UI, or documentation changes.

## Later approved shape (not part of the next phase)

After quarantine, introduce a named character-content compatibility adapter that injects zero after parsing authoring data and before building runtime `Character`. Then remove the 17 JSON members in the same reversible commit. Runtime and persisted fields remain required in that batch, so no save migration is needed. Making the field optional, omitting it from new states, moving old values to an extension, and deleting it are later independent gates.

Dual-read precedence when eventually approved: an explicit stored `character.heat` value wins; absence invokes compatibility handling; no parser may overwrite nonzero history. Missing and zero are distinct until a versioned specification says otherwise.

## Four-seat critique

- **New Player:** no visible change and no Heat/Risk route; future content becomes less likely to reintroduce a hidden resource.
- **Optimizer:** neither old nonzero nor missing values gain mechanics; no cost or threshold may consult them.
- **Family Player:** no UI, prompt, bookkeeping, or reconnect disruption in the next phase.
- **Rules Lawyer:** authoring approval is field- and value-specific; it does not approve effects. Persisted-field retirement begins only after optional parsing and versioning define precedence.

## Entry and exit criteria

Entry: Phase 1J counts confirmed; all 17 paths exist; current allowlist is 71; active reads/writes are zero. Exit: exact quarantine tests pass, full suite passes, only approved validation/report files change, and no content default is removed.

Rollback is a single validation-only revert. The next implementation must not be combined with Batch C or any save/schema change.
