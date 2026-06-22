import type { GameState } from "../schema/session.schema.js";

export type ScenarioAmbientResolution = {
  updater: (state: GameState) => GameState;
  summary: string;
  followUp?: {
    type: "draw_sector_threat";
  };
};

function getSeatCounterKey(prefix: string, seatId: string): string {
  return `${prefix}:${seatId}`;
}

type ScenarioAmbientContext = {
  state: GameState;
  seatId: string;
  rollDie: () => number;
  getCounter: (key: string, fallback?: number) => number;
  getOuterRingSectorIds: () => string[];
};

type ScenarioAmbientRule = {
  initialProgress: Record<string, number>;
  onTurnStart?: (context: ScenarioAmbientContext) => ScenarioAmbientResolution | null;
  onTurnEnd?: (context: ScenarioAmbientContext) => ScenarioAmbientResolution | null;
  onEnemyDefeat?: (context: ScenarioAmbientContext) => ScenarioAmbientResolution | null;
  onContractCompleted?: (context: ScenarioAmbientContext) => ScenarioAmbientResolution | null;
};

const SCENARIO_AMBIENT_RULES: Record<string, ScenarioAmbientRule> = {
  scenario_broken_seal: {
    initialProgress: { sealTokens: 6 },
    onTurnStart: ({ state, rollDie, getCounter, seatId }) => {
      if (!Object.hasOwn(state.scenarioProgress, "sealTokens")) {
        return null;
      }

      const roll = rollDie();

      if (roll <= 2) {
        const nextSealTokens = Math.max(0, getCounter("sealTokens", 6) - 1);

        return {
          updater: (state) => ({
            ...state,
            scenarioProgress: {
              ...state.scenarioProgress,
              sealTokens: nextSealTokens
            },
            players:
              nextSealTokens === 0
                ? state.players.map((player) => ({
                    ...player,
                    character: {
                      ...player.character,
                      heat: player.character.heat + 1
                    }
                  }))
                : state.players
          }),
          summary:
            nextSealTokens === 0
              ? "The last seal broke. Every operative gained 1 Heat."
              : `The Broken Seal weakens. ${nextSealTokens} seal tokens remain.`
        };
      }

      if (roll <= 4) {
        return {
          updater: (state) => state,
          summary: "Breach static surges across the turn start and rouses a local threat.",
          followUp: {
            type: "draw_sector_threat"
          }
        };
      }

      return null;
    },
    onEnemyDefeat: ({ state, getCounter }) => {
      if (!Object.hasOwn(state.scenarioProgress, "sealTokens")) {
        return null;
      }

      const nextSealTokens = Math.min(6, getCounter("sealTokens", 6) + 1);

      return {
        updater: (state) => ({
          ...state,
          scenarioProgress: {
            ...state.scenarioProgress,
            sealTokens: nextSealTokens
          }
        }),
        summary: `The enemy defeat strengthens the ward. ${nextSealTokens} seal tokens now stand.`
      };
    }
  },
  scenario_throne_of_ash: {
    initialProgress: { crownClaims: 0 },
    onEnemyDefeat: ({ state, getCounter, seatId }) => {
      if (!Object.hasOwn(state.scenarioProgress, "crownClaims")) {
        return null;
      }

      const currentClaims = getCounter("crownClaims", 0);

      if (currentClaims >= 3) {
        return null;
      }

      const nextClaims = currentClaims + 1;
      const crownSeatKey = getSeatCounterKey("crownClaim", seatId);
      const nextSeatClaims = getCounter(crownSeatKey, 0) + 1;

      return {
        updater: (state) => ({
          ...state,
          scenarioProgress: {
            ...state.scenarioProgress,
            crownClaims: nextClaims,
            [crownSeatKey]: nextSeatClaims
          }
        }),
        summary: `A Crown claim is secured. ${nextClaims}/3 claims are now held, and ${seatId} now carries ${nextSeatClaims}.`
      };
    },
    onContractCompleted: ({ state, getCounter, seatId }) => {
      if (!Object.hasOwn(state.scenarioProgress, "crownClaims")) {
        return null;
      }

      const currentClaims = getCounter("crownClaims", 0);

      if (currentClaims >= 3) {
        return null;
      }

      const nextClaims = currentClaims + 1;
      const crownSeatKey = getSeatCounterKey("crownClaim", seatId);
      const nextSeatClaims = getCounter(crownSeatKey, 0) + 1;

      return {
        updater: (state) => ({
          ...state,
          scenarioProgress: {
            ...state.scenarioProgress,
            crownClaims: nextClaims,
            [crownSeatKey]: nextSeatClaims
          }
        }),
        summary: `A Crown claim is secured through a completed contract. ${nextClaims}/3 claims are now held, and ${seatId} now carries ${nextSeatClaims}.`
      };
    }
  },
  scenario_mirror_of_false_heroes: {
    initialProgress: {},
    onContractCompleted: ({ seatId }) => ({
      updater: (state) => ({
        ...state,
        players: state.players.map((player) =>
          player.seatId === seatId
            ? {
                ...player,
                character: {
                  ...player.character,
                  heat: player.character.heat + 1
                }
              }
            : player
        )
      }),
      summary: "The mirror feeds on praise. The active operative gains 1 Heat."
    })
  },
  scenario_devourer_beneath: {
    initialProgress: { doomTokens: 0, devourerIndex: 0 },
    onTurnEnd: ({ state, getCounter, getOuterRingSectorIds }) => {
      if (!Object.hasOwn(state.scenarioProgress, "devourerIndex")) {
        return null;
      }

      const outerRing = getOuterRingSectorIds();

      if (outerRing.length === 0) {
        return null;
      }

      const nextIndex = (getCounter("devourerIndex", 0) + 1) % outerRing.length;
      const nextSectorId = outerRing[nextIndex]!;
      const sector = state.sectors.find((entry) => entry.id === nextSectorId);
      const consumedThreats = sector?.encounterDecks.threat.length ?? 0;
      const nextDoom = getCounter("doomTokens", 0) + (consumedThreats > 0 ? 1 : 0);
      const erupted = nextDoom >= 8;

      return {
        updater: (currentState) => ({
          ...currentState,
          scenarioProgress: {
            ...currentState.scenarioProgress,
            devourerIndex: nextIndex,
            doomTokens: erupted ? Math.max(0, nextDoom - 4) : nextDoom
          },
          sectors: currentState.sectors.map((entry) =>
            entry.id === nextSectorId
              ? {
                  ...entry,
                  encounterDecks: {
                    ...entry.encounterDecks,
                    threat: []
                  }
                }
              : entry
          ),
          players: erupted
            ? currentState.players.map((player) => ({
                ...player,
                character: {
                  ...player.character,
                  heat: player.character.heat + 1
                }
              }))
            : currentState.players
        }),
        summary: erupted
          ? `The Devourer reached ${nextDoom} doom. The table suffers 1 Heat each and doom falls back to ${Math.max(0, nextDoom - 4)}.`
          : `The Devourer moves to ${nextSectorId}${consumedThreats > 0 ? " and consumes local threats, raising doom." : "."}`
      };
    }
  },
  scenario_labyrinth_engine: {
    initialProgress: { engineModeIndex: 0 },
    onTurnStart: ({ state, getCounter }) => {
      if (!Object.hasOwn(state.scenarioProgress, "engineModeIndex")) {
        return null;
      }

      const nextMode = (getCounter("engineModeIndex", 0) + 1) % 3;

      return {
        updater: (state) => ({
          ...state,
          scenarioProgress: {
            ...state.scenarioProgress,
            engineModeIndex: nextMode
          }
        }),
        summary: `The Labyrinth Engine shifts to mode ${nextMode}.`
      };
    }
  },
  scenario_dying_star: {
    initialProgress: { starTokens: 10 },
    onTurnEnd: ({ state, getCounter }) => {
      if (!Object.hasOwn(state.scenarioProgress, "starTokens")) {
        return null;
      }

      const nextStars = Math.max(0, getCounter("starTokens", 10) - 1);
      const erupted = nextStars === 0;

      return {
        updater: (state) => ({
          ...state,
          scenarioProgress: {
            ...state.scenarioProgress,
            starTokens: erupted ? 5 : nextStars
          },
          players: erupted
            ? state.players.map((player) => ({
                ...player,
                character: {
                  ...player.character,
                  wounds: player.character.wounds + 1
                }
              }))
            : state.players
        }),
        summary: erupted
          ? "The Dying Star erupts. Every operative takes 1 wound and the star track resets to 5."
          : `The Dying Star dims to ${nextStars} remaining star tokens.`
      };
    }
  }
};

