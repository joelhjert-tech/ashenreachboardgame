# Ashen Reach Character Roster Reference Review

Baseline reviewed: current `content/characters/*.json`, starting gear/contracts, character schema, rule spine, card economy spine, and named ability hooks in `src/server/roomServer.ts`.

This review uses the provided Relic-style reference roster as a design baseline, not as source material to copy.

## 1. Executive Summary

### Overall Roster Strengths

- The roster has a strong Ashen Reach voice: routes, salvage, convoy law, breach pressure, signal weirdness, and scar/ward language all feel native.
- The stat budget is clean for normal characters: 16 playable characters, each with a total stat budget of 15, max stat 5, minimum stat above 0.
- Starting gear and starting contracts give every operative an immediate table direction.
- Several archetypes are already promising: Void Marshal, Signal Witch, Rift Cartographer, Black Ledger Agent, Siege Medic, Fleet Elder, and Rumi.

### Overall Roster Weaknesses

- Many abilities are written as evocative prose, not clean board-game rules. New players will not know exactly what triggers, what costs, what happens, or how often.
- Several live ability hooks still reduce hidden/deprecated `heat`, which no longer matches the visible player model. These should become Scar, route-note, Salvage, pressure, or contract effects.
- There is too much overlap among Forge/Grit bruisers and salvage engineers.
- The roster has many "clear lane / record note / reduce pressure" hooks. That may make different characters feel similar unless each gets a distinct tactical exception.
- Current active schema has no first-class Load Limit, Signal Limit, or Tactic-card hand system, so those reference patterns cannot be cleanly expressed yet.

### Missing Archetypes

- True dice-control mystic: uses Signal/Tactic cards or route notes after rolling.
- Dedicated evasion assassin: can bypass weak enemies but not bosses/scenario blockers.
- Sacrifice officer: spends followers/strangers/resources for certainty.
- Real slow fortress: high durability with explicit movement weakness.
- Wound-fueled berserker: trades Wounds for temporary power.

### Repeated Archetypes

- Bjornis and Ker Von Ker currently share the exact same stat profile: `C2 G5 S1 U2 F5`.
- Deepdale, Brask, Dessa, and Popelord all lean toward salvage/Forge/recovery space.
- Tarek and Orenna both occupy commander/route-stabilizer territory, though Orenna has a clearer convoy identity.

### Biggest Balance Risks

- Free gear/salvage loops from Grave Engineer, Salvage Warden, Deepdale, and Popelord can snowball if not capped.
- Contract-progress engines from Black Ledger Agent, Oathbroken Prince, Fleet Elder, and Rift Cartographer can trivialize mission pacing if they fire too broadly.
- Rumi's companion/team-bond package can become a hidden stat engine if followers are too easy to acquire.
- Ability hooks that invisibly reduce hidden `heat` create player-trust problems because the visible harm track is now Wounds and Scars.

### Best-Designed Characters

- **Rift Cartographer**: clearest route/navigation identity and real weaknesses.
- **Black Ledger Agent**: strong rivalry/economy concept with a clear Grit weakness.
- **Signal Witch**: clean Signal/anomaly specialist.
- **Siege Medic**: good support role, just needs sharper solo and Scar wording.
- **Rumi**: strong cinematic identity, needs the follower combo bounded.

## 2. Character-by-Character Review

### Tarek Voss - Void Marshal

- **Intended role:** Commander, contract stabilizer, allied support.
- **Closest reference:** Vanguard Marshal + Saint-Commander.
- **Stats assessment:** `C5 G3 S2 U2 F3`. Role is readable. Weak Signal/Guile creates real pressure in anomalies and rogue salvage.
- **Ability assessment:** Good commander fantasy, but current text and hooks overuse "steady line" / pressure reduction. Needs one contract filter/leader rule rather than four stabilizer phrases.
- **Balance risk:** If every objective/clear-sector success reduces pressure, he becomes the safest solo pick.
- **Solo/co-op/rivalry notes:** Strong in co-op; solo needs contract selection; rivalry needs public support without becoming kingmaker.
- **Recommended edits:** Keep command identity. Convert hidden Heat reductions into route-note or contract-control effects. Add a clear ally-support trigger.
- **Revised sheet text:**
  - **Marshal's Order.** Once per round, after you clear a sector or complete a Contract, record 1 Command Note.
  - **Field Support.** When another operative in your sector rolls a battle or test, you may spend 1 Command Note to give them +1.
  - **Contract Authority.** When you choose a starting Contract or accept a new Contract, draw 2 options and keep 1.
  - **Weakness.** You cannot spend Command Notes on your own Signal tests.

