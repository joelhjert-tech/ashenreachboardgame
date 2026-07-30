import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type ThreatLane = "red" | "blue" | "yellow";
type Stat = "command" | "grit" | "signal" | "guile" | "forge";
type EnemyFamily =
  | "human"
  | "choir"
  | "cartel"
  | "machine"
  | "beast"
  | "vermin"
  | "breachborn"
  | "revenant"
  | "bureaucracy";

type ThreatFaction =
  | "The Sealed Deep"
  | "Cinder Court"
  | "Mirror Wake"
  | "Buried Maw"
  | "Last Light Engine"
  | "Violet Court"
  | "Red Maw Raiders"
  | "Shardborn Brood"
  | "Ashen Choir"
  | "Iron Synod"
  | "Pallid Retinue"
  | "Rift Court";

interface EnemySeed {
  title: string;
  faction: ThreatFaction;
  lane: ThreatLane;
  stat: Stat;
  difficulty: number;
  family: EnemyFamily;
  method: string;
  flavor: string;
}

const enemySeeds: EnemySeed[] = [
  {
    title: "Seal-Gravel Prowler",
    faction: "The Sealed Deep",
    lane: "red",
    stat: "grit",
    difficulty: 2,
    family: "beast",
    method: "bursts from burial scree and drives prey toward the oldest locked doors",
    flavor: "The gravel moves once. Then it breathes."
  },
  {
    title: "Coffin-Iron Grappler",
    faction: "The Sealed Deep",
    lane: "red",
    stat: "grit",
    difficulty: 3,
    family: "revenant",
    method: "hooks intruders with riveted arms and drags them back across the seal line",
    flavor: "Every link in its chain remembers a prisoner."
  },
  {
    title: "Ember-Throat Jackal",
    faction: "Cinder Court",
    lane: "red",
    stat: "grit",
    difficulty: 2,
    family: "beast",
    method: "tracks warm blood through cold ash before closing in with furnace-bright jaws",
    flavor: "It learned court manners from the execution yard."
  },
  {
    title: "Furnace Page",
    faction: "Cinder Court",
    lane: "red",
    stat: "grit",
    difficulty: 2,
    family: "human",
    method: "carries a ceremonial blade too large for its frame and attacks anyone who will not kneel",
    flavor: "A ruined title still demands an audience."
  },
  {
    title: "Ash-Sash Challenger",
    faction: "Cinder Court",
    lane: "red",
    stat: "grit",
    difficulty: 3,
    family: "human",
    method: "marks the road as a dueling floor and answers hesitation with a hooked saber",
    flavor: "The sash is older than the hand holding the blade."
  },
  {
    title: "Hearth-Ruin Behemoth",
    faction: "Cinder Court",
    lane: "red",
    stat: "grit",
    difficulty: 10,
    family: "beast",
    method: "tears open dead furnaces and wears their burning plates as a moving throne",
    flavor: "The Court calls it royal because nothing else survives nearby."
  },
  {
    title: "Splinterbody Pursuer",
    faction: "Mirror Wake",
    lane: "red",
    stat: "signal",
    difficulty: 3,
    family: "breachborn",
    method: "copies an operative's stance one heartbeat late and turns every feint into a collision",
    flavor: "Your reflection has already decided not to stop."
  },
  {
    title: "Grubmaw Scavenger",
    faction: "Buried Maw",
    lane: "red",
    stat: "grit",
    difficulty: 2,
    family: "beast",
    method: "chews through abandoned packs and lunges at anything trying to recover them",
    flavor: "It prefers buckles, but it will settle for fingers."
  },
  {
    title: "Tunnel-Drum Brute",
    faction: "Buried Maw",
    lane: "red",
    stat: "grit",
    difficulty: 2,
    family: "beast",
    method: "hammers its plated chest until the ground answers with a hunting tremor",
    flavor: "The second beat always comes from below."
  },
  {
    title: "Roadbone Gnawer",
    faction: "Buried Maw",
    lane: "red",
    stat: "grit",
    difficulty: 3,
    family: "beast",
    method: "rips marker posts from the route and sharpens its teeth on their iron cores",
    flavor: "It eats the map before it eats the traveler."
  },
  {
    title: "Underroad Ram",
    faction: "Buried Maw",
    lane: "red",
    stat: "grit",
    difficulty: 4,
    family: "beast",
    method: "charges through thin ground with a crown of stone fused across its skull",
    flavor: "The road cracks several breaths before it arrives."
  },
  {
    title: "Spark-Harvest Hound",
    faction: "Last Light Engine",
    lane: "red",
    stat: "grit",
    difficulty: 2,
    family: "machine",
    method: "sniffs out charged equipment and bites until the current changes owners",
    flavor: "Its tail wags only when a circuit dies."
  },
  {
    title: "Boilerclaw Porter",
    faction: "Last Light Engine",
    lane: "red",
    stat: "grit",
    difficulty: 3,
    family: "machine",
    method: "mistakes living bodies for fuel canisters and tries to stack them for collection",
    flavor: "The loading order has outlived the station."
  },
  {
    title: "Furnace-Spine Breaker",
    faction: "Last Light Engine",
    lane: "red",
    stat: "forge",
    difficulty: 5,
    family: "machine",
    method: "locks onto worked metal and dismantles both tool and wielder with the same crushing arms",
    flavor: "Maintenance becomes violence when the checklist has no final line."
  },
  {
    title: "Briar-Oath Duelist",
    faction: "Violet Court",
    lane: "red",
    stat: "guile",
    difficulty: 3,
    family: "human",
    method: "offers safe passage, then attacks through the unspoken exception hidden in the bargain",
    flavor: "The promise was sincere. The wording was hungry."
  },
  {
    title: "Chainwake Boarder",
    faction: "Red Maw Raiders",
    lane: "red",
    stat: "grit",
    difficulty: 2,
    family: "human",
    method: "swings from cargo cable to cargo cable and lands behind the expedition's guard",
    flavor: "The wake arrives before the ship."
  },
  {
    title: "Warbell Runner",
    faction: "Red Maw Raiders",
    lane: "red",
    stat: "grit",
    difficulty: 2,
    family: "human",
    method: "sprints ahead of the boarding line and rings a hand bell to mark vulnerable prey",
    flavor: "One clear note can summon an entire deck crew."
  },
  {
    title: "Lane-Hook Reaver",
    faction: "Red Maw Raiders",
    lane: "red",
    stat: "grit",
    difficulty: 3,
    family: "human",
    method: "anchors a hooked chain into the route and pulls travelers out of formation",
    flavor: "Every road is a boarding plank if the hook holds."
  },
  {
    title: "Redwake Breaker",
    faction: "Red Maw Raiders",
    lane: "red",
    stat: "grit",
    difficulty: 6,
    family: "human",
    method: "advances behind a slab shield while a piston maul clears the lane one impact at a time",
    flavor: "The shield is a door taken from the last place that resisted."
  },
  {
    title: "Cargo-Hold Tyrant",
    faction: "Red Maw Raiders",
    lane: "red",
    stat: "grit",
    difficulty: 12,
    family: "human",
    method: "wears the chained remains of a captured hauler and fights as a one-person boarding fortress",
    flavor: "Its armor still bears the inventory numbers of the crew inside."
  },
  {
    title: "Glassjaw Whelp",
    faction: "Shardborn Brood",
    lane: "red",
    stat: "grit",
    difficulty: 2,
    family: "breachborn",
    method: "tests fresh crystal teeth against armor seams before the larger brood arrives",
    flavor: "Each broken tooth becomes another egg."
  },
  {
    title: "Shardhide Pouncer",
    faction: "Shardborn Brood",
    lane: "red",
    stat: "grit",
    difficulty: 3,
    family: "breachborn",
    method: "flattens against broken glass and erupts only when prey steps across its shadow",
    flavor: "The reflection is empty because the hunter is underneath it."
  },
  {
    title: "Nursery-Rib Ravager",
    faction: "Shardborn Brood",
    lane: "red",
    stat: "grit",
    difficulty: 4,
    family: "breachborn",
    method: "guards a cage of translucent brood organs with hooked ribs and sudden lateral strikes",
    flavor: "It carries the next generation where a heart should be."
  },
  {
    title: "Chordbreaker Penitent",
    faction: "Ashen Choir",
    lane: "red",
    stat: "grit",
    difficulty: 2,
    family: "choir",
    method: "beats a cracked tuning bar against its armor and charges at every discordant sound",
    flavor: "Silence is the only absolution it accepts."
  },
  {
    title: "Ashen Cantor Mauler",
    faction: "Ashen Choir",
    lane: "red",
    stat: "grit",
    difficulty: 3,
    family: "choir",
    method: "turns a work chant into measured blows from a soot-black hammer",
    flavor: "The final verse is written in dents."
  },
  {
    title: "Rivet-Fist Laborer",
    faction: "Iron Synod",
    lane: "red",
    stat: "grit",
    difficulty: 2,
    family: "human",
    method: "continues a long-abandoned construction order by hammering trespassers into the floor",
    flavor: "The shift ended generations ago. The labor did not."
  },
  {
    title: "Welded Breach Ox",
    faction: "Iron Synod",
    lane: "red",
    stat: "grit",
    difficulty: 3,
    family: "machine",
    method: "hauls a shrine-frame through the road and gores anything that slows the procession",
    flavor: "Its yoke is scripture written in load limits."
  },
  {
    title: "Receipt Hound",
    faction: "Pallid Retinue",
    lane: "red",
    stat: "guile",
    difficulty: 3,
    family: "beast",
    method: "smells unrecorded possessions and attacks the hand closest to the disputed property",
    flavor: "It never bites the item listed on the form."
  },
  {
    title: "Courtline Enforcer",
    faction: "Rift Court",
    lane: "red",
    stat: "grit",
    difficulty: 2,
    family: "human",
    method: "plants a boundary spear in the road and treats every step beyond it as a violent appeal",
    flavor: "The border moves whenever the Court requires an offense."
  },
  {
    title: "Gatejaw Custodian",
    faction: "Rift Court",
    lane: "red",
    stat: "command",
    difficulty: 5,
    family: "human",
    method: "demands a formal right of passage while a hinged execution mask closes around each wrong answer",
    flavor: "The hearing ends when the jaw shuts."
  },
  {
    title: "Seal-Whisper Listener",
    faction: "The Sealed Deep",
    lane: "blue",
    stat: "signal",
    difficulty: 2,
    family: "revenant",
    method: "presses its ear to buried locks and repeats the thoughts of anyone standing nearby",
    flavor: "The door has learned your voice."
  },
  {
    title: "Archive Shade",
    faction: "The Sealed Deep",
    lane: "blue",
    stat: "signal",
    difficulty: 3,
    family: "revenant",
    method: "unfolds from a ruined record vault and erases the difference between warning and memory",
    flavor: "Every missing page still casts a shadow."
  },
  {
    title: "Lock-Song Adjudicator",
    faction: "The Sealed Deep",
    lane: "blue",
    stat: "signal",
    difficulty: 5,
    family: "bureaucracy",
    method: "broadcasts obsolete prison verdicts until the expedition's instruments begin enforcing them",
    flavor: "The sentence survived everyone named in it."
  },
  {
    title: "Sootglass Diviner",
    faction: "Cinder Court",
    lane: "blue",
    stat: "signal",
    difficulty: 2,
    family: "human",
    method: "reads cooling ash in a hand mirror and attacks the future in which the operative escapes",
    flavor: "Its predictions are simply threats spoken early."
  },
  {
    title: "Throne-Echo Medium",
    faction: "Cinder Court",
    lane: "blue",
    stat: "signal",
    difficulty: 3,
    family: "revenant",
    method: "channels a dead audience whose applause drowns out every useful signal",
    flavor: "The hall is gone, but the spectators refuse to leave."
  },
  {
    title: "Borrowed-Face Scout",
    faction: "Mirror Wake",
    lane: "blue",
    stat: "signal",
    difficulty: 2,
    family: "breachborn",
    method: "wears an unfinished copy of the nearest face and studies which memories make it flinch",
    flavor: "It smiles only after you do."
  },
  {
    title: "Glassstep Mimic",
    faction: "Mirror Wake",
    lane: "blue",
    stat: "signal",
    difficulty: 2,
    family: "breachborn",
    method: "repeats every footfall from the wrong direction until the route seems surrounded",
    flavor: "The extra step is always closer."
  },
  {
    title: "Echo-Thread Examiner",
    faction: "Mirror Wake",
    lane: "blue",
    stat: "signal",
    difficulty: 3,
    family: "breachborn",
    method: "pulls pale threads from spoken names and tests them for weaknesses in the original",
    flavor: "A name unravels more quietly than cloth."
  },
  {
    title: "False Horizon Adept",
    faction: "Mirror Wake",
    lane: "blue",
    stat: "signal",
    difficulty: 4,
    family: "breachborn",
    method: "bends distant landmarks into a convincing route that ends inside its waiting hands",
    flavor: "The shortest path is the one that never existed."
  },
  {
    title: "Thousand-Window Sovereign",
    faction: "Mirror Wake",
    lane: "blue",
    stat: "signal",
    difficulty: 10,
    family: "breachborn",
    method: "opens a court of reflected possibilities and attacks from every choice the operative refused",
    flavor: "Only one figure is real, and it is not interested in proving which."
  },
  {
    title: "Deep-Tremor Ear",
    faction: "Buried Maw",
    lane: "blue",
    stat: "signal",
    difficulty: 2,
    family: "beast",
    method: "listens through the road with a fan of bone and snaps at the loudest heartbeat",
    flavor: "It has never seen daylight, but it knows where you stand."
  },
  {
    title: "Hollowroad Listener",
    faction: "Buried Maw",
    lane: "blue",
    stat: "signal",
    difficulty: 3,
    family: "beast",
    method: "hums into empty tunnels and follows the returning note toward living prey",
    flavor: "The road answers in your voice."
  },
  {
    title: "Relay-Spark Seeker",
    faction: "Last Light Engine",
    lane: "blue",
    stat: "signal",
    difficulty: 2,
    family: "machine",
    method: "flits between dead receivers and steals the first clean pulse it can find",
    flavor: "It mistakes communication for loose fuel."
  },
  {
    title: "Dimming Beacon Host",
    faction: "Last Light Engine",
    lane: "blue",
    stat: "forge",
    difficulty: 3,
    family: "machine",
    method: "carries a failing navigation lamp whose repair routines overwrite nearby instruments",
    flavor: "Every fix makes the darkness more precise."
  },
  {
    title: "Star-Noise Interpreter",
    faction: "Last Light Engine",
    lane: "blue",
    stat: "signal",
    difficulty: 5,
    family: "machine",
    method: "translates reactor static into commands and broadcasts them through every open receiver",
    flavor: "The Engine has been wrong for so long that error sounds sacred."
  },
  {
    title: "Velvet Oracle",
    faction: "Violet Court",
    lane: "blue",
    stat: "signal",
    difficulty: 2,
    family: "human",
    method: "offers three pleasant futures and punishes anyone who notices the missing fourth",
    flavor: "Choice is the prettiest kind of enclosure."
  },
  {
    title: "Thorn-Reflection Scribe",
    faction: "Violet Court",
    lane: "blue",
    stat: "signal",
    difficulty: 3,
    family: "bureaucracy",
    method: "records each doubt in mirrored ink until the expedition begins reading its own fear aloud",
    flavor: "The contract signs itself in the reader's hand."
  },
  {
    title: "Promise-Echo Advocate",
    faction: "Violet Court",
    lane: "blue",
    stat: "command",
    difficulty: 6,
    family: "bureaucracy",
    method: "summons the remembered weight of every broken bargain and argues that the road itself is owed",
    flavor: "It never raises its voice. The debt does that for it."
  },
  {
    title: "Signal-Snare Spotter",
    faction: "Red Maw Raiders",
    lane: "blue",
    stat: "guile",
    difficulty: 3,
    family: "human",
    method: "casts false range marks across the lane and directs unseen crews toward the confusion",
    flavor: "The bright marker is never the safe one."
  },
  {
    title: "Prism Mite Cluster",
    faction: "Shardborn Brood",
    lane: "blue",
    stat: "signal",
    difficulty: 2,
    family: "vermin",
    method: "covers lenses and antennae with tiny bodies that split one signal into a hundred",
    flavor: "Each wing reflects a different warning."
  },
  {
    title: "Memoryglass Larva",
    faction: "Shardborn Brood",
    lane: "blue",
    stat: "signal",
    difficulty: 3,
    family: "breachborn",
    method: "feeds on repeated thoughts and grows a new facet for every remembered route",
    flavor: "Forget the road quickly, before it learns the way home."
  },
  {
    title: "Hush-Cant Novice",
    faction: "Ashen Choir",
    lane: "blue",
    stat: "signal",
    difficulty: 2,
    family: "choir",
    method: "sings below hearing and makes nearby receivers tremble in time with the hidden note",
    flavor: "You feel the hymn first in your teeth."
  },
  {
    title: "Relay Hymnist",
    faction: "Ashen Choir",
    lane: "blue",
    stat: "signal",
    difficulty: 4,
    family: "choir",
    method: "threads a rigid chant through abandoned towers and turns the whole lane into an instrument",
    flavor: "Every mast remembers one forbidden verse."
  },
  {
    title: "Static Veil Deacon",
    faction: "Ashen Choir",
    lane: "blue",
    stat: "signal",
    difficulty: 3,
    family: "choir",
    method: "draws a curtain of white noise around the expedition and listens for panic inside it",
    flavor: "The veil is woven from all the words that fail to arrive."
  },
  {
    title: "Final Cadence Examiner",
    faction: "Ashen Choir",
    lane: "blue",
    stat: "signal",
    difficulty: 4,
    family: "choir",
    method: "tests each voice against a perfect closing note and condemns every living variation",
    flavor: "Perfection leaves no room to breathe."
  },
  {
    title: "Witness Coil",
    faction: "Iron Synod",
    lane: "blue",
    stat: "signal",
    difficulty: 2,
    family: "machine",
    method: "records every movement in hot wire and lashes out when two accounts disagree",
    flavor: "It trusts the burn mark more than the witness."
  },
  {
    title: "Memory-Weld Auditor",
    faction: "Iron Synod",
    lane: "blue",
    stat: "signal",
    difficulty: 3,
    family: "bureaucracy",
    method: "compares spoken recollection against a steel archive and removes whatever cannot be reconciled",
    flavor: "Contradiction is treated as a loose component."
  },
  {
    title: "Saint-Frame Listener",
    faction: "Iron Synod",
    lane: "blue",
    stat: "signal",
    difficulty: 6,
    family: "machine",
    method: "opens a ring of preserved ears and triangulates the smallest lie in the route noise",
    flavor: "It was built to hear testimony, not mercy."
  },
  {
    title: "Ledger-Eye Clerk",
    faction: "Pallid Retinue",
    lane: "blue",
    stat: "signal",
    difficulty: 2,
    family: "bureaucracy",
    method: "counts possessions through a brass lens and flags anything whose owner looks uncertain",
    flavor: "Doubt is sufficient proof of arrears."
  },
  {
    title: "Name-Tithe Reader",
    faction: "Pallid Retinue",
    lane: "blue",
    stat: "signal",
    difficulty: 3,
    family: "bureaucracy",
    method: "reads old names from blank paper until one of them answers from inside the expedition",
    flavor: "The ledger remembers people who never existed."
  },
  {
    title: "Receipt-Memory Bailiff",
    faction: "Pallid Retinue",
    lane: "blue",
    stat: "guile",
    difficulty: 5,
    family: "bureaucracy",
    method: "presents a flawless record of a debt and watches for the instant disbelief becomes fear",
    flavor: "The false receipt is stamped with a genuine regret."
  },
  {
    title: "Foldline Surveyor",
    faction: "Rift Court",
    lane: "blue",
    stat: "signal",
    difficulty: 2,
    family: "human",
    method: "measures the distance between landmarks until the numbers force the route to bend",
    flavor: "The map obeys anyone patient enough to threaten it."
  },
  {
    title: "Breach Court Whisperer",
    faction: "Rift Court",
    lane: "blue",
    stat: "signal",
    difficulty: 3,
    family: "human",
    method: "delivers sealed decrees directly into nearby receivers without opening its mouth",
    flavor: "The order arrives already marked as acknowledged."
  },
  {
    title: "Gate-Claim Diviner",
    faction: "Rift Court",
    lane: "blue",
    stat: "signal",
    difficulty: 4,
    family: "bureaucracy",
    method: "reads ownership in the vibrations of locked hinges and declares every gate Court property",
    flavor: "A closed door is merely a verdict waiting to speak."
  },
  {
    title: "Hollow Decree Seer",
    faction: "Rift Court",
    lane: "blue",
    stat: "signal",
    difficulty: 6,
    family: "bureaucracy",
    method: "projects a dead ruler's command into the lane and makes machinery obey the empty authority",
    flavor: "The throne is vacant. The order is not."
  },
  {
    title: "Dust-Lock Porter",
    faction: "The Sealed Deep",
    lane: "yellow",
    stat: "forge",
    difficulty: 2,
    family: "machine",
    method: "collects abandoned tools and seals them into a walking cabinet of prison iron",
    flavor: "The key hangs inside the lock."
  },
  {
    title: "Hearth-Charter Broker",
    faction: "Cinder Court",
    lane: "yellow",
    stat: "guile",
    difficulty: 2,
    family: "human",
    method: "offers a stamped claim to warm shelter, then reaches for anything carried across the threshold",
    flavor: "Hospitality ends at the signature."
  },
  {
    title: "Reflection Pawnbroker",
    faction: "Mirror Wake",
    lane: "yellow",
    stat: "guile",
    difficulty: 2,
    family: "cartel",
    method: "prices copied equipment as genuine and insists the expedition already sold the originals",
    flavor: "The duplicate comes with your fingerprints."
  },
  {
    title: "Tunnel-Toll Appraiser",
    faction: "Buried Maw",
    lane: "yellow",
    stat: "guile",
    difficulty: 2,
    family: "bureaucracy",
    method: "values safe passage by listening to what moves beneath the floor",
    flavor: "The cheapest route is usually hungry."
  },
  {
    title: "Spark-Ledger Tender",
    faction: "Last Light Engine",
    lane: "yellow",
    stat: "forge",
    difficulty: 2,
    family: "machine",
    method: "marks every charged device as reactor property and begins disassembly before the ink dries",
    flavor: "Its inventory has only one destination."
  },
  {
    title: "Petal-Debt Courier",
    faction: "Violet Court",
    lane: "yellow",
    stat: "guile",
    difficulty: 2,
    family: "human",
    method: "delivers a perfumed invoice and pockets useful equipment while the recipient reads",
    flavor: "The flowers are real. So is the theft."
  },
  {
    title: "Velvet Clause Runner",
    faction: "Violet Court",
    lane: "yellow",
    stat: "guile",
    difficulty: 3,
    family: "human",
    method: "races between market stalls enforcing the smallest print with a concealed hook",
    flavor: "No one reads quickly enough."
  },
  {
    title: "Cargo-Scrip Fence",
    faction: "Red Maw Raiders",
    lane: "yellow",
    stat: "guile",
    difficulty: 3,
    family: "cartel",
    method: "swaps route permits for forged cargo claims and attacks when either document is questioned",
    flavor: "Every seal is authentic somewhere."
  },
  {
    title: "Shardnest Scrounger",
    faction: "Shardborn Brood",
    lane: "yellow",
    stat: "forge",
    difficulty: 3,
    family: "breachborn",
    method: "builds a glittering nest from stripped mechanisms and defends each stolen spring as an egg",
    flavor: "The nest clicks even when the creature sleeps."
  },
  {
    title: "Hymn-License Clerk",
    faction: "Ashen Choir",
    lane: "yellow",
    stat: "guile",
    difficulty: 3,
    family: "bureaucracy",
    method: "demands proof that every spoken frequency has been approved by the Glass Prophet's registry",
    flavor: "Unlicensed breathing is still a violation."
  },
  {
    title: "Rivet-Quota Keeper",
    faction: "Iron Synod",
    lane: "yellow",
    stat: "forge",
    difficulty: 3,
    family: "bureaucracy",
    method: "counts every worked fastener and claims living hands when the construction quota falls short",
    flavor: "The missing rivet must be replaced with something."
  },
  {
    title: "Pale Receipt Runner",
    faction: "Pallid Retinue",
    lane: "yellow",
    stat: "guile",
    difficulty: 2,
    family: "human",
    method: "slips between travelers stamping possessions as seized before anyone notices the mark",
    flavor: "Ownership changes with a tap of wet ink."
  },
  {
    title: "Tithe-Cart Drover",
    faction: "Pallid Retinue",
    lane: "yellow",
    stat: "forge",
    difficulty: 3,
    family: "human",
    method: "steers a rattling collection cart across the route and sweeps unattended gear into its locked bins",
    flavor: "The cart is never full, only overdue."
  }
];

