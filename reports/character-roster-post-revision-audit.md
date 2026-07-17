# Character Roster Post-Revision Audit

Audited commit: `a8a3716 revise-character-roster-rules`

Scope reviewed:

- `content/characters/*.json`
- `src/server/roomServer.ts`
- `src/game/engine/__tests__/engine.test.ts`

Pre-existing dirty files intentionally not touched:

- `src/client/phone/PhoneActionPanel.tsx`
- `src/client/phone/__tests__/PhoneActionPanel.test.tsx`
- `src/client/styles.css`

## Executive Verdict

The revision pass materially improved the roster. Most character abilities now read like board-game rules instead of lore prose: timing is usually explicit, costs are clearer, and Heat is no longer presented as a character-facing benefit track. The 16 playable characters still preserve the normal 15-point stat budget.

The main QA concern is that the rewritten sheets now promise some clean table rules that are not yet fully backed by authoritative server mechanics. This is a good problem to have, but it needs a follow-up tuning pass before the roster is fully live-trustworthy.

No character needs a full conceptual redesign after this revision. The next work should be targeted implementation/wording polish for:

1. note resources that are currently only private text notes,
2. passive/conditional stat bonuses that are not yet formula-backed,
3. undefined table terms such as Spoil, non-boss, Contract tag, and sector subtypes.

## Key Findings

### P1-Roster-001: Several rewritten passive bonuses are not server-authoritative yet

Several character sheets now say a character gains a passive or conditional bonus, but the scoped server/test files do not show matching implementation or tests for those IDs.

Examples:

- Bjornis `Firebreak Vow`: `content/characters/char_bjornis.json:27`
- Ker `Shield Breaker`, `Iron Bulwark`, `Hold the Line`: `content/characters/char_ker_von_ker.json:27`, `content/characters/char_ker_von_ker.json:32`, `content/characters/char_ker_von_ker.json:42`
- Kira `Houndblade Charge`: `content/characters/char_kira_dog.json:27`
- Popelord `Mire Pitchfork`: `content/characters/char_popelord.json:27`
- Rumi `Violet Edge`: `content/characters/char_rumi.json:27`

The search found no matching server hooks for Bjornis, Ker, Popelord, Kira, or Rumi ability IDs in the scoped server/test files. This means a player may read a bonus that the battle/check formula does not apply.

Recommended fix order:

1. Implement formula source rows for conditional character bonuses.
2. Add tests for each heavy target bonus.
3. If a bonus is intentionally content-only for now, downgrade the text to inspectable guidance instead of a mechanical promise.

### P1-Roster-002: Note resources are not first-class counters yet

The revised roster now uses named notes as resources: Command Note, Route Note, Leverage Note, Vow Note, Convoy Note, Debt Note, Yard Note, and Triage Note. The server currently appends private text notes, but the scoped code does not expose these as spendable typed counters.

Evidence:

- `applyAbilityMutation` hooks append `entry.private.notes`: `src/server/roomServer.ts:2727`
- Tarek spends Command Notes in text: `content/characters/void-marshal.json:39`
- Mira spends Vow Notes in text: `content/characters/cinder-monk.json:44`
- Senna and Lane spend/use Route Notes in text: `content/characters/rift-cartographer.json:34`, `content/characters/signal-witch.json:44`
- Brask uses Yard Notes for a later sale bonus: `content/characters/salvage-warden.json:39`

Risk: the character sheet is clear to a table player, but the live server cannot yet reliably decrement, display, or enforce these resources.

Recommended follow-up:

- Create a small typed character resource model, or rename the text to "record a note" only until spending exists.
- Add source rows and disabled reasons when a note cannot be spent.

### P1-Roster-003: Mira's Cinder Oath text and hook do not yet match

Mira's sheet says: "Spend 1 Vow Note before a scenario confrontation test to add +2" at `content/characters/cinder-monk.json:44`.

The server hook for `cinder-oath` currently triggers when a confrontation is requested and records a private note, but it does not spend a Vow Note or add +2 to the confrontation test: `src/server/roomServer.ts:3718`.

