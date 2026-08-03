import type { ImagePromptSpec } from "./imagePrompts.js";

const negativePrompt = [
  "No words, letters, numbers, logos, characters, hands, cards, franchise iconography, watermark, interface controls, green inside the prop, grain, muddy shadows, or modern clean science-fiction surfaces."
].join(" ");

export const trophyUpgradeAnimationPrompts: ImagePromptSpec[] = [
  {
    id: "signal-theatre-trophy-upgrade-crt",
    fileName: "trophy-upgrade-crt.png",
    outputPath: "/assets/riftfall/ui/signal-theatre/trophy-upgrade/trophy-upgrade-crt.png",
    assetType: "uiFrame",
    size: "wide",
    prompt: [
      "Original Ashen Reach front-facing retro-industrial CRT chassis isolated for transparent compositing.",
      "Blackened iron, scorched brass corner clamps, pale ceramic insulators, analog tuning wheels, crisp 4:3 empty screen aperture, and compact retractable pedestal.",
      "Bright clean midtone product lighting, crisp edges, restrained wear, generous padding, and a perfectly flat chroma-key background for local removal."
    ].join(" "),
    negativePrompt,
    usage: "Signal Theatre permanent-stat upgrade summon and flip chassis",
    priority: 1,
    releaseRequired: true,
    placeholderAllowed: false
  },
  {
    id: "signal-theatre-trophy-ledger-furnace",
    fileName: "trophy-ledger-furnace.png",
    outputPath: "/assets/riftfall/ui/signal-theatre/trophy-upgrade/trophy-ledger-furnace.png",
    assetType: "uiFrame",
    size: "wide",
    prompt: [
      "Original Ashen Reach front-facing compact ledger-furnace intake isolated for transparent compositing.",
      "Blackened iron housing, scorched brass accounting rails, pale ceramic insulators, two card-feed rollers, a wide horizontal intake, contained amber ember aperture, and ash catch.",
      "Bright clean midtone product lighting, crisp edges, restrained wear, generous padding, and a perfectly flat chroma-key background for local removal."
    ].join(" "),
    negativePrompt,
    usage: "Signal Theatre trophy receipt display, burn, and ash-dissolve phase",
    priority: 1,
    releaseRequired: true,
    placeholderAllowed: false
  }
];
