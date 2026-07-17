export async function fetchCharacters() {
  return [{
    id: "void-marshal",
    name: "Tarek Voss",
    archetype: "Void Marshal",
    currentSpaceId: "ashwake-crossing",
    status: "active",
    stats: { command: 3, grit: 2, signal: 1, guile: 1, forge: 2 },
    trophies: 0,
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: []
  }];
}

export async function fetchScenarios() { return []; }
export async function fetchSessionSummary() {
  return {
    roomCode: "RT7P4",
    sessionMode: "multiplayer",
    gameMode: "standard",
    interactionMode: "rivalry",
    playerCount: 6,
    seats: [],
    status: "active",
    phase: "action"
  };
}
export async function createSession() { throw new Error("Unavailable in QA harness"); }
export async function startSession() { throw new Error("Unavailable in QA harness"); }
