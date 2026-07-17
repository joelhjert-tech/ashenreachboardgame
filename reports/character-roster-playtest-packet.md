# Ashen Reach 16-character roster playtest packet

Roster baseline: committed character-system state through `4b697c3` (`docs: confirm character roster RC ready`). This packet is for playtest preparation and recording only; it does not redefine character rules. Printed character text and the game interface remain authoritative during play.

## 1. Playtest purpose

This playtest validates whether the release-candidate roster works at the table, not merely in tests. Observe whether:

- a player can identify a character's role, strength, and weakness before choosing;
- the first turn teaches the intended route and threat priorities;
- ability timing, eligibility, costs, and once-per-turn or once-per-round limits are understood;
- visible outcomes match server-backed rules closely enough to earn player trust;
- no character consistently dominates survival, contracts, Salvage, pressure control, or confrontation progress;
- every character remains viable in solo, co-op, and rivalry where intended;
- character choice changes route, threat, Gear, support, and risk decisions in a distinct way.

Do not judge balance from a single high or low roll. Record repeated advantages, choices with no meaningful downside, abilities that rarely become eligible, and cases where a player must ask whether an effect happened.

## 2. Roster overview

Ratings use 1 (low) through 5 (high). `C/G/S/U/F` means Command/Grit/Signal/Guile/Forge. Complexity and power risk carry forward the final RC verification matrix.

| Character | Stat line | Role | Complexity | Power risk | Best mode | Main thing to watch |
| --- | --- | --- | ---: | ---: | --- | --- |
| Joss Var | C3/G1/S3/U5/F3 | Leverage broker | 3 | 3 | Rivalry | Does Contract acceleration outpace normal play? |
| Bjornis | C2/G5/S1/U3/F4 | Red-threat bruiser | 3 | 3 | Co-op | Are red wins and pressure relief strong but Blue weakness real? |
| Deepdale | C1/G3/S4/U2/F5 | Route delver | 2 | 2 | Flexible | Do players understand that the four abilities are descriptive only? |
| Ker Von Ker | C1/G5/S1/U3/F5 | Slow fortress | 2 | 3 | Co-op | Does prevention justify lower-of-two movement without stalling play? |
| Kira Dog | C3/G5/S1/U4/F2 | Vanguard striker | 2 | 3 | Flexible | Does the first eligible battle get the bonus after unrelated tests? |
| Popelord | C3/G5/S1/U2/F4 | Hazard scavenger | 3 | 3 | Flexible | Do yellow/hazard bonuses create a healthy route pull or easy value? |
| Rumi | C1/G3/S5/U4/F2 | Riftblade skirmisher | 3 | 4 | Flexible | Is the Signal/Guile burst consistently tempting without covering weaknesses? |
| Mira | C2/G4/S3/U3/F3 | Pressure oathkeeper | 4 | 4 | Co-op | Is the Wound-to-Vow-to-confrontation loop clear, visible, and fair? |
| Orenna Tash | C5/G1/S4/U2/F3 | Convoy leader | 3 | 3 | Co-op | Does team routing matter enough, especially outside co-op? |
| Dessa Korr | C1/G3/S2/U4/F5 | Grave engineer | 3 | 4 | Solo | Does Equipment generation snowball or crowd out shop choices? |
| Reskin Hale | C4/G2/S1/U5/F3 | Oathbroken trickster | 3 | 4 | Rivalry | Do Contract and Salvage gains accelerate too quickly? |
| Senna Pell | C1/G2/S5/U5/F2 | Rift cartographer | 3 | 3 | Co-op | Does route information change choices without smoothing all risk? |
| Brask Ode | C2/G3/S1/U4/F5 | Salvage warden | 3 | 4 | Solo | Does Salvage/discount value compound too reliably? |
| Dr. Yuna Castell | C3/G3/S2/U2/F5 | Siege medic | 3 | 4 | Co-op | Does healing preserve tension and remain useful in solo? |
| Lane | C1/G2/S5/U4/F3 | Signal witch | 3 | 3 | Flexible | Does the first eligible Blue Anomaly receive the reduction visibly? |
| Tarek Voss | C5/G3/S2/U2/F3 | Void marshal | 3 | 3 | Co-op | Does Command/pressure support create real choices rather than passive safety? |

