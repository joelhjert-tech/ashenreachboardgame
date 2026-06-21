import type { ImagePromptSpec } from "./imagePrompts.js";
import { sharedNegativePrompt } from "./negativePrompt.js";

const style =
  "original dark gothic science-fantasy board-game art, premium tabletop component, aged blackened metal, worn parchment, blue-white rift glow, cinematic lighting, clear silhouette, readable composition, original symbols only";

export const uiPrompts: ImagePromptSpec[] = [
  {
    id: "ui_tv_board_background",
    fileName: "ui_tv_board_background.png",
    outputPath: "/assets/riftfall/ui/ui_tv_board_background.png",
    assetType: "background",
    size: "wide",
    prompt: `${style}; wide host-screen background, black metal panels, subtle blue rift glow, bronze corners, empty center for board, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "TV host-screen background."
  },
  {
    id: "ui_phone_controller_background",
    fileName: "ui_phone_controller_background.png",
    outputPath: "/assets/riftfall/ui/ui_phone_controller_background.png",
    assetType: "background",
    size: "portrait",
    prompt: `${style}; vertical mobile controller background, dark metal and worn parchment panels, blue glow at top, clear empty control areas, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Phone controller background."
  },
  {
    id: "ui_card_frame_red",
    fileName: "ui_card_frame_red.png",
    outputPath: "/assets/riftfall/ui/ui_card_frame_red.png",
    assetType: "uiFrame",
    size: "card",
    prompt: `${style}; transparent red threat card frame, black metal border, ember-red pressure glow, empty center, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Red threat card frame."
  },
  {
    id: "ui_card_frame_blue",
    fileName: "ui_card_frame_blue.png",
    outputPath: "/assets/riftfall/ui/ui_card_frame_blue.png",
    assetType: "uiFrame",
    size: "card",
    prompt: `${style}; transparent blue threat card frame, black metal border, cold resolve glow, empty center, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Blue threat card frame."
  },
  {
    id: "ui_card_frame_yellow",
    fileName: "ui_card_frame_yellow.png",
    outputPath: "/assets/riftfall/ui/ui_card_frame_yellow.png",
    assetType: "uiFrame",
    size: "card",
    prompt: `${style}; transparent yellow threat card frame, black metal border, yellow stealth glow, empty center, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Yellow threat card frame."
  },
  {
    id: "ui_character_sheet_frame",
    fileName: "ui_character_sheet_frame.png",
    outputPath: "/assets/riftfall/ui/ui_character_sheet_frame.png",
    assetType: "uiFrame",
    size: "wide",
    prompt: `${style}; transparent character-sheet frame with portrait window, ability panel, top progression band, bottom stat row, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Character sheet frame."
  },
  {
    id: "ui_scenario_frame",
    fileName: "ui_scenario_frame.png",
    outputPath: "/assets/riftfall/ui/ui_scenario_frame.png",
    assetType: "uiFrame",
    size: "wide",
    prompt: `${style}; transparent scenario sheet frame with dramatic center art window, confrontation text panel, gold-blue breach framing, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Scenario sheet frame."
  },
  {
    id: "icon_strength",
    fileName: "icon_strength.svg",
    outputPath: "/assets/riftfall/icons/icon_strength.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, cracked blade symbol, red, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Strength icon."
  },
  {
    id: "icon_willpower",
    fileName: "icon_willpower.svg",
    outputPath: "/assets/riftfall/icons/icon_willpower.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, burning eye symbol, blue, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Willpower icon."
  },
  {
    id: "icon_cunning",
    fileName: "icon_cunning.svg",
    outputPath: "/assets/riftfall/icons/icon_cunning.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, broken key symbol, yellow, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Cunning icon."
  },
  {
    id: "icon_life",
    fileName: "icon_life.svg",
    outputPath: "/assets/riftfall/icons/icon_life.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, vital spark symbol, green, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Life icon."
  },
  {
    id: "icon_influence",
    fileName: "icon_influence.svg",
    outputPath: "/assets/riftfall/icons/icon_influence.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, command seal coin symbol, bronze, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Influence icon."
  },
  {
    id: "icon_corruption",
    fileName: "icon_corruption.svg",
    outputPath: "/assets/riftfall/icons/icon_corruption.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, rift scar symbol, violet, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Corruption icon."
  },
  {
    id: "icon_relic",
    fileName: "icon_relic.svg",
    outputPath: "/assets/riftfall/icons/icon_relic.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, saint star symbol, gold, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Relic icon."
  },
  {
    id: "icon_power",
    fileName: "icon_power.svg",
    outputPath: "/assets/riftfall/icons/icon_power.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, charged star symbol, white-blue, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Power icon."
  },
  {
    id: "token_shield",
    fileName: "token_shield.png",
    outputPath: "/assets/riftfall/tokens/token_shield.png",
    assetType: "token",
    size: "icon",
    prompt: "Round board-game token, blue shield field symbol, aged metal rim, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Shield token."
  },
  {
    id: "token_path",
    fileName: "token_path.png",
    outputPath: "/assets/riftfall/tokens/token_path.png",
    assetType: "token",
    size: "icon",
    prompt: "Round board-game token, broken-path symbol, aged metal rim, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Path token."
  },
  {
    id: "token_influence",
    fileName: "token_influence.png",
    outputPath: "/assets/riftfall/tokens/token_influence.png",
    assetType: "token",
    size: "icon",
    prompt: "Round bronze influence coin token, command seal symbol, aged worn metal, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Influence token."
  },
  {
    id: "token_mission_progress",
    fileName: "token_mission_progress.png",
    outputPath: "/assets/riftfall/tokens/token_mission_progress.png",
    assetType: "token",
    size: "icon",
    prompt: "Round mission progress token, parchment and star-map symbol, bronze rim, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Mission progress token."
  }
];
