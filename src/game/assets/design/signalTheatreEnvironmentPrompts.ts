import { BOARD_SPACES } from "../../data/boardSpaces.js";
import type { ImagePromptSpec } from "./imagePrompts.js";

const tierDirection = {
  outer: "exposed frontier architecture, broad horizon, ember-amber practical light and cold steel-blue rim light",
  middle: "dense black-iron war architecture, enclosed danger, restrained red and cyan signal light",
  inner: "spectral violet and bone-white light, ancient relic machinery, increasingly impossible geometry",
  center: "climactic black-violet core chamber, stark red-white signal light, monumental final convergence"
} as const;

export const signalTheatreEnvironmentPrompts: ImagePromptSpec[] = BOARD_SPACES.map((sector) => ({
  id: `signal-theatre-sector-${sector.id}`,
  fileName: `${sector.id}.png`,
  outputPath: `/assets/riftfall/environments/signal-theatre/sectors/${sector.id}.png`,
  assetType: "background",
  size: "wide",
  prompt: [
    `Original Ashenreach cinematic environment for ${sector.name}.`,
    sector.loreText,
    tierDirection[sector.tier],
    "Wide 16:9 television composition with a broad, clear foreground landing dais for overlaid operative pieces.",
    "Keep important scene detail away from the lower-center piece zone and preserve dark quiet corners for public UI copy.",
    "Environment only; monumental industrial relic architecture; no figures and no board-game tile framing."
  ].join(" "),
  negativePrompt: [
    "characters",
    "people",
    "faces",
    "miniatures",
    "creatures",
    "board tiles",
    "board-game layout",
    "text",
    "letters",
    "numbers",
    "icons",
    "logo",
    "watermark",
    "known franchise imagery"
  ].join(", "),
  usage: `Signal Theatre active-sector background for ${sector.name}.`,
  priority: sector.tier === "center" ? 1 : sector.tier === "inner" ? 2 : sector.tier === "middle" ? 3 : 4,
  releaseRequired: true,
  placeholderAllowed: false
}));
