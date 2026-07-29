# Ashenreach Card Category Lifecycle Specification

## Authority boundary

Every card-like record is data interpreted by the server. A client may request a legal action using a server-issued ID, but it never chooses a draw, die, target set, outcome, reward, penalty, or cleanup result. Accepted actions append an event and update the save-version-2 state. TV receives public state; phones receive the public state plus the owning seat's private projection.

## Shared lifecycle

1. A canonical source becomes eligible.
2. The server selects or validates the stable record ID.
3. The public reveal identifies the actor, place, card family, and required action.
4. The owner submits only a legal option ID when a choice exists.
5. The server resolves dice, modifiers, effects, and one-shot guards.
6. Public and private results are projected from the committed state.
7. The owning system consumes, persists, resets, or recurs the record.
8. Reconnect restores the stable state and does not repeat completed effects.

## Family rules

| Family | Trigger | Resolver | Persistence / cleanup | Visibility |
|---|---|---|---|---|
| Threat | Missing pressure / authored encounter source | Hazard check or opposed battle | Encounter clears; authored persistence remains | Public identity, totals, result |
| Anomaly | Sector Anomaly pool | Sector-card resolution | Consumed from sector pool | Public result; private choices stay private |
| Escalation | Sector Escalation pool | Sector-card / escalation reducer | Consumed; shared track persists | Public |
| Tile Challenge | Authored arrival condition | Challenge check and consequence | Recurring attachment remains | Public check; owner choices private |
| Equipment | Loadout, shop, reward | Exact-instance gear rules | Owned until sold/discarded; equip/suppression controls activity | Owner detail, public-safe use |
| Artifact | 26 sector pools or four dealer-only presentations | Artifact effect or dealer purchase | Sector copy consumes or dealer reveal clears; owned result persists | Public acquisition, owner inventory |
| Follower | Authored acquisition | Unique gain and typed follower use | Owned instance and exhaustion persist | Public-safe ownership |
| Contract | Offer and owner selection | Typed objective and completion reducers | Active → completed ledger → replacement | Objective/progress owner-private |
| Scar | Wound/recall and typed source | Scar choice, burden, adaptation | Persistent until authoritative removal | Public-safe state, private choice |
| Affliction | Typed `draw_affliction` or chained draw | Persisted server draw queue | Ongoing faceup; immediate facedown; per-operative draw cycle | Owner rule/choice, concise TV result |

Character and Scenario records are audited in the appendix because they are card-like presentation records but not gameplay card families. The former twelve-card Mission design catalog has been fully consolidated into Contracts; version-2 Mission-named state fields remain compatibility boundaries only.

## Affliction queue

`draw_affliction` creates a persisted queue only after its source result applies. The queue owns:

- owner seat;
- source card;
- remaining draw count;
- server-selected prepared card and die;
- Runaway Growth choice;
- current-chain exclusions;
- creation identity.

Selection uses a separate without-replacement cycle for each operative. The completed draw appends to that operative's persisted history. Oath to the Breach adds one queued draw. Condemned Echoes counts the replaced facedown cards and queues the same number of replacements. A prepared Runaway Growth draw cannot continue until the owner selects one legal stat.

The only new-card entry sources are:

- Smoke-Leech Clutch: 1 Affliction instead of 1 Wound.
- Void-Salt Sickness: 1 Affliction instead of 1 Wound.
- Mirror-Rot Interference: 1 Affliction instead of 1 Wound.
- Cinder Lattice Maw: 1 Wound plus 1 Affliction instead of 2 Wounds.

## Affliction reactions

Blood Fury and Future Sickness pause a failed roll before the check or battle result commits. The owner may reroll one server-identified die or decline. The server generates the replacement die, recalculates the final total and outcome, and commits the check/battle once. Blood Fury is once per battle; Future Sickness is once per turn. A matching replacement result adds the printed Wound or Affliction draw to the same authoritative consequence.

Bile Spit pauses a confirmed arrival outside the inner reach. Each eligible co-occupant is considered in deterministic seat order. The owner may apply 1 Wound to the arriving operative or decline. The destination remains authoritative throughout the reaction.

## Equipment and Artifact rules

The sixteen formerly deferred standard passive Equipment cards are permanent `+1` bonuses while their exact copy is equipped. They do not inspect narrative phrases for situational eligibility. Unequipped, sold, or suppressed copies add nothing.

Artifact eligibility booleans are retired from canonical content. The legacy-compatible parser still accepts them at a parsing boundary. Live acquisition comes from actual sector-deck membership or a validated relic-dealer offer. Artifact-granted gear carries `sourceArtifactCardId`; relic-dealer Artifact gear receives the same mapping.

## Replay, privacy, and cleanup invariants

- A completed result is applied once.
- A pending choice survives reconnect with the same stable ID.
- Wrong-seat, stale, arbitrary-card, arbitrary-stat, and arbitrary-die submissions are rejected.
- A client never receives another owner's private Contract objective or Affliction choice.
- A faceup condition and exact owned item persist through serialization.
- QA records cannot enter normal setup, stock, or reward pools.
- Rift Whispers is one recurring Tile Challenge; its Threat record is presentation support, not a second draw.
- Reserved schema variants without authored records remain intentionally reserved and are not counted as live cards.