Risk: this is a high-trust moment because scenario confrontations are climactic. The UI/formula must show the Vow Note source if the bonus is real.

Recommended follow-up:

- Either implement the +2 confrontation modifier with a source row, or change the text to "record 1 Vow Note before the confrontation" until spending exists.

### P2-Roster-004: Bjornis and Ker are meaningfully different in text, but not in stats

Bjornis and Ker now have distinct play incentives:

- Bjornis: red-threat/fire-sector bruiser and ally protector.
- Ker: high-threat fortress/tank with anti-exploding enemy dice and Wound prevention.

However, they still share the exact same stat profile: `Command 2, Grit 5, Signal 1, Guile 2, Forge 5`.

This does not make one obsolete because their abilities pull toward different choices. But at first glance, a new player still sees two nearly identical bruiser stat lines.

Recommended follow-up:

- Keep the total stat budget at 15, but consider a one-point redistribution:
  - Bjornis: `C2 G5 S1 U3 F4`, more practical rescue/bruiser.
  - Ker: `C1 G5 S1 U2 F6` is not legal under current max 5, so instead `C1 G5 S1 U3 F5` or leave stats and rely on a strong movement weakness.
- If stats stay identical, the character select UI should emphasize the difference.

### P2-Roster-005: Some table terms need glossary or implementation support

Terms that are clear in theme but not yet fully grounded as rules:

- Spoil: `content/characters/char_kira_dog.json:44`
- non-boss: `content/characters/char_rumi.json:34`
- noble, mirror, or court sector: `content/characters/char_rumi.json:44`
- danger 2+ sector: `content/characters/oathbroken-prince.json:44`
- route or escort Contract: `content/characters/fleet-elder.json:34`
- Contract tag: `content/characters/oathbroken-prince.json:29`
- fire-marked sector action: `content/characters/char_bjornis.json:34`
- mire sector: `content/characters/char_popelord.json:29`
- objective push: `content/characters/void-marshal.json:44`

Recommended follow-up:

- Add a small character ability glossary or map these phrases to existing tags/fields.
- Avoid invented terms in sheet text unless the engine can resolve them.

### P2-Roster-006: Deprecated Heat is no longer a named character hook, but scoped files still contain legacy compatibility

No revised character-facing ability text uses Heat as a visible track. The named character ability hooks in `roomServer.ts` no longer reduce hidden Heat as their reward.

Remaining scoped Heat references are compatibility/state/test fixtures, not roster-facing text:

- Character schema field instances: `content/characters/*:15`
- Cinder Monk starting gear ID: `content/characters/cinder-monk.json:48`
- Character initialization defaults: `src/server/roomServer.ts:880`, `src/server/roomServer.ts:2552`, `src/server/roomServer.ts:8461`
- Legacy nemesis/compatibility mutation: `src/server/roomServer.ts:5911`
- Old cost/result plumbing: `src/server/roomServer.ts:6522`, `src/server/roomServer.ts:6540`, `src/server/roomServer.ts:6635`, `src/server/roomServer.ts:7422`, `src/server/roomServer.ts:7532`

Recommendation:

- Safe to leave these for compatibility, but rename `heat-sink-prayer` in a separate content migration if it ever becomes visible in debug/export surfaces.

## Character Rule Clarity Review

### Joss Var - Black Ledger Agent

- Role: contract/economy manipulator.
- Clear: timing and limits are mostly explicit.
- Main risk: Leverage Note is not a typed spendable resource yet.
- Mode fit: strong solo and rivalry; co-op works as contract support.
- Verdict: needs light mechanical tuning.

### Bjornis - Firebreak Conqueror

- Role: red-threat/fire-sector bruiser and ally protector.
- Clear: identity is now immediate.
- Main risk: +1 Grit, inspection, ally-cancel, and red-threat pressure reduction do not appear to have complete server hooks yet.
- Weakness: blue Anomaly penalty matters because Signal is 1.
- Mode fit: solo is good if red/fire routes exist; co-op is excellent; rivalry is fair because protection costs Wounds.
- Verdict: needs light mechanical tuning.

