import type { Stat } from "../schema/character.schema.js";

export const BROKEN_CONCORDANCE_SCENARIO_ID = "scenario_broken_concordance" as const;
export const BROKEN_CONCORDANCE_CENTER_SECTOR_ID = "center_cinder_gate" as const;

export interface BrokenConcordanceNodeDefinition {
  id: string;
  sectorId: string;
  name: string;
  stat: Stat;
  difficulty: number;
}

export const BROKEN_CONCORDANCE_NODES: readonly BrokenConcordanceNodeDefinition[] = [
  {
    id: "concordance-node-black-relay",
    sectorId: "black-relay-spire",
    name: "Black Relay Voice",
    stat: "signal",
    difficulty: 12
  },
  {
    id: "concordance-node-webglass",
    sectorId: "middle_webglass_breach",
    name: "Webglass Command Thread",
    stat: "command",
    difficulty: 12
  },
  {
    id: "concordance-node-cinder-lattice",
    sectorId: "inner_cinder_lattice",
    name: "Cinder Memory Lattice",
    stat: "guile",
    difficulty: 16
  }
] as const;

export const BROKEN_CONCORDANCE_STAGES = [
  { id: "break-the-chorus", label: "Break the Chorus", stat: "command", difficulty: 12 },
  { id: "sever-the-relay", label: "Sever the Relay", stat: "signal", difficulty: 12 },
  { id: "hold-your-name", label: "Hold Your Name", stat: "grit", difficulty: 15 }
] as const satisfies ReadonlyArray<{ id: string; label: string; stat: Stat; difficulty: number }>;

export function getBrokenConcordanceNode(nodeId: string): BrokenConcordanceNodeDefinition | null {
  return BROKEN_CONCORDANCE_NODES.find((node) => node.id === nodeId) ?? null;
}

export function getBrokenConcordanceStage(index: number) {
  return BROKEN_CONCORDANCE_STAGES[index] ?? null;
}
