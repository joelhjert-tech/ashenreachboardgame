export const THREAT_FACTION_NAMES = [
  "The Sealed Deep",
  "Cinder Court",
  "Mirror Wake",
  "Buried Maw",
  "Last Light Engine",
  "Violet Court",
  "Red Maw Raiders",
  "Shardborn Brood",
  "Ashen Choir",
  "Iron Synod",
  "Pallid Retinue",
  "Rift Court"
] as const;

export type ThreatFactionName = (typeof THREAT_FACTION_NAMES)[number];

export const THREAT_FACTION_CARD_QUOTA = {
  enemy: 6,
  hazard: 4
} as const;

export interface ThreatFactionDefinition {
  id: string;
  name: ThreatFactionName;
  nemesisId: string;
  background: string;
  purpose: string;
  enemyDoctrine: string;
  hazardDoctrine: string;
}

export const threatFactionDefinitions: ThreatFactionDefinition[] = [
  {
    id: "sealed-deep",
    name: "The Sealed Deep",
    nemesisId: "nemesis_unnamed_prisoner",
    background:
      "The Sealed Deep is not a nation but the ecology of an ancient prison: ward-engines, failed custodians, revenants, and escaped fragments all answering the same buried intelligence.",
    purpose:
      "Break the remaining seals, recover pieces of the Prisoner's unfinished body, and turn every opened route into another path out of confinement.",
    enemyDoctrine:
      "Wardens pin intruders in place while riveted revenants and reclaimers recover bodies, tools, and memories for the prison below.",
    hazardDoctrine:
      "Backlashes, lock pulses, buried weapons, and crushing grave-silt make trespass itself feel like an attack by the prison."
  },
  {
    id: "cinder-court",
    name: "Cinder Court",
    nemesisId: "nemesis_ash_regent",
    background:
      "The Cinder Court survives the death of its dynasty as etiquette embedded in furnace halls, ash-blooded retainers, and a throne that still hungers for claimants.",
    purpose:
      "Restore the Empty Throne's authority by forcing every traveler to kneel, challenge, or become fuel for a new sovereign.",
    enemyDoctrine:
      "Duelists establish ritual dominance while cinder beasts, marauders, and veiled hunters punish anyone who refuses the old forms.",
    hazardDoctrine:
      "The Court weaponizes failing furnaces, ancestral echoes, and ceremonial ash storms to make ruined territory behave like a royal chamber."
  },
  {
    id: "mirror-wake",
    name: "Mirror Wake",
    nemesisId: "nemesis_false_hero",
    background:
      "The Mirror Wake is the trail left when the Reach copies a person, a road, or a decision imperfectly and lets the reflection continue without its original.",
    purpose:
      "Replace uncertain history with obedient copies until the false expedition is accepted as the only one that ever existed.",
    enemyDoctrine:
      "Envoys, doubles, masked pilgrims, and identity thieves study a target before returning its strengths in a more useful and hostile shape.",
    hazardDoctrine:
      "Reflected routes, glass prisons, and copied landmarks separate operatives from reliable memory and make the map argue with itself."
  },
  {
    id: "buried-maw",
    name: "Buried Maw",
    nemesisId: "nemesis_devourer_beneath",
    background:
      "The Buried Maw includes the Devourer's sensory beasts, tunnel vermin, and surface scavengers who have learned to live from whatever the route-eater leaves behind.",
    purpose:
      "Feed the Devourer enough roads, structures, and remembered directions that the lower dark becomes the only geography left.",
    enemyDoctrine:
      "Gnawers attack infrastructure first, while stalkers and toll scavengers drive living prey toward ground already hollowed for consumption.",
    hazardDoctrine:
      "Sinkholes, salt sickness, leech nests, and sudden lattice mouths soften a route before the Devourer rises beneath it."
  },
  {
    id: "last-light-engine",
    name: "Last Light Engine",
    nemesisId: "nemesis_dying_star_core",
    background:
      "The Last Light Engine is a failed artificial sun surrounded by maintenance machines that have mistaken survival for an endless ignition procedure.",
    purpose:
      "Restart the star at any cost by harvesting charge, heat, metal, and living nervous systems as replacement reactor components.",
    enemyDoctrine:
      "Drones isolate useful machinery, repair-striders dismantle resistance, and mourning engines carry salvaged parts back toward the starving core.",
    hazardDoctrine:
      "Overloaded lenses, relay ghosts, and loose ignition machinery convert ordinary infrastructure into extensions of the reactor."
  },
  {
    id: "violet-court",
    name: "Violet Court",
    nemesisId: "nemesis_fary_lord",
    background:
      "The Violet Court grows wherever a beautiful shortcut conceals an obligation. Its nobles recruit from masked confessors, market crews, scavenger gangs, and broken choirs.",
    purpose:
      "Bind every useful route into a courtly bargain until movement, names, and safe passage exist only by the monarch's permission.",
    enemyDoctrine:
      "Crownlings and confessors offer terms while disguised blades and debt crews enforce clauses that were never spoken aloud.",
    hazardDoctrine:
      "Thorn weather, prophetic traps, and impossible tolls turn curiosity and haste into consent."
  },
  {
    id: "red-maw-raiders",
    name: "Red Maw Raiders",
    nemesisId: "nemesis_kharvox_red_maw",
    background:
      "The Red Maw Raiders are a moving confederation of boarding crews, lane cutters, salvagers, and warbell batteries held together by Kharvox's victories.",
    purpose:
      "Control freight and pilgrimage corridors, convert captured cargo into mobile fortresses, and make fear of the Red Maw arrive before the fleet.",
    enemyDoctrine:
      "Fast cutters close escape routes, kennelmasters hunt survivors, and heavy raiders turn every stalled convoy into a public arena.",
    hazardDoctrine:
      "Demolition charges, false barricades, collapsing masts, and bait vermin prepare a lane for boarding before the raiders appear."
  },
  {
    id: "shardborn-brood",
    name: "Shardborn Brood",
    nemesisId: "nemesis_specimen_null_x",
    background:
      "The Shardborn Brood is a distributed colony memory descended from escaped specimens, breach-grown vermin, and hosts carrying glasslike nursery organs.",
    purpose:
      "Seed every region with adaptable brood matter, absorb the defenses used against it, and rebuild Null-X as a body the Reach cannot contain.",
    enemyDoctrine:
      "Small organisms scout and record resistance before larger hosts and shardvine hunters reproduce the successful pattern.",
    hazardDoctrine:
      "Hatchfalls, glass swarms, and dormant infestations transform apparently empty terrain into the Brood's next organ."
  },
  {
    id: "ashen-choir",
    name: "Ashen Choir",
    nemesisId: "nemesis_glass_prophet",
    background:
      "The Ashen Choir is a schismatic signal faith that hears one perfect cadence beneath the Reach and treats every competing pulse as blasphemy.",
    purpose:
      "Silence unsanctioned signals, seize relay shrines, and force the frontier to speak only the Glass Prophet's version of the future.",
    enemyDoctrine:
      "Acolytes identify forbidden rhythms, bulwarks hold the congregation line, and executioners remove anyone who cannot be brought into tune.",
    hazardDoctrine:
      "Static hymns, sanctifier traps, and silenced chapels make communication itself a test of doctrinal purity."
  },
  {
    id: "iron-synod",
    name: "Iron Synod",
    nemesisId: "nemesis_iron_saint_malrec",
    background:
      "The Iron Synod preserves testimony by welding flesh, memory, and machinery into serviceable saints that can never retract what they witnessed.",
    purpose:
      "Recover sacred machines, conscript useful bodies, and build an immortal record of the Reach under Malrec's sole interpretation.",
    enemyDoctrine:
      "Hunters acquire subjects, chirurgeons convert them, and welded yard crews keep the resulting war congregation in motion.",
    hazardDoctrine:
      "Survey vaults, cable snares, sealed workshops, and predatory keys classify trespassers as components awaiting installation."
  },
  {
    id: "pallid-retinue",
    name: "Pallid Retinue",
    nemesisId: "nemesis_pallid_curator",
    background:
      "The Pallid Retinue is an ancient tribute bureaucracy of bailiffs, marshals, ledger beasts, and compromised collectors serving the Grinning Tithe.",
    purpose:
      "Inventory every life, memory, and possession near the Cinder Gate, then seize whatever the Curator's ledger declares overdue.",
    enemyDoctrine:
      "Collectors manufacture debt, marshals prevent escape, and tithe beasts repossess anything that cannot produce an acceptable receipt.",
    hazardDoctrine:
      "Living audits, memory taxes, and starless offices make the Retinue's paperwork as dangerous as its enforcers."
  },
  {
    id: "rift-court",
    name: "Rift Court",
    nemesisId: "nemesis_hollow_regent",
    background:
      "The Rift Court is a ceremonial administration grown around the breach core, staffed by judges, gate claimants, and route custodians serving dead rulers through a living shell.",
    purpose:
      "Keep the Core Court functioning, subordinate every gate to its decrees, and prevent any expedition from ending the system that grants the Regent authority.",
    enemyDoctrine:
      "Judicators define the offense, claim-jackers seize the route, and bridge or gate officers make movement contingent on recognition of the Court.",
    hazardDoctrine:
      "Folded courtlines, route splices, whispers, and static boundaries rewrite where the Court begins until trespass becomes unavoidable."
  }
];

export const threatFactionByName = new Map(
  threatFactionDefinitions.map((faction) => [faction.name, faction] as const)
);