## 3. Tester briefing

### Before choosing

Choose from the role and weakness, not just the highest stat. If you want a direct first game, try Kira, Ker, or Deepdale. If you want timing or resource decisions, try Mira, Rumi, Joss, or a roster character rated complexity 3+. In a comparison session, avoid building a whole team around one lane unless lane specialization is the question being tested.

### During play

- Say what route or threat your character makes you prefer and what you would have chosen without that character.
- Before an ability resolves, state when you believe it triggers, whether it costs anything, and whether it has already been used in its current window.
- Record the displayed result if it differs from your expectation. Do not silently correct the game state.
- Treat text marked `Descriptive only` as identity and guidance, not a mechanical bonus.
- Note whether your low stats, movement limits, resource costs, or mode dependence actually changed a decision.

### Reporting problems

A **rules clarity concern** is uncertainty about trigger, target, cost, eligibility, reset timing, descriptive-only status, or why an ability did or did not apply. Quote the ability, name the phase and action, and record what the phone/server showed.

A **balance concern** is repeatable excess or insufficiency: the character gains more progress/resources/safety than peers for comparable risk; a weakness never matters; an ability is almost never useful; or one route is obviously correct regardless of board state. Include at least two concrete moments when possible.

## 4. Character-specific watchlist

### Joss Var — Black Ledger Agent

- **Expected play pattern:** avoid direct fights, use Guile and cleared sectors to accelerate Contracts and build private leverage fiction.
- **Expected weakness:** Grit 1 makes forced combat costly.
- **Rule to verify:** `Debt Knife` advances an active Contract by one valid step after an enemy defeat, at most once per round.
- **Balance question:** does combining first-Contract progress, kill progress, and completion pressure relief shorten objectives too much?

### Bjornis — Firebreak Conqueror

- **Expected play pattern:** seek red threats and Cinder Fields, then convert red victories into pressure relief.
- **Expected weakness:** Signal 1 and the explicit -1 on Blue Anomaly tests should redirect routes or require team cover.
- **Rule to verify:** `Firebreak Vow` applies only to red threats or fights in Cinder Fields; `Foam and Fury` follows a red-threat defeat.
- **Balance question:** is the red-lane package worth choosing over Ker's durability without making pressure control automatic?

### Deepdale — Deep Route Delver

- **Expected play pattern:** favor Forge/Signal routes and read the board as a route-and-craft specialist.
- **Expected weakness:** Command 1 and Guile 2 create leadership and deception exposure.
- **Rule to verify:** all four listed abilities are descriptive only; they grant no preview, repair, Signal bonus, or shop discount.
- **Balance question:** does the strong stat line and starting loadout still create a distinct delver without live character exceptions?

### Ker Von Ker — Iron Bulwark

- **Expected play pattern:** accept hard fights and hazards, prevent the first qualifying Wound, and plan around slow travel.
- **Expected weakness:** movement uses two dice and the lower result; Command and Signal are both 1.
- **Rule to verify:** `Hold the Line` prevents only the first battle or hazard Wound each round and the movement penalty is consistently applied.
- **Balance question:** is the durability satisfying enough to justify lost tempo, yet not enough to trivialize high-difficulty enemies?

### Kira Dog — Houndblade Hero

- **Expected play pattern:** initiate a meaningful battle early in the turn and hunt difficult non-blue threats.
- **Expected weakness:** Signal 1, Forge 2, and no mechanical ally-damage transfer.
- **Rule to verify:** an unrelated earlier test does not consume `Houndblade Charge`; only the first battle Kira starts receives +1 Grit.
- **Balance question:** is +1 on the opening battle enough to define a vanguard without making every turn's first fight routine?