function getScenarioRule(scenarioId: string): ScenarioAmbientRule | null {
  return SCENARIO_AMBIENT_RULES[scenarioId] ?? null;
}

function resolveScenarioAmbient(
  scenarioId: string,
  context: ScenarioAmbientContext,
  lifecycle: keyof Pick<ScenarioAmbientRule, "onTurnStart" | "onTurnEnd" | "onEnemyDefeat" | "onContractCompleted">
): ScenarioAmbientResolution | null {
  const rule = getScenarioRule(scenarioId);
  const handler = rule?.[lifecycle];

  if (!handler) {
    return null;
  }

  return handler(context);
}

export function createInitialScenarioProgress(scenarioId: string): Record<string, number> {
  return { ...(getScenarioRule(scenarioId)?.initialProgress ?? {}) };
}

export function resolveScenarioTurnStart(context: ScenarioAmbientContext): ScenarioAmbientResolution | null {
  return resolveScenarioAmbient(context.state.activeScenarioId, context, "onTurnStart");
}

export function resolveScenarioTurnEnd(context: ScenarioAmbientContext): ScenarioAmbientResolution | null {
  return resolveScenarioAmbient(context.state.activeScenarioId, context, "onTurnEnd");
}

export function resolveScenarioEnemyDefeat(context: ScenarioAmbientContext): ScenarioAmbientResolution | null {
  return resolveScenarioAmbient(context.state.activeScenarioId, context, "onEnemyDefeat");
}

