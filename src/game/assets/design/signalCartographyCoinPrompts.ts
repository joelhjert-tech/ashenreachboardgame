import {
  CARTOGRAPHY_OBJECTIVE_COIN_IDS,
  getCartographyObjectiveCoinPath,
  getCartographyPlayerCoinPath
} from "../../../shared/cartographyCoinCatalog.js";
import {
  SIGNAL_PIECE_IDS,
  type SignalPieceId
} from "../../../shared/signalPieceCatalog.js";
import type { ImagePromptSpec } from "./imagePrompts.js";

const playerSubjects: Record<SignalPieceId, string> = {
  beacon: "split two-prong signal crown surrounding one round relay lens",
  bastion: "broad fortress shield with squared shoulder fins and a low three-notch battlement crown",
  lantern: "compact ribbed signal lantern enclosed by a broken circular halo cage",
  harrow: "lean asymmetrical forked navigation blade shaped like a hooked survey needle",
  reliquary: "heavy shrine-shaped split shield enclosing a small faceted sealed casket",
  compass: "four-point broken navigation compass with one long north needle and a circular relay bearing"
};

const objectiveSubjects: Record<
  typeof CARTOGRAPHY_OBJECTIVE_COIN_IDS[number],
  string
> = {
  route: "three relay nodes connected by straight angular segments ending at a faceted destination diamond",
  challenge: "faceted test diamond with a relay lens enclosed by three broken calibration arcs",
  hunt: "broken targeting aperture closing around one angular hostile-threat shard",
  service: "two interlocking industrial ledger cogs around a sealed trade token"
};

const sharedNegativePrompt = [
  "No text, letters, numbers, skulls, faces, logos, watermark, modern currency symbols, weapons,",
  "external franchise iconography, cast shadow, floor, or background scenery."
].join(" ");

export const signalCartographyCoinPrompts: ImagePromptSpec[] = [
  ...SIGNAL_PIECE_IDS.map((id): ImagePromptSpec => ({
    id: `signal-cartography-player-coin-${id}`,
    fileName: `${id}.png`,
    outputPath: getCartographyPlayerCoinPath(id),
    assetType: "token",
    size: "icon",
    prompt: [
      "Original Ashen Reach public player coin for the Signal Cartography TV board.",
      "One circular heavy coin, front-on orthographic view, blackened iron rim, worn bone-ceramic inlay, restrained pale cyan signal seams.",
      `Central emblem: ${playerSubjects[id]}.`,
      "Bold silhouette readable at 24 pixels; transparent background; no shadow outside the coin."
    ].join(" "),
    negativePrompt: sharedNegativePrompt,
    usage: `${id} public player identity coin on Signal Cartography tiles`,
    priority: 1,
    releaseRequired: true,
    placeholderAllowed: false
  })),
  ...CARTOGRAPHY_OBJECTIVE_COIN_IDS.map((id): ImagePromptSpec => ({
    id: `signal-cartography-objective-coin-${id}`,
    fileName: `${id}.png`,
    outputPath: getCartographyObjectiveCoinPath(id),
    assetType: "token",
    size: "icon",
    prompt: [
      "Original Ashen Reach public mission-objective coin for the Signal Cartography TV board.",
      "One circular heavy coin, front-on orthographic view, antique brass rim, blackened iron face, worn bone-ceramic detail, restrained emerald signal enamel.",
      `Central emblem: ${objectiveSubjects[id]}.`,
      "Bold silhouette readable at 24 pixels; transparent background; no shadow outside the coin."
    ].join(" "),
    negativePrompt: sharedNegativePrompt,
    usage: `${id} public mission objective coin on Signal Cartography tiles`,
    priority: 1,
    releaseRequired: true,
    placeholderAllowed: false
  }))
];