### Popelord — Mire Sovereign

- **Expected play pattern:** choose yellow, salvage, hazard, and mire sectors and fight efficiently on that ground.
- **Expected weakness:** Signal 1 and Guile 2 make Blue Anomalies and subtle routes dangerous.
- **Rule to verify:** an unrelated roll does not consume `Compost Cape`; the first eligible yellow hazard each round is reduced by exactly 1.
- **Balance question:** do `Mire Pitchfork` and `Compost Cape` stack into excessive safety, especially on resource-rich routes?

### Rumi — Violet Riftblade

- **Expected play pattern:** choose the most important Signal or Guile test for a once-per-round burst and avoid Command/Forge duties.
- **Expected weakness:** Command 1, Forge 2, and descriptive-only evasion/route insight.
- **Rule to verify:** earlier Grit or Forge activity does not consume `Violet Edge`; the first chosen eligible Signal/Guile test gets +1 and repeat use in the round is blocked.
- **Balance question:** does the flexible eligibility make Rumi the default answer to too many threats, or does choosing the moment create tension?

### Mira — Cinder Monk

- **Expected play pattern:** convert Wounds and pressure events into Vow Notes, then spend a Vow at the Cinder Gate for confrontation power.
- **Expected weakness:** Vow generation costs tempo or harm, and Vows cannot fund shop, Salvage, or Contract rewards.
- **Rule to verify:** Vow gain is private and phone-visible; Cinder Oath is available only at the Cinder Gate during Mira's action phase, spends exactly one Vow, adds +2 to each confrontation test, and cannot repeat in the round.
- **Balance question:** is +2 to every confrontation test worth the setup without making the finale predetermined or the pre-finale game feel passive?

### Orenna Tash — Fleet Elder

- **Expected play pattern:** reveal/accept Contracts, stabilize pressure, and guide group route choices.
- **Expected weakness:** Grit 1 makes solo fights costly; some convoy text is descriptive/private briefing rather than a spendable buff.
- **Rule to verify:** `Convoy Law` reduces pressure at most once per round and only when revealing or accepting a Contract while pressure is above 0.
- **Balance question:** does Orenna remain satisfying in solo and rivalry when fewer allies benefit from her identity?

### Dessa Korr — Grave Engineer

- **Expected play pattern:** target salvage, yard, machine, and Forge tests to generate Equipment and maintain Gear.
- **Expected weakness:** Command 1 and the `Coffin Rigging` lockout after gaining Gear that turn.
- **Rule to verify:** Equipment draw happens at most once per round after a qualifying sector, and free equipping applies only if the draw is Armor.
- **Balance question:** does free Equipment create an early compounding lead or reduce the relevance of shops and Salvage spending?

### Reskin Hale — Oathbroken Prince

- **Expected play pattern:** match sectors to Contract tags, amplify Salvage, and exploit marks in rivalry.
- **Expected weakness:** Signal 1 and no `Broken Claim` bonus from Blue Anomaly sectors.
- **Rule to verify:** `Crown Debt` exists only in rivalry, marks at most once per round after another operative in the same sector gains Salvage, and pays only on the next help/hinder interaction.
- **Balance question:** do bonus Contract steps plus extra Salvage produce a runaway rivalry lead with too little counterplay?

### Senna Pell — Rift Cartographer

- **Expected play pattern:** choose movement/anomaly routes, gather private route insight, and seed route Contracts with early progress.
- **Expected weakness:** Command 1, Grit 2, and Forge 2 make direct confrontation and repairs costly.
- **Rule to verify:** `Surveyor's Cut` sets a newly accepted route Contract to at least 1 only once per round; descriptive route insights do not grant rerolls.
- **Balance question:** does information meaningfully improve team decisions without becoming an invisible universal safety net?