### Deepdale - Deep Route Delver

- Role: route scout and Forge repair specialist.
- Clear: timing is mostly explicit.
- Main risk: "anomaly-lit route tests" needs tag support.
- Mode fit: solo good, co-op useful, rivalry low-abuse.
- Verdict: needs wording polish.

### Ker Von Ker - Iron Bulwark

- Role: slow fortress/tank.
- Clear: identity is strong.
- Main risk: anti-exploding enemy dice, Wound prevention, and lower-of-two movement are not confirmed as implemented in scoped tests.
- Weakness: movement penalty is excellent if implemented.
- Mode fit: solo slower but durable; co-op tank; rivalry not oppressive if movement weakness is real.
- Verdict: needs light mechanical tuning.

### Kira Dog - Houndblade Hero

- Role: first-strike guardian/scout.
- Clear: good tactical pattern.
- Main risk: Spoil is undefined, and the +1 first battle needs a formula hook.
- Mode fit: solo solid; co-op excellent; rivalry fair.
- Verdict: needs wording polish plus light mechanical tuning.

### Popelord - Mire Sovereign

- Role: salvage-yard brawler.
- Clear: much better than before.
- Main risk: sector subtype terms and passive +1 Grit need authoritative support.
- Weakness: blue Anomaly failure penalty matters due Signal 1.
- Mode fit: solo strong, co-op useful, rivalry could snowball Salvage if too many salvage/hazard sectors cluster.
- Verdict: needs light mechanical tuning.

### Rumi - Violet Riftblade

- Role: Signal/Guile duelist and evasion assassin.
- Clear: strong identity preserved.
- Main risk: Route Note spending, non-boss evasion, and "noble/mirror/court sector" need engine/tag backing.
- Mode fit: solo strong; co-op route support; rivalry stylish but not toxic.
- Verdict: needs wording polish plus light mechanical tuning.

### Mira - Cinder Monk

- Role: pressure monk who trades Wounds for control.
- Clear: identity is now much stronger.
- Main risk: Vow Notes are not a typed resource, and Cinder Oath's +2 is not backed by the scoped server hook.
- Weakness: resource restriction is meaningful if Vow Notes become real.
- Mode fit: solo good, co-op useful, rivalry not directly interactive.
- Verdict: needs light mechanical tuning.

### Orenna Tash - Fleet Elder

- Role: convoy commander and route/contract stabilizer.
- Clear: strong support identity.
- Main risk: Convoy Notes are text notes, not enforceable counters.
- Mode fit: solo functional; co-op excellent; rivalry safe if notes are public-safe.
- Verdict: needs light mechanical tuning.

### Dessa Korr - Grave Engineer

- Role: gear/armor engine.
- Clear: coherent and table-readable.
- Main risk: free Equipment draw/equip can snowball if not bounded by the actual deck/shop economy.
- Mode fit: solo strong; co-op gear support; rivalry economy pressure.
- Verdict: needs light mechanical tuning.

### Reskin Hale - Oathbroken Prince

- Role: contract/debt broker.
- Clear: theme and mode-specific rivalry rule are good.
- Main risk: "Contract tag" and mark/help/hinder need formal support.
- Mode fit: solo works through Contract progress; co-op okay; rivalry best.
- Verdict: needs wording polish plus light mechanical tuning.

### Senna Pell - Rift Cartographer

- Role: route mapper and note specialist.
- Clear: one of the strongest designs.
- Main risk: Route Note spending is not yet first-class.
- Mode fit: solo excellent, co-op excellent, rivalry fair.
- Verdict: needs light mechanical tuning.

### Brask Ode - Salvage Warden

- Role: salvage/shop gear economy.
- Clear: useful and distinct from Dessa after revision.
- Main risk: Yard Note and "next sale" timing need authoritative state.
- Mode fit: solo strong economy; co-op table gear support; rivalry may snowball Salvage.
- Verdict: needs light mechanical tuning.