const rebalance: Record<
  string,
  Partial<{
    difficulty: number;
    severity: number;
    trophyValue: number;
    stat: Stat;
    explicitTrophyAmount: number;
  }>
> = {
  "choir-wraith": { difficulty: 6, severity: 2, trophyValue: 2 },
  "bell-ear-stalker": {
    difficulty: 6,
    severity: 2,
    trophyValue: 2,
    explicitTrophyAmount: 2
  },
  "redglass-stray": { difficulty: 6, severity: 2 },
  "rust-plate-strider": { difficulty: 6, severity: 2 },
  "copperjaw-vermin": { difficulty: 3, severity: 1, trophyValue: 1 },
  "mourning-engine-pup": { difficulty: 3, severity: 1, trophyValue: 1 },
  "crown-bell-baron": {
    difficulty: 3,
    severity: 1,
    trophyValue: 1,
    stat: "guile"
  },
  "lalla-bubu-crownling": { difficulty: 3, severity: 1, trophyValue: 1 },
  "pale-contract-collector": {
    difficulty: 3,
    severity: 1,
    trophyValue: 1,
    explicitTrophyAmount: 1
  },
  "ash-court-duelist": {
    difficulty: 3,
    severity: 1,
    trophyValue: 1,
    explicitTrophyAmount: 1
  },
  "yard-rivet-brute": { difficulty: 3, severity: 1, trophyValue: 1 },
  "shiv-market-crew": { difficulty: 6, severity: 2, trophyValue: 2 },
  "velvet-knife-confessor": { difficulty: 6, severity: 2, trophyValue: 2 },
  "grave-lattice-reclaimer": { difficulty: 6, severity: 2 },
  "bridge-toll-runt": { stat: "guile" },
  "choir-bulwark": { stat: "forge" },
  "gate-tax-collectors": { stat: "guile" },
  "pale-toll-enforcer": { stat: "guile" },
  "relay-pilgrim-riot": { stat: "forge" }
};