### Lane - Signal Witch

- **Intended role:** Signal/anomaly specialist, route-note support.
- **Closest reference:** Black Signal Adept + Void-Seer Navigator.
- **Stats assessment:** `C1 G2 S5 U4 F3`. Excellent asymmetry. Low Command and Grit are meaningful.
- **Ability assessment:** Clearest weird-signal role. Current hooks are mostly route notes and anomaly softening; this is good, but should become explicit.
- **Balance risk:** If Signal handles too many tests, she becomes dominant. Needs Grit/Command vulnerability to remain real.
- **Solo/co-op/rivalry notes:** Works solo if blue/anomaly route is viable; co-op loves route notes; rivalry can manipulate lanes without direct theft.
- **Recommended edits:** Keep Hush Static and Route Burn. Add a true post-roll Signal/Tactic exception later when tactic cards exist.
- **Revised sheet text:**
  - **Witchglass Choir.** Once per round, after you pass a Signal test, record 1 Route Note.
  - **Hush Static.** The first blue Anomaly you face each round has -1 difficulty.
  - **Route Burn.** After you clear a blue or movement sector, leave 1 Route Note on that sector for any operative.
  - **Weakness.** You cannot use Route Notes on Grit battles.

### Dr. Yuna Castell - Siege Medic

- **Intended role:** Healer, wound/scar support, survival engine.
- **Closest reference:** Mercy Saint.
- **Stats assessment:** `C3 G3 S2 U2 F5`. Forge 5 supports medical/repair identity, but low Signal/Guile is not very visible yet.
- **Ability assessment:** Field Triage is strong. Scar Ledger should be made literal now that Scars are canonical.
- **Balance risk:** Healing every round can erase tension if not tied to sanctuary, clear sector, or once-per-round timing.
- **Solo/co-op/rivalry notes:** Excellent co-op; solo needs self-heal and contract progress; rivalry should not make opponents unkillable.
- **Recommended edits:** Keep healing. Add scar inspection/softening. Make all healing timing explicit.
- **Revised sheet text:**
  - **Field Triage.** Once per round, after you resolve a sanctuary, clinic, or stabilization action, heal 1 Wound from yourself or an operative in your sector.
  - **Scar Ledger.** When a Scar would block your Gear or action, reveal it and reduce its penalty by 1 for this roll only.
  - **Surgery Bond.** When you heal another operative, gain 1 Contract progress if your active Contract allows support progress.
  - **Weakness.** You may not use Field Triage during battle.

### Brask Ode - Salvage Warden

- **Intended role:** Salvage/Forge gear economy specialist.
- **Closest reference:** Forge Savant + Wreckborn Scavenger pattern.
- **Stats assessment:** `C2 G3 S1 U4 F5`. Clear Forge/Guile salvage identity; Signal 1 is a strong weakness.
- **Ability assessment:** Good salvage-site identity, but overlaps Deepdale/Dessa/Popelord. Needs ownership of shop/salvage conversion.
- **Balance risk:** Free gear on too many sectors can snowball. Must be tied to printed yellow/salvage sectors and once per round.
- **Solo/co-op/rivalry notes:** Solo economy is useful; co-op can feed table gear; rivalry can race salvage.
- **Recommended edits:** Make him the "claim and sell/scrap" character, not another repair engineer.
- **Revised sheet text:**
  - **Salvage Right.** Once per round, after you clear a yellow threat or salvage sector, gain 1 Salvage or draw 1 Equipment and buy it for 1 less Salvage.
  - **Scrap Bastion.** Add +1 Forge on tests in sectors with salvage, machine, or hazard tags.
  - **Last Haul.** When you would lose Gear, you may discard 1 Salvage instead.
  - **Weakness.** You cannot use Salvage Right on blue Anomaly sectors.