### Dr. Yuna Castell - Siege Medic

- Role: healer/scar support.
- Clear: support role preserved and improved.
- Main risk: Scar Ledger says "reduce its penalty by 1 for this roll" but needs formula/disabled-reason integration to avoid hidden handling.
- Mode fit: solo okay, co-op excellent, rivalry non-toxic.
- Verdict: needs light mechanical tuning.

### Lane - Signal Witch

- Role: Signal/anomaly specialist.
- Clear: identity preserved.
- Main risk: Route Note spending/placement is not first-class; Hush Static difficulty reduction needs a formula source row.
- Mode fit: solo strong on blue routes, co-op support, rivalry fair.
- Verdict: needs light mechanical tuning.

### Tarek Voss - Void Marshal

- Role: commander/contract support.
- Clear: strong, but depends on Command Notes.
- Main risk: Signal Relay says "spend 1 Command Note" but the current hook records notes and triggers support automatically in a combat-victory context.
- Mode fit: solo functional through Contract/pressure; co-op very strong; rivalry may become kingmaker if ally support is too broad.
- Verdict: needs light mechanical tuning.

## Roster Matrix

| Character | Core role | Stat total | Main strength | Main weakness | Main resource hook | Tactical exception | Complexity | Power risk | Revision risk |
| --- | --- | ---: | --- | --- | --- | --- | ---: | ---: | --- |
| Joss Var | Contract broker | 15 | Guile 5, Contract progress | Grit 1 | Leverage Note | Contract progress from kills/completion | 3 | 3 | Medium |
| Bjornis | Red/fire protector bruiser | 15 | Grit 5, Forge 5 | Signal 1, blue Anomalies | Pressure reduction | Cancels ally Wound/retreat at Wound cost | 3 | 3 | Medium |
| Deepdale | Route delver/repair scout | 15 | Forge 5, Signal 4 | Command 1 | Shop discount/repair | Inspect target before Gear | 3 | 2 | Low |
| Ker Von Ker | Fortress tank | 15 | Grit 5, Forge 5 | Slow movement, Signal 1 | Wound prevention | Enemy dice cannot explode | 3 | 4 | Medium |
| Kira Dog | Guardian striker | 15 | Grit 5, Guile 4 | Signal 1 | Spoils | Takes ally Wound for bonus | 3 | 3 | Medium |
| Popelord | Salvage brawler | 15 | Grit 5, Forge 4 | Signal 1, blue Anomalies | Salvage | Yellow trap difficulty reduction | 3 | 3 | Medium |
| Rumi | Signal/Guile duelist | 15 | Signal 5, Guile 4 | Command 1, Forge 2 | Route Note | Non-boss evasion | 4 | 3 | Medium |
| Mira | Pressure monk | 15 | Broad 3s, Grit 4 | Pays Wounds, no strong low stat | Vow Note | Wound-for-pressure reduction | 4 | 3 | Medium |
| Orenna Tash | Convoy commander | 15 | Command 5, Signal 4 | Grit 1 | Convoy Note | Turns route/contract sectors into support | 4 | 3 | Medium |
| Dessa Korr | Gear engineer | 15 | Forge 5, Guile 4 | Command 1 | Equipment/Gear repair | Free Armor equip from machine/salvage | 3 | 4 | Medium |
| Reskin Hale | Debt prince | 15 | Guile 5, Command 4 | Signal 1 | Debt Note/Salvage | Rivalry mark/payoff | 4 | 3 | Medium |
| Senna Pell | Rift cartographer | 15 | Signal 5, Guile 5 | Command 1, Forge 2 | Route Note | Reroll movement/route test | 4 | 3 | Medium |
| Brask Ode | Salvage warden | 15 | Forge 5, Guile 4 | Signal 1 | Salvage/Yard Note | Salvage discount/sell bonus | 3 | 3 | Medium |
| Dr. Yuna Castell | Siege medic | 15 | Forge 5 | Signal 2, Guile 2 | Triage Note | Scar penalty softening | 3 | 3 | Medium |
| Lane | Signal Witch | 15 | Signal 5, Guile 4 | Command 1, Grit 2 | Route Note | Blue Anomaly softening | 4 | 3 | Medium |
| Tarek Voss | Void Marshal | 15 | Command 5 | Signal 2, Guile 2 | Command Note | Ally +1 support | 4 | 3 | Medium |