### Brask Ode — Salvage Warden

- **Expected play pattern:** clear yellow/salvage ground, choose between immediate Salvage and a revealed Equipment discount, and protect Gear with Salvage.
- **Expected weakness:** Signal 1 and no `Salvage Right` benefit on Blue Anomaly sectors.
- **Rule to verify:** `Salvage Right` is once per round and presents the correct either/or reward; `Last Haul` spends one Salvage instead of losing Gear.
- **Balance question:** can discounts, free Salvage, Forge +1, and Gear protection compound faster than threats consume resources?

### Dr. Yuna Castell — Siege Medic

- **Expected play pattern:** route through stabilization spaces, keep Wounds manageable, and pair healing with Gear repair.
- **Expected weakness:** Signal 2 and Guile 2; `Field Triage` cannot be used during battle.
- **Rule to verify:** `Amber Draught` heals once per round after a passed Grit test, while `Field Triage` requires a qualifying action and respects its battle restriction.
- **Balance question:** does recurring healing preserve meaningful Wound pressure, and is the kit still useful when playing alone?

### Lane — Signal Witch

- **Expected play pattern:** seek Blue Anomalies and Signal tests, using the first eligible difficulty reduction to open routes.
- **Expected weakness:** Command 1 and Grit 2 leave direct combat and leadership exposed.
- **Rule to verify:** unrelated activity does not consume `Hush Static`; the first eligible Blue Anomaly each round receives -1 difficulty, including the supported space-text path.
- **Balance question:** is Lane's value healthy across maps with different Blue/Anomaly density, or too scenario-dependent?

### Tarek Voss — Void Marshal

- **Expected play pattern:** clear sectors, complete Contracts/objective pushes, and stabilize pressure through command presence.
- **Expected weakness:** Signal 2 and Guile 2; command briefings are private records, not spendable bonuses.
- **Rule to verify:** `Marshal's Presence` reduces pressure at most once per round and only after a successful objective push.
- **Balance question:** does Tarek provide visible, decision-relevant leadership without becoming a low-interaction pressure shield?

## 5. Scenario recommendations

### Solo stress test

- **Recommended player count:** 1, with separate runs rather than hot-swapping characters.
- **Include:** Ker or Mira for costed endurance; Brask or Dessa for economy; Orenna or Yuna for support-role self-sufficiency; Rumi or Lane for specialist route dependence.
- **Systems tested:** weakness pressure, route viability, healing/prevention, resource snowball, Contract pacing, and whether support identities function alone.
- **Failure signals:** one safe route dominates; the weakness never affects a choice; support abilities rarely matter; Salvage/Gear becomes self-sustaining; or survival depends on repeatedly misunderstanding descriptive text as a bonus.

### Co-op support/threat test

- **Recommended player count:** 3–4.
- **Include:** one leader/support (Tarek or Orenna), one protector/healer (Bjornis, Ker, Kira, or Yuna), one specialist (Lane, Rumi, Senna, or Deepdale), and optionally one economy character (Brask or Dessa).
- **Systems tested:** shared-sector timing, public versus private information, pressure relief, route specialization, role handoffs, and whether each player has an independent decision.
- **Failure signals:** one character dictates all routes; support erases threat pressure; a player cannot tell whether an ally effect is live or descriptive; private resources must be announced publicly to function; or the team repeatedly waits for one engine character.

### Rivalry pressure test

- **Recommended player count:** 3–4.
- **Include:** Joss and Reskin, plus two contrasting route/threat specialists such as Popelord and Rumi, or Kira and Lane. Include Mira once to test whether confrontation burst remains fair under competitive pressure.
- **Systems tested:** Contract race, Salvage acceleration, same-sector marks, private state, route contention, pressure control, and counterplay.
- **Failure signals:** a hidden/private effect cannot be verified by its owner; one early Contract or Salvage trigger creates an unrecoverable lead; helping is always irrational; pressure relief benefits a leader without cost; or rivalry-only text leaks into other modes.