### Senna Pell - Rift Cartographer

- **Intended role:** Route mapper, movement planner, anomaly scout.
- **Closest reference:** Void-Seer Navigator + Deadeye Scout.
- **Stats assessment:** `C1 G2 S5 U5 F2`. Excellent asymmetry. Very weak Command/Grit creates real risk.
- **Ability assessment:** Best-defined strategic role. Needs route notes to be explicit and capped.
- **Balance risk:** Route-note generation can let her smooth every bad movement/test if unlimited.
- **Solo/co-op/rivalry notes:** Strong in every mode; in co-op she can become the team mobility engine.
- **Recommended edits:** Keep. Add hard once-per-round note generation and note-spending limits.
- **Revised sheet text:**
  - **Breach Atlas.** Once per round, after you enter or clear a movement/anomaly sector, record 1 Route Note.
  - **Ghost Mile.** When you fail a movement or route test, you may spend 1 Route Note to reroll it.
  - **Rift Script.** After you pass a Signal or Guile test, another operative may use one Route Note from your sector this round.
  - **Weakness.** You cannot spend Route Notes on battle rolls.

### Reskin Hale - Oathbroken Prince

- **Intended role:** Aristocratic broker, contract leverage, rivalry manipulator.
- **Closest reference:** Void Broker + Iron Provost, but less direct sacrifice.
- **Stats assessment:** `C4 G2 S1 U5 F3`. Strong role profile; Signal 1 is a real weakness.
- **Ability assessment:** Great fiction. Needs sharper economy: debt, contract progress, salvage, or follower leverage.
- **Balance risk:** "Twist any victory into objective progress" is too broad unless limited by lane/tag.
- **Solo/co-op/rivalry notes:** Naturally strongest in rivalry; needs co-op-safe bargain version.
- **Recommended edits:** Keep debt identity. Avoid direct theft except in rivalry mode.
- **Revised sheet text:**
  - **Broken Claim.** Once per round, after you clear a sector matching your Contract tag, gain 1 Contract progress.
  - **Ash Tithe.** When you gain Salvage from a sector, gain +1 Salvage.
  - **Crown Debt.** Rivalry only: after another operative in your sector gains Salvage, you may mark them. The next time you help or hinder them, gain 1 Salvage.
  - **Weakness.** You cannot gain bonus progress from blue Anomaly sectors.

### Dessa Korr - Grave Engineer

- **Intended role:** Gear engine, armor/repair specialist.
- **Closest reference:** Forge Savant.
- **Stats assessment:** `C1 G3 S2 U4 F5`. Clear Forge/Guile engineer with weak Command.
- **Ability assessment:** Strongest current gear-engine implementation; auto-rigging armor is clear but can be too free.
- **Balance risk:** Free equipped armor or repeated gear conversion can snowball quickly.
- **Solo/co-op/rivalry notes:** Strong solo survivability; co-op table utility; rivalry advantage if she monopolizes repair sites.
- **Recommended edits:** Keep gear identity. Strictly limit free equip/draw to once per round and salvage/yard sectors.
- **Revised sheet text:**
  - **Coffin Rigging.** Once per round, after you resolve a salvage, yard, or machine sector, draw 1 Equipment. You may equip it if it is Armor.
  - **Grave Spark.** Add +1 Forge on machine, lock, salvage, or dead-infrastructure tests.
  - **Mortuary Triage.** When you heal a Wound, you may also repair 1 exhausted Gear.
  - **Weakness.** You may not use Coffin Rigging if you already gained Gear this turn.

### Orenna Tash - Fleet Elder