## Bjornis / Ker Differentiation

Confirmed improvements:

- Bjornis now chooses red/fire lanes, protects allies, and pays Wounds to prevent red-threat harm.
- Ker now chooses high-threat fights, tanks damage, and should suffer from a slow movement rule.
- Their incentives are different: Bjornis wants red/fire rescue moments; Ker wants unavoidable high-threat confrontations.

Remaining concern:

- Their stats are still identical. A new player comparing only the stat blocks may not understand the difference until reading all abilities.
- Ker's core weaknesses and strengths are more dependent on engine implementation than Bjornis's visible red-lane identity.

Verdict:

- They no longer make each other obsolete in concept.
- They need either server-backed mechanical differences or character-select presentation that foregrounds their different jobs.

## Heavy Revision Target Review

### Bjornis

- Identity clear: yes.
- Weakness matters: yes, because Signal 1 plus blue Anomaly penalty is painful.
- Distinct play pattern: yes, red/fire rescue bruiser.
- Remaining issue: the +1 Grit and Cinder Hug protection need server tests.

### Ker Von Ker

- Identity clear: yes.
- Weakness matters: yes if lower-of-two movement is implemented.
- Distinct play pattern: yes, fortress/tank.
- Remaining issue: several rules are high-impact and need formula/movement hooks.

### Popelord

- Identity clear: yes.
- Weakness matters: yes, blue Anomaly failures are a real pressure point.
- Distinct play pattern: mostly; he is now salvage brawler rather than generic brute.
- Remaining issue: "mire sector" and yellow ambush/trap detection need tag support.

### Mira

- Identity clear: yes.
- Weakness matters: partly. Paying Wounds is meaningful, but her stat profile remains broad.
- Distinct play pattern: yes, pressure monk.
- Remaining issue: Vow Notes need real counter/spend support; Cinder Oath is currently the biggest text-vs-hook mismatch.

## Strong Design Preservation

- Rift Cartographer: preserved as the strongest route/Signal-Guile mapper; needs Route Notes formalized.
- Black Ledger Agent: preserved as contract/leverage agent; needs Leverage Notes formalized.
- Signal Witch: preserved as blue/anomaly specialist; needs source rows for Hush Static and Route Note spending.
- Siege Medic: preserved as healer/scar support; needs Scar Ledger formula/disabled-reason coverage.
- Rumi: preserved as Signal/Guile duelist; needs evasion and Route Note spending support.

## Deprecated System Cleanup Review

Named character hooks no longer reduce hidden Heat as their reward. That is a good cleanup.

Remaining Heat references are compatibility/fixtures, not revised character-facing text. The only character-content concern is the internal starting gear ID `heat-sink-prayer` on Mira at `content/characters/cinder-monk.json:48`. The displayed item name may be clean elsewhere, but this internal ID can still leak in debug/export/report surfaces.

Recommended future cleanup:

- Rename or alias `heat-sink-prayer` to `scar-sink-prayer` in a dedicated migration pass.
- Keep `heat` schema defaults until save compatibility is intentionally migrated.

## Engine / Server Safety

Confirmed safe:

- The revised hooks remain server-side in `roomServer.ts`.
- Existing hooks are deterministic and bounded by `hasAbilityTriggeredThisRound` or `hasAbilityTriggeredThisSession` in many relevant paths.
- The full engine and test suites pass after the revision commit.
- No client-only state was introduced in `a8a3716`.

Risks:

