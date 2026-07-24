import type { ImagePromptSpec } from "./imagePrompts.js";

const sharedPrompt = [
  "Original Ashenreach player movement piece for the cinematic Signal Theatre TV host.",
  "Premium grimdark industrial 2.5D render; ancient blackened iron, worn pale edges, bone-ceramic inserts, restrained cyan signal glow.",
  "Single centered chess-marker object, front three-quarter view, full silhouette visible, broad stepped base, circular portrait aperture.",
  "Perfectly flat solid green chroma-key background, crisp separated edges, no cast shadow."
].join(" ");

const negativePrompt = [
  "No character artwork, face, player colour, text, letters, numbers, logo, watermark, toy-like plastic, glossy modern pawn, external franchise iconography, floor, reflection, or background texture."
].join(" ");

const pieces = [
  ["beacon", "Beacon", "tall tapered body and split two-prong signal crown"],
  ["bastion", "Bastion", "short broad fortress body, squared shoulder fins, low battlement crown"],
  ["lantern", "Lantern", "compact ribbed body, luminous signal cage, broken halo crown"],
  ["harrow", "Harrow", "lean angular body and asymmetrical forked blade crown"],
  ["reliquary", "Reliquary", "heavy shrine-like body and broad split-shield crown"],
  ["compass", "Compass", "compact navigation body and four-point broken compass crown"]
] as const;

export const signalPiecePrompts: ImagePromptSpec[] = pieces.map(([id, name, silhouette]) => ({
  id: `signal-piece-${id}`,
  fileName: `${id}.png`,
  outputPath: `/assets/riftfall/ui/signal-theatre/player-pieces/${id}.png`,
  assetType: "token",
  size: "square",
  prompt: `${sharedPrompt} ${name}: ${silhouette}.`,
  negativePrompt,
  usage: `${name} selectable public player marker and authoritative movement presentation`,
  priority: 1,
  releaseRequired: true,
  placeholderAllowed: false
}));