- **Intended role:** Convoy commander, contract/route stabilizer.
- **Closest reference:** Vanguard Marshal + Mercy Saint support edge.
- **Stats assessment:** `C5 G1 S4 U2 F3`. Excellent: high leadership/signal, very poor combat.
- **Ability assessment:** Convoy identity is strong but too similar to Void Marshal unless she owns "group travel/contract lead" instead of generic command.
- **Balance risk:** Team-wide pressure reduction can become invisible and overly safe.
- **Solo/co-op/rivalry notes:** Co-op star; solo needs contract filter; rivalry should not force table cooperation.
- **Recommended edits:** Make her public route/contract support, not combat support.
- **Revised sheet text:**
  - **Convoy Law.** Once per round, when you reveal or accept a Contract, reduce scenario pressure by 1 if pressure is above 0.
  - **Chain Signal.** After you clear a movement or contract sector, leave 1 Convoy Note there. The next operative entering that sector gets +1 to their first test.
  - **Old Oaths.** When a player in your sector would fail a non-battle test by 1, you may discard a Convoy Note to make it pass.
  - **Weakness.** You cannot spend Convoy Notes on your own Grit battles.

### Mira - Cinder Monk

- **Intended role:** Pressure monk, escalation stabilizer.
- **Closest reference:** Saint-Commander + slow fortress support, but currently softer.
- **Stats assessment:** `C2 G4 S3 U3 F3`. Too rounded. Grit 4 is visible, but there is no true weakness.
- **Ability assessment:** The theme is good, but "stay steady" repeats across all four abilities. Needs one memorable rule-bend.
- **Balance risk:** If pressure mitigation is broad, she becomes a safety blanket without decisions.
- **Solo/co-op/rivalry notes:** Works in solo/co-op; rivalry identity is weak.
- **Recommended edits:** Lower one stat in future if possible or add a clear weakness. Make her interact with Scars/pressure at a cost.
- **Revised sheet text:**
  - **Ember Vigil.** Once per round, when scenario pressure would rise on your turn, you may take 1 Wound to reduce that increase by 1.
  - **Ash Psalm.** After you clear a dangerous sector, record 1 Vow Note.
  - **Cinder Oath.** Spend 1 Vow Note to add +2 to a scenario confrontation test.
  - **Weakness.** You cannot use Vow Notes on shop, salvage, or contract rewards.

### Rumi - Violet Riftblade

- **Intended role:** Signal duelist, evasive anomaly fighter, companion combo character.
- **Closest reference:** Black Signal Adept + Mirrorblade Assassin.
- **Stats assessment:** `C1 G3 S5 U4 F2`. Excellent. Low Command/Forge gives clear pressure.
- **Ability assessment:** Very strong fantasy. Current companion bond with Mira/Zoey is memorable but risks being a hidden stat package.
- **Balance risk:** If companion acquisition is easy, Rumi becomes too stat-efficient.
- **Solo/co-op/rivalry notes:** Strong solo duelist; co-op can support route/anomaly; rivalry gets stylish threat control.
- **Recommended edits:** Keep. Make companion bonuses visible and capped. Give her a clear once-per-round roll exception.
- **Revised sheet text:**
  - **Violet Edge.** Once per round, before a Signal or Guile battle/test, add +1.
  - **Glassmere Footwork.** You may evade one non-boss enemy in an anomaly or mirror sector each round.
  - **Rift-Flame Hand.** After you fail a Signal test, you may discard a route note to reroll it.
  - **Weakness.** You cannot use Violet Edge on Forge or Command tests.

### Popelord - Mire Sovereign