const threatsRoot = join(process.cwd(), "content", "cards", "threats");

function idFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function severityForDifficulty(difficulty: number): number {
  if (difficulty <= 3) return 1;
  if (difficulty <= 6) return 2;
  if (difficulty <= 9) return 3;
  if (difficulty <= 10) return 4;
  return 5;
}

function trophyForDifficulty(difficulty: number): number {
  if (difficulty <= 3) return 1;
  if (difficulty <= 5) return 2;
  if (difficulty <= 6) return 3;
  if (difficulty <= 9) return 4;
  if (difficulty <= 10) return 6;
  if (difficulty <= 11) return 7;
  return 8;
}

function rarityForDifficulty(difficulty: number): "common" | "uncommon" | "rare" {
  if (difficulty <= 3) return "common";
  if (difficulty <= 9) return "uncommon";
  return "rare";
}

function tempoForLane(lane: ThreatLane): "stall" | "neutral" | "push" {
  if (lane === "red") return "push";
  if (lane === "blue") return "stall";
  return "neutral";
}

function visualForFamily(family: EnemyFamily): string {
  const visuals: Record<EnemyFamily, string> = {
    human: "layered frontier clothing, battered tools, and a readable human silhouette",
    choir: "ritual signal equipment, ash-dark vestments, and resonant metal ornaments",
    cartel: "improvised market armor, hidden tools, and portable trade marks",
    machine: "industrial joints, patched plating, exposed cables, and work lights",
    beast: "scarred hide, route debris, predatory posture, and a clear animal silhouette",
    vermin: "a dense but readable cluster of small crystalline creatures",
    breachborn: "translucent anatomy, fractured reflections, and asymmetrical glass growth",
    revenant: "preserved metal bindings, worn burial fabric, and pale internal light",
    bureaucracy: "stamps, ledgers, measuring tools, and severe ceremonial clothing"
  };
  return visuals[family];
}

