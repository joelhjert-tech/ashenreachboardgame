import type { Character } from "../../schema/character.schema.js";

export function createCharacters(): Map<string, Character> {
  return new Map<string, Character>([
    [
      "void-marshal",
      {
        id: "void-marshal",
        name: "Sable Vey",
        archetype: "Void Marshal",
        currentSpaceId: "sector-a",
        status: "active",
        stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
        heat: 0,
        wounds: 0,
        scars: [],
        activeContract: null,
        heldGear: [
          {
            id: "marshal-seal",
            name: "Marshal Seal",
            slot: "utility",
            statBonus: { stat: "command", amount: 1 }
          }
        ],
        equippedGear: { weapon: null, armor: null, utility: "marshal-seal" },
        abilities: [{ id: "void-order", name: "Void Order", text: "Once per round, steady an allied operative." }]
      }
    ],
    [
      "signal-witch",
      {
        id: "signal-witch",
        name: "Naev Quill",
        archetype: "Signal Witch",
        currentSpaceId: "sector-b",
        status: "active",
        stats: { command: 1, grit: 1, signal: 4, guile: 2, forge: 1 },
        heat: 0,
        wounds: 0,
        scars: [],
        activeContract: null,
        heldGear: [
          {
            id: "tuning-spines",
            name: "Tuning Spines",
            slot: "utility",
            statBonus: { stat: "signal", amount: 1 }
          }
        ],
        equippedGear: { weapon: null, armor: null, utility: "tuning-spines" },
        abilities: [{ id: "echo-net", name: "Echo Net", text: "Peek at the top anomaly in your sector." }]
      }
    ],
    [
      "grave-engineer",
      {
        id: "grave-engineer",
        name: "Oris Vale",
        archetype: "Grave Engineer",
        currentSpaceId: "sector-c",
        status: "active",
        stats: { command: 1, grit: 2, signal: 1, guile: 1, forge: 4 },
        heat: 0,
        wounds: 0,
        scars: [],
        activeContract: null,
        heldGear: [
          {
            id: "coffin-rig",
            name: "Coffin Rig",
            slot: "armor",
            statBonus: { stat: "forge", amount: 1 }
          }
        ],
        equippedGear: { weapon: null, armor: "coffin-rig", utility: null },
        abilities: [{ id: "cold-repair", name: "Cold Repair", text: "Restore spent gear when you finish resolution in a safe sector." }]
      }
    ]
  ]);
}