- **Intended role:** Mire bruiser, salvage brawler, comic-grotesque table presence.
- **Closest reference:** Trench Sergeant + brute scavenger.
- **Stats assessment:** `C3 G5 S1 U2 F4`. Clear brawler; Signal 1 is meaningful.
- **Ability assessment:** Distinctive personality, but currently overlaps Brask and Bjornis. Needs one unique "mire" rule.
- **Balance risk:** Extra salvage plus Grit 5/F4 can make him too safe in red/yellow lanes.
- **Solo/co-op/rivalry notes:** Strong solo and family-table memorable; rivalry could pressure nearby players through stench/warnings without theft.
- **Recommended edits:** Make him the muck/dump-site fighter who gains dirty salvage at a cost.
- **Revised sheet text:**
  - **Yard King.** Once per round, after you clear a salvage, hazard, or mire sector, gain 1 Salvage.
  - **Compost Cape.** The first yellow trap or ambush you face each round has -1 difficulty.
  - **Mire Pitchfork.** Add +1 Grit against enemies on salvage or hazard sectors.
  - **Weakness.** Blue Anomaly failures against you cause +1 Scar pressure or an extra consequence.

### Kira Dog - Houndblade Hero

- **Intended role:** Mobile fighter, protector, threat tracker.
- **Closest reference:** Trench Sergeant + Deadeye Scout.
- **Stats assessment:** `C3 G5 S1 U4 F2`. Strong and readable. Low Signal/Forge keeps her out of machine/anomaly comfort.
- **Ability assessment:** Great new-player hero if wording becomes crisp. Needs movement/tracking exception.
- **Balance risk:** Universal protection/evasion could bypass too much if not limited to allies/same sector.
- **Solo/co-op/rivalry notes:** Good in all modes; co-op protector is especially clear.
- **Recommended edits:** Keep. Give her a clean tracker route and wounded-enemy finisher.
- **Revised sheet text:**
  - **Ash-Scent Tracker.** Once per round, after threats are revealed in your sector, look at one unresolved threat there.
  - **Houndblade Charge.** Add +1 Grit on the first battle you start each turn.
  - **Loyal Guard.** If another operative in your sector would take a Wound, you may take it instead and gain +1 on your next battle this turn.
  - **Weakness.** You cannot use Ash-Scent Tracker on blue Anomalies.

### Ker Von Ker - Iron Bulwark

- **Intended role:** Fortress tank.
- **Closest reference:** Iron Bulwark / slow fortress.
- **Stats assessment:** `C2 G5 S1 U2 F5`. Same as Bjornis, so the sheet currently reads redundant.
- **Ability assessment:** The role is clear in name, but rules need a real slow/low-flexibility weakness and anti-enemy-dice identity.
- **Balance risk:** High Grit + high Forge + no movement penalty is just "Bjornis again."
- **Solo/co-op/rivalry notes:** Good family-table tank if simple. Needs a visible cost so he does not trivialize red lanes.
- **Recommended edits:** Keep fortress identity, differentiate by slow movement and armor prevention.
- **Revised sheet text:**
  - **Iron Bulwark.** Enemy dice cannot explode against you.
  - **Hold the Line.** Once per round, prevent 1 Wound after a battle or hazard.
  - **Shield Breaker.** Add +1 Grit when fighting an enemy with difficulty 8 or higher.
  - **Weakness.** When you roll movement, roll 2 dice and use the lower result.

### Deepdale - Deep Route Delver

- **Intended role:** Route engineer, deep-path delver, hazard repair.
- **Closest reference:** Forge Savant + Void-Seer route support.
- **Stats assessment:** `C1 G3 S4 U2 F5`. Good asymmetry; low Command/Guile matters.
- **Ability assessment:** Strong subterranean explorer concept, but overlaps Brask/Dessa unless focused on route checks and hazard repair.
- **Balance risk:** Repair plus market plus anomaly safety can cover too many systems.
- **Solo/co-op/rivalry notes:** Good solo because route safety is universal; co-op can scout/repair.
- **Recommended edits:** Make him the "route penalty and hazard check" character, not generic salvage.
- **Revised sheet text:**
  - **Underway Ear.** Once per round, before resolving a movement or hazard test, you may see the target difficulty before choosing Gear.
  - **Black Dust Craft.** After you pass a Forge test in a route, machine, or salvage sector, repair 1 exhausted Gear.
  - **Lantern Delver.** Add +1 Signal on anomaly-lit route tests.
  - **Weakness.** You cannot use Black Dust Craft in shops.

