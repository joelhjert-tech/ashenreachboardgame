# Oathchain Lens Approval and Implementation Gate

Audit date: 2026-07-12

- Artifact content ID: `artifact-oathchain-lens`
- Owned gear ID: `oathchain-lens`
- Player-facing name: **Oathchain Lens**
- Recommended option reviewed: **Price Before Promise**
- Gate result: **BLOCKED — do not implement mechanics**

## Approval status

The source approval block remains unresolved:

| Required field | Source status | Gate result |
|---|---|---|
| Selected option | `[UNAPPROVED]` | Missing |
| Maximum charges | `[UNAPPROVED]` | Missing |
| Starting charges | `[UNAPPROVED]` | Missing |
| Charge cost | `[UNAPPROVED]` | Missing |
| Additional cost | `[NONE / SALVAGE / WOUND / UNAPPROVED]` | Missing |
| Recharge | `none` | Approved |
| Scope | Recommended owner-only, not approved | Missing |
| Activation timing | Recommended before acceptance, not approved | Missing |
| Exact information revealed | “Immediate costs and failure consequences” is not mapped to authoritative fields | Missing |
| Reveal duration | Not specified | Missing |
| Solo behavior | Recommendation only | Missing |
| Co-op behavior | Owner-only default suggested, not approved | Missing |
| Rivalry privacy behavior | Prohibitions stated, but no approved reveal payload exists | Incomplete |
| Exact final player-facing text | `[UNAPPROVED]` | Missing |

Because the required fields are not approved, no provisional values may be taken from the recommendation table.

## Current mission data does not support Price Before Promise

The canonical `ContractCard` schema currently contains:

- `id`
- `name`
- `factionGiver`
- `text`
- one typed `objective`
- one typed `reward`

It does **not** contain:

- an immediate acceptance cost;
- a failure consequence;
- a hidden payment requirement;
- a contract offer revision/version;
- an expiry boundary;
- owner-private target fields;
- a separate promise-risk payload.

The available objective types expose their authored requirements directly: defeat count, sector-text resolution, ordered route targets, shop transaction requirements, or tile-challenge matching. There is no generic oath/bargain test or failure lifecycle to preview.

## Projection finding

Current TV projection includes `state.availableContracts`, and phone projection includes the same catalog plus the owner's starting options and active Contract card. Consequently:

- objective structure and rewards are not currently modeled as hidden Price Before Promise information;
- revealing the current objective would duplicate information already projected;
- revealing the current reward would contradict the recommended option's statement that rewards are not revealed;
- rivalry agenda data is a separate owner-private projection and must never be used as Lens content;
- there is no server-authored hidden contract-cost subset that can be exposed without inventing new data.

Implementing the Lens now would therefore either reveal nothing, duplicate public data, or require inventing mission fields and privacy semantics during the Artifact slice.

## Mission lifecycle boundary

The existing lifecycle remains locked:

1. Objective handlers advance progress only.
2. `COMPLETE_CONTRACT` validates completion.
3. `COMPLETE_CONTRACT` grants the reward once.
4. It appends the Contract ID to `completedContracts`.
5. It clears the active Contract and makes the next mission flow available.

Oathchain Lens must never call, imitate, or modify any of these steps. No implementation changes were made.

## Decisions required before approval

The next approval must define an authoritative information source rather than a narrative category. Choose exactly one implementable model and approve its fields.

### Model A — reveal existing reward

Before accepting one owner-eligible offer, spend a charge to privately reveal that offer's typed `reward` summary. This requires first removing the reward from public/ordinary pre-acceptance projections, which is a broader mission-information change.

### Model B — add authored acceptance-risk data

Add a narrow typed `acceptanceRisk` field to selected Contracts and reveal that exact field. This requires content authoring, schema validation, migration/default rules, and a decision on whether the risk is informational or mechanically enforced.

### Model C — reject Price Before Promise

Choose a different Lens option that uses existing authoritative state, such as a narrowly classified contract-sourced test. This avoids hidden-offer schema work but changes the approved identity.

No model is selected by this audit.

## Approval block awaiting decision

Oathchain Lens:

- Selected option: **[UNAPPROVED]**
- Maximum charges: **[UNAPPROVED]**
- Starting charges: **[UNAPPROVED]**
- Cost per activation: **[UNAPPROVED]**
- Additional cost: **[UNAPPROVED]**
- Recharge: **none**
- Scope: **[UNAPPROVED]**
- Activation timing: **[UNAPPROVED]**
- Exact authoritative fields revealed: **[UNAPPROVED]**
- Reveal duration/lifecycle boundary: **[UNAPPROVED]**
- Solo behavior: **[UNAPPROVED]**
- Co-op sharing: **[UNAPPROVED]**
- Rivalry privacy behavior: **[UNAPPROVED]**
- Final rule text: **[UNAPPROVED]**

## Implementation prerequisite

Before a charged-item implementation begins, the approved design must also establish:

- whether offer details become private in the base mission projection;
- a stable offer/reveal revision source;
- the typed reveal payload selected by the server;
- whether identical information can be revealed twice;
- the exact reveal expiry boundary;
- owner-only reconnect behavior in solo, co-op, and rivalry;
- public TV wording that confirms use without exposing details.

Until these decisions exist, no pending reveal state, client intent, charge metadata migration, phone prompt, TV result, validation rule, or test fixture should be added.

## Gate conclusion

- Approval complete: **No**
- Existing authoritative hidden information available: **No**
- Rivalry-safe typed reveal payload available: **No**
- Mechanics changed: **No**
- Oathchain Lens implemented: **No**
