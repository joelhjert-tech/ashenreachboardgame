import { loadCharacters } from "../../content/characters.js";
import { nemeses } from "../../data/nemeses.js";
import type { ImagePromptSpec } from "./imagePrompts.js";
import { sharedNegativePrompt } from "./negativePrompt.js";

const style =
  "original dark gothic science-fantasy board-game art, premium tabletop component, aged blackened metal, worn parchment, blue-white rift glow, cinematic lighting, clear silhouette, readable composition, original symbols only";

export const characterPortraitPrompts: ImagePromptSpec[] = [
  ...Array.from(loadCharacters().values()).filter((character) => !character.qaOnly).map((character) => ({
    id: `portrait_${character.id}`,
    fileName: `${character.id}.png`,
    outputPath: `/assets/riftfall/characters/${character.id}.png`,
    assetType: "characterPortrait" as const,
    size: "portrait" as const,
    prompt: `${style}; original ${character.archetype} operative named ${character.name}; ${character.lore ?? "a hardened expedition survivor of the Ashen Reach"}; waist-up character portrait, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: `${character.name}, ${character.archetype}, character-sheet portrait.`
  })),
  ...nemeses.map((nemesis) => ({
    id: `portrait_${nemesis.id}`,
    fileName: `${nemesis.id}.png`,
    outputPath: `/assets/riftfall/nemeses/${nemesis.id}.png`,
    assetType: "nemesisPortrait" as const,
    size: "portrait" as const,
    prompt: `${style}; ${nemesis.imagePrompt}`,
    negativePrompt: sharedNegativePrompt,
    usage: `${nemesis.title} nemesis-sheet portrait.`
  }))
];