### Bjornis - Firebreak Conqueror

- **Intended role:** Firebreak tank, red-lane bruiser, ember protector.
- **Closest reference:** Ironbound Brute + Trench Sergeant.
- **Stats assessment:** `C2 G5 S1 U2 F5`. Very strong. Overlaps Ker exactly.
- **Ability assessment:** Fun identity, but currently all abilities are flavor. Needs fire/ember/breach suppression mechanics.
- **Balance risk:** Grit 5/F5 plus Red March Warbell can dominate combat unless weak against blue/yellow.
- **Solo/co-op/rivalry notes:** Excellent new-player fighter; co-op protector; rivalry straightforward.
- **Recommended edits:** Keep as aggressive firebreak bruiser. Give Ker the fortress weakness, give Bjornis the risky charge.
- **Revised sheet text:**
  - **Firebreak Vow.** Add +1 Grit against red threats and enemies on ember/fire sectors.
  - **Foam and Fury.** Once per round, after you win a battle, reduce one local fire/pressure marker or scenario pressure by 1 if allowed.
  - **Cinder Hug.** When an ally in your sector would retreat or take a Wound from a red threat, you may take 1 Wound to cancel that effect.
  - **Weakness.** You suffer -1 on blue Anomaly tests.

### Joss Var - Black Ledger Agent

- **Intended role:** Broker, contract manipulator, rivalry economy pressure.
- **Closest reference:** Void Broker + Iron Provost.
- **Stats assessment:** `C3 G1 S3 U5 F3`. Excellent noncombat profile. Grit 1 is loud and meaningful.
- **Ability assessment:** Strong concept. Needs conversion into Salvage/Contract/mark mechanics instead of abstract leverage.
- **Balance risk:** Contract progress and escalation reduction can be too good if always-on.
- **Solo/co-op/rivalry notes:** Best rivalry character. Needs solo/co-op alternatives to theft/pressure.
- **Recommended edits:** Keep. Make "debt marks" explicit and capped.
- **Revised sheet text:**
  - **Ledger Broker.** When you accept a Contract, draw 2 Contract options and keep 1.
  - **Silent Audit.** Once per round, after you clear a sector with no unresolved blockers, gain 1 Leverage.
  - **Debt Knife.** Spend 1 Leverage before a battle tied to your Contract to gain +2 Guile or +1 Grit.
  - **Black File.** When you complete a Contract, spend 1 Leverage to gain 1 Salvage or reduce scenario pressure by 1.
  - **Weakness.** You cannot spend Leverage on battles not tied to a Contract.

### MASTER ALPHA - QA ONLY

- **Intended role:** Test harness, not a playable character.
- **Closest reference:** None. This is an internal stress character.
- **Stats assessment:** `C9 G9 S9 U9 F9`, 99 Salvage, huge gear/follower load. Correctly marked QA-only.
- **Ability assessment:** Good for overflow and stress tests. Must stay out of normal selection and balance reports.
- **Balance risk:** Catastrophic if exposed to players.
- **Solo/co-op/rivalry notes:** QA only.
- **Recommended edits:** Keep, but visually stamp "QA ONLY" anywhere it appears.
- **Revised sheet text:** No player-facing revision. Keep test-only language.

## 3. Roster Matrix

