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
    id: "icon_grit",
    fileName: "icon_grit.svg",
    outputPath: "/assets/riftfall/icons/icon_grit.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, cracked blade symbol, red, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Grit icon."
  },
  {
    id: "icon_signal",
    fileName: "icon_signal.svg",
    outputPath: "/assets/riftfall/icons/icon_signal.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, burning eye symbol, blue, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Signal icon."
  },
  {
    id: "icon_guile",
    fileName: "icon_guile.svg",
    outputPath: "/assets/riftfall/icons/icon_guile.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, broken key symbol, yellow, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Guile icon."
  },
  {
    id: "icon_wounds",
    fileName: "icon_wounds.svg",
    outputPath: "/assets/riftfall/icons/icon_wounds.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, vital spark symbol, green, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Wounds icon."
  },
  {
    id: "icon_trophy",
    fileName: "icon_trophy.svg",
    outputPath: "/assets/riftfall/icons/icon_trophy.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, command seal coin symbol, bronze, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Trophy icon."
  },
  {
    id: "icon_heat",
    fileName: "icon_heat.svg",
    outputPath: "/assets/riftfall/icons/icon_heat.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, rift scar symbol, violet, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Heat icon."
  },
  {
    id: "icon_artifact",
    fileName: "icon_artifact.svg",
    outputPath: "/assets/riftfall/icons/icon_artifact.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, saint star symbol, gold, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Artifact icon."
  },
  {
    id: "icon_route_note",
    fileName: "icon_route_note.svg",
    outputPath: "/assets/riftfall/icons/icon_route_note.svg",
    assetType: "icon",
    size: "icon",
    prompt: "Simple original game icon, charged star symbol, white-blue, readable at small size, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Route note icon."
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
    id: "token_trophy",
    fileName: "token_trophy.png",
    outputPath: "/assets/riftfall/tokens/token_trophy.png",
    assetType: "token",
    size: "icon",
    prompt: "Round bronze trophy coin token, command seal symbol, aged worn metal, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Trophy token."
  },
  {
    id: "token_contract_progress",
    fileName: "token_contract_progress.png",
    outputPath: "/assets/riftfall/tokens/token_contract_progress.png",
    assetType: "token",
    size: "icon",
    prompt: "Round contract progress token, parchment and star-map symbol, bronze rim, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Contract progress token."
  }
];