## 6. Data collection form

Copy one form per player per game. Add timestamps or turn numbers to confusing moments.

```text
Session/date:
Tester:
Character played:
Mode: solo / co-op / rivalry
Player count:
Scenario:

Turns survived:
Contracts completed:
Wounds taken (total, not just final):
Scars gained:
Salvage gained:
Salvage spent:

Ability uses:
- Ability / number of uses / turn(s):
- Ability / number of uses / turn(s):

Moments of confusion:
- Turn/phase, quoted rule, expected result, displayed result:

Strongest moment:
Weakest moment:
Did the printed weakness matter? How?

Character felt: too strong / too weak / about right
Why:
Would you choose this character again? yes / no / maybe
Why:

Which route or threat decision did this character change most?
Did any descriptive-only text look like a live rule?
Did you trust that the server applied each live ability correctly? If not, why?
Anything else:
```

## 7. RC risk watch

These are monitoring items, not roster blockers:

- **Mira phone-to-server hardening:** the current path is server-authoritative and phone-visible, but a full Vow gain → private projection → spend → reconnect → zero-Vow rejection flow remains the most valuable integration hardening target.
- **Unrelated phone WIP:** existing dirty movement-resolution work in `PhoneActionPanel.tsx` and its test, plus untracked QA screenshots, is outside this packet and must remain isolated from roster conclusions and commits.
- **Legacy compatibility:** monitor the internal `heat-sink-prayer` starting-Gear ID and legacy `heat` save fields. Player-facing content should continue to show Scar-Sink Prayer/canonical current terminology; do not migrate compatibility IDs during playtest triage.
- **Descriptive-only comprehension:** Deepdale is the clearest test case, with all four abilities explicitly descriptive. Bjornis, Kira, Rumi, Popelord, Lane, Senna, Orenna, and Tarek also contain descriptive/private briefing language that testers may overread as spendable mechanics.
- **Higher complexity/power risk:** Mira is complexity 4/power risk 4. Rumi, Dessa, Reskin, Brask, and Yuna are power risk 4. Watch confrontation burst, broad eligible timing, Equipment/Salvage compounding, Contract acceleration, and recurring healing.
- **First-eligible timing:** Kira, Rumi, Lane, and Popelord now have targeted coverage. Still record any case where an unrelated roll appears to consume the intended first eligible opportunity or a reset boundary behaves unexpectedly.

## 8. Playtest verdict rubric

Classify each issue by the smallest response that would solve the observed problem.

| Verdict | Evidence threshold | Typical response |
| --- | --- | --- |
| Ready for broader playtest | Roles and weaknesses are understood, live effects match the interface, no repeatable outlier appears, and all modes tested have credible decisions. | Expand tester pool and scenario variety; keep monitoring. |
| Needs wording polish | Players make the intended choice once a sentence is explained; mechanics and outcomes are correct. | Clarify trigger, descriptive-only status, target, limit, reset, or displayed reason without changing power. |
| Needs light tuning | A repeatable numeric/frequency issue exists, but the role and core loop are healthy. | Adjust one bounded value, frequency, cost, or eligibility window with targeted tests. |
| Needs mechanical revision | The core ability creates no meaningful choice, erases the weakness, dominates routes, or cannot work consistently across intended modes. | Revisit the character's rule package and re-run focused plus cross-roster tests. |
| Needs server/client follow-up | The rule is understood but the visible state, authority path, disabled reason, reconnect state, or resolved outcome is missing or inconsistent. | Preserve server authority; fix projection/intent/integration coverage before interpreting the incident as balance. |

For roster-level advancement, require no unresolved server/client trust failure, no mechanical-revision finding reproduced across two sessions, and no power outlier supported only by a compensating rule that players routinely miss. Wording-polish and light-tuning findings may proceed to a broader playtest when clearly documented and bounded.