- Tests currently validate note creation for many abilities, not the real spend/use path promised by the sheet text.
- Several new passive bonuses have no matching tests.
- Several ability summaries still use old "cooling/calm" language in server/test fixture text. This is not a player-facing Heat hook, but it keeps some old vocabulary in developer-facing output.
- `Cinder Oath` has the clearest hook mismatch: the hook records a note while the sheet promises a +2 confrontation modifier.

## Mode Coverage

| Character | Solo | Co-op | Rivalry | Mode risk |
| --- | --- | --- | --- | --- |
| Joss Var | Good | Good | Excellent | Contract engine can overpace solo if too broad |
| Bjornis | Good | Excellent | Good | Ally protection weaker solo |
| Deepdale | Good | Good | Good | Shop/repair utility depends on sector density |
| Ker Von Ker | Good if movement penalty is fair | Excellent | Good | Slow movement can frustrate solo if too harsh |
| Kira Dog | Good | Excellent | Good | Ally guard weaker solo |
| Popelord | Good | Good | Good | Salvage snowball risk |
| Rumi | Good | Good | Good | Evasion must not bypass bosses |
| Mira | Good | Good | Good | Needs Vow Note implementation |
| Orenna Tash | Fair | Excellent | Good | Co-op support may be weaker solo |
| Dessa Korr | Excellent | Good | Good | Gear engine snowball risk |
| Reskin Hale | Good | Fair | Excellent | Rivalry-only Crown Debt needs co-op alternative clarity |
| Senna Pell | Excellent | Excellent | Good | Route Notes may smooth too many checks |
| Brask Ode | Excellent | Good | Good | Salvage economy snowball risk |
| Dr. Yuna Castell | Fair | Excellent | Good | Healing weaker solo unless self-heal remains reliable |
| Lane | Good | Good | Good | Blue/anomaly density affects value |
| Tarek Voss | Good | Excellent | Good | Ally support weaker solo |

## Final QA Verdict

### Ready

These are table-readable and conceptually strong, but still benefit from note-resource implementation:

- Rift Cartographer
- Signal Witch
- Black Ledger Agent
- Siege Medic

### Needs Wording Polish

- Deepdale: define anomaly-lit routes and shop discount timing.
- Kira Dog: define Spoil and non-blue threat inspection boundaries.
- Rumi: define non-boss, noble/mirror/court sectors, and Route Note spend.
- Reskin Hale: define Contract tag and help/hinder mark timing.

### Needs Light Mechanical Tuning

- Bjornis: implement red/fire +1 Grit, Cinder Hug, and Foam and Fury source behavior.
- Ker Von Ker: implement enemy no-explode, Wound prevention, and lower-of-two movement.
- Popelord: implement salvage/hazard/mire +1 Grit and blue Anomaly consequence.
- Mira: implement Vow Note resource and Cinder Oath +2.
- Orenna Tash: formalize Convoy Notes.
- Dessa Korr: bound Equipment draw/equip economy.
- Brask Ode: formalize Yard Note and salvage-sale bonus.
- Tarek Voss: formalize Command Notes and ally support spend.

### Needs Heavy Redesign

None after this pass. The roster identities are now strong enough that the next pass should be implementation and wording cleanup, not archetype replacement.

## Recommended Next Fix Order

1. Make named notes either real typed resources or downgrade all "spend/use Note" text to "record a note" until spend exists.
2. Implement and test Bjornis, Ker, Popelord, and Mira core mechanics first.
3. Add source rows for character passive/conditional modifiers in battle/check formulas.
4. Define or replace undefined terms: Spoil, non-boss, Contract tag, route/escort Contract, fire-marked, mire.
5. Rename `heat-sink-prayer` in a separate compatibility-safe pass if it can leak to users.

## Verification Plan

After creating this report, run:

- `npm.cmd run validate:content`
- `npm.cmd run typecheck`
- `npm.cmd run test:engine`
- `npm.cmd run test`
- `npm.cmd run audit:assets`
- `npm.cmd run build`

