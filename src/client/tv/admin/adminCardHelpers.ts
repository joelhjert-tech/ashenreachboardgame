import type { AdminLibraryCard } from "./adminLibraryRegistry.js";

export function buildAdminCodexContext(card: AdminLibraryCard): Record<string, unknown> {
  return {
    schemaVersion: 1,
    entity: {
      id: card.id,
      name: card.name,
      family: card.cardType,
      status: card.status,
      sourcePath: card.dataSourcePath,
      artworkPath: card.artworkPath ?? null
    },
    gameplay: {
      difficulty: card.difficulty ?? null,
      skills: card.skills,
      encounterType: card.encounterType ?? null,
      rulesText: card.rulesText ?? null,
      reward: card.reward ?? null,
      penalty: card.penalty ?? null,
      effects: card.effects
    },
    lifecycle: card.lifecycle ?? null,
    relationships: {
      mapTileIds: card.mapTileIds,
      relatedIds: card.relatedIds
    },
    audit: {
      warnings: card.metadataWarnings,
      tests: card.testFiles
    }
  };
}

export function isCardSimulatable(card: AdminLibraryCard): boolean {
  if (card.cardType === "threat" || card.cardType === "tile challenge" || ["anomaly", "scar", "escalation", "artifact"].includes(card.cardType)) return true;
  return /"type"\s*:\s*"(?:take_wound|heal_wound|gain_trophy|gain_salvage|lose_salvage|gain_scar|gain_scar_choice|gain_gear|draw_artifact|gain_follower|gain_note|advance_scenario|advance_escalation|sequence)"/.test(JSON.stringify(card.rawEffectData ?? {}));
}