| Character | Role | Closest Reference | Main Resource | Main Weakness | Complexity | Power | Revision Priority |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| Tarek Voss | Commander/support | Vanguard Marshal | Command Notes / Contracts | Signal, Guile | 3 | 4 | Medium |
| Lane | Signal/anomaly specialist | Psyker + Navigator | Route Notes / Signal | Command, Grit | 3 | 4 | Low |
| Yuna Castell | Healer/support | Mercy Saint | Wound/Scar recovery | Signal, Guile | 3 | 3 | Medium |
| Brask Ode | Salvage gear economy | Forge Savant | Salvage / Equipment | Signal | 3 | 4 | Medium |
| Senna Pell | Route mapper | Navigator + Scout | Route Notes | Command, Grit | 4 | 4 | Low |
| Reskin Hale | Broker/objective leverage | Rogue Trader | Debt / Contract progress | Signal | 4 | 4 | Medium |
| Dessa Korr | Gear/armor engineer | Tech-priest | Equipment / repair | Command | 3 | 4 | Medium |
| Orenna Tash | Convoy commander | Vanguard Marshal | Convoy Notes | Grit | 3 | 3 | Low |
| Mira | Pressure monk | Saint-Commander | Vow Notes / pressure | Too little weakness | 3 | 3 | High |
| Rumi | Signal duelist | Psyker + Assassin | Rerolls / companions | Command, Forge | 4 | 4 | Medium |
| Popelord | Mire brawler | Soldier + scavenger | Salvage | Signal | 2 | 4 | High |
| Kira Dog | Protector fighter | Soldier + Scout | Tracking / guard | Signal, Forge | 2 | 4 | Low |
| Ker Von Ker | Fortress tank | Iron Bulwark | Armor prevention | Needs movement weakness | 2 | 4 | High |
| Deepdale | Route delver | Forge Savant + Navigator | Repairs / route intel | Command, Guile | 3 | 4 | Medium |
| Bjornis | Firebreak bruiser | Ironbound Brute | Red threat control | Blue Anomalies | 2 | 5 | High |
| Joss Var | Contract broker | Rogue Trader | Leverage | Grit | 4 | 4 | Low |
| MASTER ALPHA | QA stress harness | None | Test override | Not playable | 5 | 5+ | Low, QA-only |

## 4. Final Recommendations

### Ready or Near-Ready

- Joss Var
- Lane
- Senna Pell
- Orenna Tash
- Kira Dog

These have clear stat-role alignment and strong identities. They mostly need concise timing/cost wording.

### Light Revision

- Tarek Voss
- Yuna Castell
- Brask Ode
- Dessa Korr
- Reskin Hale
- Rumi
- Deepdale

These are solid but need either cleaner mechanics, reduced overlap, or stronger visible resource hooks.

### Heavy Redesign / Differentiation

- Bjornis
- Ker Von Ker
- Popelord
- Mira

These either overlap too much, lack a visible weakness, or need one memorable tactical exception.

### Mechanics That Should Become Standard Ashen Reach Character Language

- **Once per round** as the default cap.
- **Route Note / Command Note / Convoy Note / Leverage / Vow Note** as named but simple character currencies.
- **Sector tag triggers**: red, blue, yellow, movement, salvage, anomaly, contract, sanctuary.
- **Mode-safe rivalry text**: rivalry effects must have solo/co-op alternatives.
- **Visible Scar/Wound wording** instead of hidden Heat-style pressure.

### Mechanics To Restrict Or Avoid

- Broad pressure reduction after any success.
- Unlimited free Gear or Contract progress.
- Universal evasion.
- Full corruption/scar immunity.
- Hidden `heat` reductions presented as character benefits.
- Abilities that sound mechanical but only add private notes.

## 5. Four-Seat Critique

- **New player:** Roles are visually exciting, but many sheets do not tell me what button to press or when the rule happens.
- **Optimizer:** I would gravitate to high-stat bruisers with strong starting gear, especially Bjornis/Ker, unless their weaknesses are made real.
- **Family player:** Healing, protection, and route-note support are friendly; invisible pressure math and vague "leverage" can feel arbitrary.
- **Rules lawyer:** The largest issue is mismatch between prose, schema, and server hooks. If a character says it does something, the UI and engine need a named timing window and source row.

## 6. Priority Fix Order

1. Replace all visible and character-facing Heat/steady-line effects with Scars, Wounds, route notes, Salvage, pressure, or Contract wording.
2. Differentiate Bjornis and Ker immediately.
3. Rewrite every playable character to a consistent 3-4 rule template:
   - Passive identity.
   - Resource engine.
   - Tactical exception.
   - Weakness.
4. Add a roster UI badge for complexity and role.
5. Decide whether route notes / command notes / leverage are real state or just private notes. If real, promote them into explicit projected state.


