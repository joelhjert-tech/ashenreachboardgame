import { BOARD_SPACES, type BoardTier } from "../../../game/data/boardSpaces.js";
import { nemeses } from "../../../game/data/nemeses.js";
import { SCENARIOS } from "../../../game/data/scenarios.js";
import {
  THREAT_FACTION_NAMES,
  threatFactionDefinitions,
  type ThreatFactionName
} from "../../../game/data/threatFactions.js";
import {
  getCardArtPath,
  getCharacterPortraitPathOrNull,
  getNemesisPortraitPath
} from "../../shared/assetPaths.js";
import { getScenarioSheetArtPath } from "../../../game/data/scenarioSheetArt.js";

export type AdminLoreCategory = "faction" | "nemesis" | "operative" | "sector" | "scenario" | "event";

interface AdminLoreEntryBase {
  key: string;
  id: string;
  kind: AdminLoreCategory;
  title: string;
  subtitle: string;
  sourcePath: string;
  imageUrl?: string;
  searchText: string;
}

export interface AdminLoreThreatReference {
  id: string;
  title: string;
  cardType: "enemy" | "hazard";
  lane?: "red" | "blue" | "yellow";
}

export interface AdminLoreFactionEntry extends AdminLoreEntryBase {
  kind: "faction";
  name: ThreatFactionName;
  background: string;
  purpose: string;
  enemyDoctrine: string;
  hazardDoctrine: string;
  nemesisKey: string;
  nemesisName: string;
  scenarioKey?: string;
  threats: AdminLoreThreatReference[];
}

export interface AdminLoreNemesisEntry extends AdminLoreEntryBase {
  kind: "nemesis";
  factionName: ThreatFactionName;
  factionKey: string;
  scenarioKey?: string;
  loreRole: string;
  bounty: string;
  gameplayRole: string;
  linkedMechanic: string;
  abilities: Array<{ timing: string; text: string }>;
}

export interface AdminLoreOperativeEntry extends AdminLoreEntryBase {
  kind: "operative";
  archetype: string;
  lore: string;
  startingSpaceKey?: string;
  startingSpaceName?: string;
}

export interface AdminLoreSectorEntry extends AdminLoreEntryBase {
  kind: "sector";
  tier: BoardTier;
  index: number;
  loreText: string;
  ruleText: string;
  tags: string[];
}

export interface AdminLoreScenarioEntry extends AdminLoreEntryBase {
  kind: "scenario";
  theme: string;
  designFeel: string;
  publicObjective: string;
  confrontationTitle: string;
  confrontationText: string;
  victoryText: string;
  supportedModes: string[];
  nemesisKey?: string;
  nemesisName?: string;
}

export interface AdminLoreEventEntry extends AdminLoreEntryBase {
  kind: "event";
  eventText: string;
  flavor: string;
  step: number;
  resolutionSummary: string;
  escalationDelta: number;
}

export type AdminLoreEntry =
  | AdminLoreFactionEntry
  | AdminLoreNemesisEntry
  | AdminLoreOperativeEntry
  | AdminLoreSectorEntry
  | AdminLoreScenarioEntry
  | AdminLoreEventEntry;

interface AuthoredThreatLoreRecord {
  id?: string;
  title?: string;
  enemyName?: string;
  cardType?: string;
  faction?: string;
  threatLane?: string;
}

interface AuthoredOperativeLoreRecord {
  id?: string;
  name?: string;
  archetype?: string;
  lore?: string;
  currentSpaceId?: string;
  qaOnly?: boolean;
}

interface AuthoredEventLoreRecord {
  id?: string;
  type?: string;
  title?: string;
  text?: string;
  flavor?: string;
  step?: number;
  resolutionSummary?: string;
  escalationDelta?: number;
}

const authoredThreatModules = import.meta.glob(
  "../../../../content/cards/threats/*.json",
  { eager: true, import: "default" }
) as Record<string, AuthoredThreatLoreRecord>;

const authoredOperativeModules = import.meta.glob(
  "../../../../content/characters/*.json",
  { eager: true, import: "default" }
) as Record<string, AuthoredOperativeLoreRecord>;

const authoredEventModules = import.meta.glob(
  "../../../../content/cards/escalations/*.json",
  { eager: true, import: "default" }
) as Record<string, AuthoredEventLoreRecord>;

const tierOrder: Record<BoardTier, number> = {
  outer: 0,
  middle: 1,
  inner: 2,
  center: 3
};