export function resolveScenarioContractCompleted(context: ScenarioAmbientContext): ScenarioAmbientResolution | null {
  return resolveScenarioAmbient(context.state.activeScenarioId, context, "onContractCompleted");
}

export function describeScenarioPressure(state: GameState): string | null {
  switch (state.activeScenarioId) {
    case "scenario_broken_seal": {
      const seals = state.scenarioProgress.sealTokens ?? 0;
      return `${seals} seals remain. Each turn start, 1-2 weakens the ward and 3-4 reveals a local threat.`;
    }
    case "scenario_throne_of_ash": {
      const claims = state.scenarioProgress.crownClaims ?? 0;
      const claimedSeats = state.turnOrder
        .map((seatId) => ({
          seatId,
          claims: state.scenarioProgress[getSeatCounterKey("crownClaim", seatId)] ?? 0
        }))
        .filter((entry) => entry.claims > 0)
        .map((entry) => `${entry.seatId} x${entry.claims}`)
        .join(", ");
      return `${claims}/3 crown claims secured.${claimedSeats ? ` Held by ${claimedSeats}.` : ""} Defeated enemies and completed contracts push the throne race forward.`;
    }
    case "scenario_mirror_of_false_heroes":
      return "Heat is acting as mirror pressure. Completed contracts feed the reflection before the final duel.";
    case "scenario_devourer_beneath": {
      const outerRing = state.sectors.filter((sector) => sector.regionTier === "borderlight");
      const index = state.scenarioProgress.devourerIndex ?? 0;
      const sector = outerRing.length > 0 ? outerRing[index % outerRing.length] ?? null : null;
      const doom = state.scenarioProgress.doomTokens ?? 0;
      return `Doom stands at ${doom}/8. The Devourer circles ${sector?.name ?? "the outer ring"} and eats local threats as it moves.`;
    }
    case "scenario_labyrinth_engine": {
      const modeIndex = state.scenarioProgress.engineModeIndex ?? 0;
      const mode = ["Command", "Signal", "Guile"][modeIndex % 3] ?? "Command";
      return `Engine mode is ${mode}. The mode rotates every turn start and sets the confrontation cadence.`;
    }
    case "scenario_dying_star": {
      const stars = state.scenarioProgress.starTokens ?? 0;
      return `${stars} star tokens remain. The star burns down each turn, erupts at zero, then resets to five.`;
    }
    default:
      return null;
  }
}