for (const seed of enemySeeds) {
  const id = idFromTitle(seed.title);
  const woundAmount = seed.difficulty >= 10 ? 2 : 1;
  const card = {
    id,
    type: "threat",
    cardType: "enemy",
    faction: seed.faction,
    title: seed.title,
    enemyName: seed.title,
    text: `${seed.title} ${seed.method}. On loss, suffer ${woundAmount} ${
      woundAmount === 1 ? "Wound" : "Wounds"
    }.`,
    flavor: seed.flavor,
    severity: severityForDifficulty(seed.difficulty),
    region: "global",
    stat: seed.stat,
    difficulty: seed.difficulty,
    trophyValue: trophyForDifficulty(seed.difficulty),
    defeatReward: {
      type: "gain_note",
      text: `${seed.title} is defeated and its identifying marks are entered into your Trophy Pile.`
    },
    woundOnLoss: {
      type: "take_wound",
      amount: woundAmount
    },
    enemyFamily: seed.family,
    threatLane: seed.lane,
    resolutionType: "enemy",
    rarity: rarityForDifficulty(seed.difficulty),
    tempo: tempoForLane(seed.lane),
    resourceTags: ["wound", "trophy"],
    imagePrompt: `Original Ashen Reach enemy card art of ${seed.title}: ${seed.method}; ${visualForFamily(
      seed.family
    )}; dark science-fantasy frontier, dramatic lane lighting, full-body readable silhouette, no text`
  };

  writeFileSync(join(threatsRoot, `${id}.json`), `${JSON.stringify(card, null, 2)}\n`, "utf8");
}

for (const [id, changes] of Object.entries(rebalance)) {
  const path = join(threatsRoot, `${id}.json`);
  const card = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown> & {
    defeatReward?: Record<string, unknown>;
  };

  if (changes.difficulty !== undefined) card.difficulty = changes.difficulty;
  if (changes.severity !== undefined) card.severity = changes.severity;
  if (changes.trophyValue !== undefined) card.trophyValue = changes.trophyValue;
  if (changes.stat !== undefined) card.stat = changes.stat;
  if (
    changes.explicitTrophyAmount !== undefined &&
    card.defeatReward?.type === "gain_trophy"
  ) {
    card.defeatReward.amount = changes.explicitTrophyAmount;
  }

  writeFileSync(path, `${JSON.stringify(card, null, 2)}\n`, "utf8");
}

console.log(
  `Generated ${enemySeeds.length} enemy cards and rebalanced ${Object.keys(rebalance).length} existing cards.`
);