function normalizeContentPath(sourcePath: string): string {
  return sourcePath.replace(/\\/g, "/").replace(/^.*?content\//, "content/");
}

function makeSearchText(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function isThreatFactionName(value: string | undefined): value is ThreatFactionName {
  return Boolean(value) && THREAT_FACTION_NAMES.includes(value as ThreatFactionName);
}

const threatReferences = Object.values(authoredThreatModules)
  .filter((record): record is AuthoredThreatLoreRecord & {
    id: string;
    cardType: "enemy" | "hazard";
    faction: ThreatFactionName;
  } => Boolean(
    record.id
    && (record.cardType === "enemy" || record.cardType === "hazard")
    && isThreatFactionName(record.faction)
  ))
  .map((record): AdminLoreThreatReference & { faction: ThreatFactionName } => ({
    id: record.id,
    title: record.title ?? record.enemyName ?? record.id,
    cardType: record.cardType,
    faction: record.faction,
    lane: record.threatLane === "red" || record.threatLane === "blue" || record.threatLane === "yellow"
      ? record.threatLane
      : undefined
  }));

const scenarioById = new Map(SCENARIOS.map((scenario) => [scenario.id, scenario] as const));
const nemesisById = new Map(nemeses.map((nemesis) => [nemesis.id, nemesis] as const));
const nemesisByName = new Map(nemeses.map((nemesis) => [nemesis.name, nemesis] as const));
const sectorById = new Map(BOARD_SPACES.map((space) => [space.id, space] as const));

export const adminLoreFactionEntries: AdminLoreFactionEntry[] = threatFactionDefinitions.map((faction) => {
  const nemesis = nemesisById.get(faction.nemesisId);
  const scenario = nemesis?.scenarioId ? scenarioById.get(nemesis.scenarioId) : undefined;
  const threats = threatReferences
    .filter((threat) => threat.faction === faction.name)
    .sort((a, b) => a.cardType.localeCompare(b.cardType) || a.title.localeCompare(b.title));

  return {
    key: `faction:${faction.id}`,
    id: faction.id,
    kind: "faction",
    title: faction.name,
    name: faction.name,
    subtitle: `${nemesis?.name ?? "Unlinked nemesis"} · ${threats.filter((threat) => threat.cardType === "enemy").length} enemies · ${threats.filter((threat) => threat.cardType === "hazard").length} hazards`,
    sourcePath: `src/game/data/threatFactions.ts#${faction.id}`,
    imageUrl: nemesis ? getNemesisPortraitPath(nemesis.id) : undefined,
    background: faction.background,
    purpose: faction.purpose,
    enemyDoctrine: faction.enemyDoctrine,
    hazardDoctrine: faction.hazardDoctrine,
    nemesisKey: `nemesis:${faction.nemesisId}`,
    nemesisName: nemesis?.name ?? faction.nemesisId,
    scenarioKey: scenario ? `scenario:${scenario.id}` : undefined,
    threats,
    searchText: makeSearchText(
      faction.name,
      faction.background,
      faction.purpose,
      faction.enemyDoctrine,
      faction.hazardDoctrine,
      nemesis?.name,
      ...threats.map((threat) => threat.title)
    )
  };
});

export const adminLoreNemesisEntries: AdminLoreNemesisEntry[] = nemeses
  .map((nemesis) => ({
    key: `nemesis:${nemesis.id}`,
    id: nemesis.id,
    kind: "nemesis" as const,
    title: nemesis.name,
    subtitle: nemesis.title,
    sourcePath: `src/game/data/nemeses.ts#${nemesis.id}`,
    imageUrl: getNemesisPortraitPath(nemesis.id),
    factionName: nemesis.faction,
    factionKey: `faction:${threatFactionDefinitions.find((faction) => faction.name === nemesis.faction)?.id ?? nemesis.faction}`,
    scenarioKey: nemesis.scenarioId ? `scenario:${nemesis.scenarioId}` : undefined,
    loreRole: nemesis.loreRole,
    bounty: nemesis.bounty,
    gameplayRole: nemesis.gameplayRole,
    linkedMechanic: nemesis.linkedMechanic,
    abilities: nemesis.abilities.map((ability) => ({ ...ability })),
    searchText: makeSearchText(
      nemesis.name,
      nemesis.title,
      nemesis.faction,
      nemesis.loreRole,
      nemesis.bounty,
      nemesis.linkedMechanic
    )
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

export const adminLoreOperativeEntries: AdminLoreOperativeEntry[] = Object.entries(authoredOperativeModules)
  .filter(([, operative]) => !operative.qaOnly && operative.id && operative.name && operative.archetype && operative.lore)
  .map(([sourcePath, operative]) => {
    const startingSpace = operative.currentSpaceId ? sectorById.get(operative.currentSpaceId) : undefined;
    return {
      key: `operative:${operative.id!}`,
      id: operative.id!,
      kind: "operative" as const,
      title: operative.name!,
      subtitle: operative.archetype!,
      sourcePath: normalizeContentPath(sourcePath),
      imageUrl: getCharacterPortraitPathOrNull(operative.id!) ?? undefined,
      archetype: operative.archetype!,
      lore: operative.lore!,
      startingSpaceKey: startingSpace ? `sector:${startingSpace.id}` : undefined,
      startingSpaceName: startingSpace?.name,
      searchText: makeSearchText(
        operative.name,
        operative.archetype,
        operative.lore,
        startingSpace?.name
      )
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

export const adminLoreSectorEntries: AdminLoreSectorEntry[] = BOARD_SPACES
  .map((space) => ({
    key: `sector:${space.id}`,
    id: space.id,
    kind: "sector" as const,
    title: space.name,
    subtitle: `${space.tier} reach · route ${space.index + 1}`,
    sourcePath: `src/game/data/boardSpaces.ts#${space.id}`,
    tier: space.tier,
    index: space.index,
    loreText: space.loreText,
    ruleText: space.ruleText,
    tags: [...space.tags],
    searchText: makeSearchText(
      space.name,
      space.tier,
      space.loreText,
      space.ruleText,
      ...space.tags
    )
  }))
  .sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || a.index - b.index);

export const adminLoreScenarioEntries: AdminLoreScenarioEntry[] = [...SCENARIOS]
  .sort((a, b) => a.recommendedRolloutOrder - b.recommendedRolloutOrder)
  .map((scenario) => {
    const nemesis = scenario.nemesis ? nemesisByName.get(scenario.nemesis) : undefined;
    return {
      key: `scenario:${scenario.id}`,
      id: scenario.id,
      kind: "scenario" as const,
      title: scenario.name,
      subtitle: `${scenario.publicDisplay.modeLabel} · ${scenario.difficulty}`,
      sourcePath: `src/game/data/scenarios.ts#${scenario.id}`,
      imageUrl: getScenarioSheetArtPath(scenario) ?? undefined,
      theme: scenario.theme,
      designFeel: scenario.designFeel,
      publicObjective: scenario.publicDisplay.objective,
      confrontationTitle: scenario.confrontationTitle,
      confrontationText: scenario.confrontationText,
      victoryText: scenario.victoryText,
      supportedModes: [...scenario.supportedModes],
      nemesisKey: nemesis ? `nemesis:${nemesis.id}` : undefined,
      nemesisName: nemesis?.name ?? scenario.nemesis,
      searchText: makeSearchText(
        scenario.name,
        scenario.theme,
        scenario.designFeel,
        scenario.publicDisplay.objective,
        scenario.confrontationTitle,
        scenario.confrontationText,
        scenario.victoryText,
        nemesis?.name
      )
    };
  });

export const adminLoreEventEntries: AdminLoreEventEntry[] = Object.entries(authoredEventModules)
  .filter(([, event]) => (
    event.type === "escalation"
    && Boolean(event.id)
    && Boolean(event.title)
    && Boolean(event.text)
    && Boolean(event.flavor)
    && typeof event.step === "number"
    && Boolean(event.resolutionSummary)
    && typeof event.escalationDelta === "number"
  ))
  .map(([sourcePath, event]) => ({
    key: `event:${event.id!}`,
    id: event.id!,
    kind: "event" as const,
    title: event.title!,
    subtitle: `escalation step ${event.step!} · pressure ${event.escalationDelta! > 0 ? "+" : ""}${event.escalationDelta!}`,
    sourcePath: normalizeContentPath(sourcePath),
    imageUrl: getCardArtPath("escalation", event.id!),
    eventText: event.text!,
    flavor: event.flavor!,
    step: event.step!,
    resolutionSummary: event.resolutionSummary!,
    escalationDelta: event.escalationDelta!,
    searchText: makeSearchText(
      event.title,
      event.text,
      event.flavor,
      event.resolutionSummary,
      `step ${event.step}`,
      `pressure ${event.escalationDelta}`
    )
  }))
  .sort((a, b) => a.step - b.step || a.title.localeCompare(b.title));

export const adminLoreEntries: AdminLoreEntry[] = [
  ...adminLoreFactionEntries,
  ...adminLoreNemesisEntries,
  ...adminLoreOperativeEntries,
  ...adminLoreSectorEntries,
  ...adminLoreScenarioEntries,
  ...adminLoreEventEntries
];

export const adminLoreEntryByKey = new Map(
  adminLoreEntries.map((entry) => [entry.key, entry] as const)
);

export const adminLoreCounts = {
  factions: adminLoreFactionEntries.length,
  nemeses: adminLoreNemesisEntries.length,
  operatives: adminLoreOperativeEntries.length,
  sectors: adminLoreSectorEntries.length,
  scenarios: adminLoreScenarioEntries.length,
  events: adminLoreEventEntries.length
} as const;
