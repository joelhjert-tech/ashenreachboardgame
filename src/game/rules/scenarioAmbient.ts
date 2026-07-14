import { createEmptyScenarioPreparationState, type GameState, type ScenarioPreparationState, type SessionMode } from "../schema/session.schema.js";
import { ENGINE_MODE_ROTATION, getEngineModeName } from "../data/scenarios.js";
import { getEquippedGearBonus } from "../engine/gear.js";
import { getEscalationModifier } from "../engine/escalation.js";
import { getBrokenSealTokenLimit, isSinglePlayerMode } from "./soloTuning.js";

export type ScenarioAmbientResolution = {
  updater: (state: GameState) => GameState;
  summary: string;
  escalationDelta?: number;
  escalationReason?: string;
  followUp?: {
    type: "draw_sector_threat";
  };
};

export type ScenarioTelemetryView = {
  label: string;
  value: string;
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

type ScenarioWoundAmbientContext = ScenarioAmbientContext & {
  woundDelta: number;
};

type ScenarioGearAmbientContext = ScenarioAmbientContext & {
  gainedGearCount: number;
};

type ScenarioSkillAmbientContext = ScenarioAmbientContext & {
  stat: string;
  success: boolean;
};

type ScenarioSectorAmbientContext = ScenarioAmbientContext & {
  sectorId: string;
};

type ScenarioAmbientRule = {
  initialProgress: Record<string, number>;
  describePressure?: (state: GameState) => string | null;
  buildTelemetry?: (state: GameState) => ScenarioTelemetryView[];
  onTurnStart?: (context: ScenarioAmbientContext) => ScenarioAmbientResolution | null;
  onTurnEnd?: (context: ScenarioAmbientContext) => ScenarioAmbientResolution | null;
  onEnemyDefeat?: (context: ScenarioAmbientContext) => ScenarioAmbientResolution | null;
  onContractCompleted?: (context: ScenarioAmbientContext) => ScenarioAmbientResolution | null;
  onWoundsTaken?: (context: ScenarioWoundAmbientContext) => ScenarioAmbientResolution | null;
  onGearGained?: (context: ScenarioGearAmbientContext) => ScenarioAmbientResolution | null;
  onSkillResolved?: (context: ScenarioSkillAmbientContext) => ScenarioAmbientResolution | null;
  onSectorEntered?: (context: ScenarioSectorAmbientContext) => ScenarioAmbientResolution | null;
};

function getActiveSeatId(state: GameState): string | null {
  return state.turnOrder[state.activeSeatIndex] ?? null;
}

function getOuterRingSectors(state: GameState) {
  return state.sectors.filter((sector) => sector.regionTier === "borderlight");
}

function getEngineModeLabel(modeIndex: number): string {
  return getEngineModeName(modeIndex);
}

function getCrownHolderSummary(state: GameState): string {
  return state.turnOrder
    .map((seatId) => ({
      seatId,
      crowns: state.scenarioProgress[getSeatCounterKey("crownClaim", seatId)] ?? 0
    }))
    .filter((entry) => entry.crowns > 0)
    .map((entry) => `${entry.seatId} x${entry.crowns}`)
    .join(", ");
}

const SCENARIO_AMBIENT_RULES: Record<string, ScenarioAmbientRule> = {
  scenario_broken_seal: {
    initialProgress: {},
    describePressure: (state) => {
      const seals = state.scenarioPreparation.resources.sealIntegrity ?? 0;
      const collapses = state.scenarioPreparation.resources.sealCollapses ?? 0;
      return isSinglePlayerMode(state.sessionMode)
        ? `${seals} seals remain. Solo pressure removes a seal on 1, reveals local Blue pressure on 2-3, and holds on 4-6. Collapses: ${collapses}.`
        : `${seals} seals remain. Pressure removes seals on 1-2, reveals local Blue pressure on 3-4, and holds on 5-6. Collapses: ${collapses}.`;
    },
    buildTelemetry: (state) => [
      { label: "Seal Integrity", value: String(state.scenarioPreparation.resources.sealIntegrity ?? 0) },
      {
        label: "Turn Pressure",
        value: isSinglePlayerMode(state.sessionMode) ? "1 weaken | 2-3 threat | 4-6 hold" : "1-2 weaken | 3-4 threat | 5-6 hold"
      },
      { label: "Collapses", value: String(state.scenarioPreparation.resources.sealCollapses ?? 0) },
      { label: "Final Restoration", value: `${state.scenarioConfrontation.progress.restorationMarks ?? 0}/2` }
    ],
    onTurnStart: ({ state, rollDie }) => {
      if (!Object.hasOwn(state.scenarioPreparation.resources, "sealIntegrity")) {
        return null;
      }

      const roll = rollDie();
      const weakenRoll = isSinglePlayerMode(state.sessionMode) ? 1 : 2;
      const threatRoll = isSinglePlayerMode(state.sessionMode) ? 3 : 4;
      const sealTokenLimit = getBrokenSealTokenLimit(state.sessionMode);

      if (roll <= weakenRoll) {
        const currentSealTokens = state.scenarioPreparation.resources.sealIntegrity ?? sealTokenLimit;
        const nextSealTokens = Math.max(0, currentSealTokens - 1);
        const collapsed = nextSealTokens === 0;
        const currentCollapses = state.scenarioPreparation.resources.sealCollapses ?? 0;
        const nextCollapses = collapsed ? currentCollapses + 1 : currentCollapses;
        const resetSealTokens = collapsed ? Math.min(3, sealTokenLimit) : nextSealTokens;

        return {
          updater: (state) => ({
            ...state,
            scenarioPreparation: {
              ...state.scenarioPreparation,
              resources: {
                ...state.scenarioPreparation.resources,
                sealIntegrity: resetSealTokens,
                ...(collapsed ? { sealCollapses: nextCollapses } : {})
              }
            },
            players:
              collapsed
                ? state.players.map((player) => ({
                  ...player,
                  character: {
                    ...player.character,
                    scars: nextCollapses >= 2 ? [...player.character.scars, "scar-wound-1"] : player.character.scars
                  }
                  }))
                : state.players
          }),
          summary:
            collapsed && nextCollapses >= 2
              ? "The Broken Seal collapsed again. Every operative gained 1 Scar, then the ward reset to 3 seals."
              : collapsed
                ? "The last seal broke. The ward reset to 3 seals."
                : `The Broken Seal weakens. ${nextSealTokens} seal tokens remain.`
        };
      }

      if (roll <= threatRoll) {
        return {
          updater: (state) => state,
          summary: "Breach static surges across the turn start and rouses a local threat.",
          followUp: {
            type: "draw_sector_threat"
          }
        };
      }

      return null;
    }
  },
  scenario_throne_of_ash: {
    initialProgress: { crownClaims: 0 },
    describePressure: (state) => {
      const claims = state.scenarioProgress.crownClaims ?? 0;
      const claimedSeats = getCrownHolderSummary(state);
      return `${claims}/3 crown claims secured.${claimedSeats ? ` Held by ${claimedSeats}.` : ""} Crowned operatives press harder in battle but crack under skill pressure.`;
    },
    buildTelemetry: (state) => {
      const activeSeatId = getActiveSeatId(state);
      const crownHolders = getCrownHolderSummary(state);

      return [
        { label: "Crown Claims", value: String(state.scenarioProgress.crownClaims ?? 0) },
        { label: "Crown Holders", value: crownHolders || "Unclaimed" },
        {
          label: "Active Crowns",
          value: activeSeatId ? String(state.scenarioProgress[getSeatCounterKey("crownClaim", activeSeatId)] ?? 0) : "0"
        }
      ];
    },
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
    },
    onWoundsTaken: ({ state, getCounter, seatId, woundDelta }) => {
      const crownSeatKey = getSeatCounterKey("crownClaim", seatId);
      const currentSeatClaims = getCounter(crownSeatKey, 0);

      if (currentSeatClaims <= 0 || woundDelta <= 0) {
        return null;
      }

      const crownsReturned = Math.min(currentSeatClaims, woundDelta);
      const nextSeatClaims = Math.max(0, currentSeatClaims - crownsReturned);
      const nextClaims = Math.max(0, getCounter("crownClaims", 0) - crownsReturned);

      return {
        updater: (currentState) => ({
          ...currentState,
          scenarioProgress: {
            ...currentState.scenarioProgress,
            crownClaims: nextClaims,
            [crownSeatKey]: nextSeatClaims
          }
        }),
        summary: `${seatId} returns ${crownsReturned} Crown token${crownsReturned === 1 ? "" : "s"} to the Throne of Ash after taking wounds.`
      };
    }
  },
  scenario_mirror_of_false_heroes: {
    initialProgress: {},
    describePressure: () =>
      "Scars act as mirror pressure until per-player Reflection is fully surfaced. Contracts, artifacts, and greedy upgrades feed the final reflection.",
    buildTelemetry: (state) => {
      const activeSeatId = getActiveSeatId(state);
      const activeScars =
        activeSeatId
          ? state.players.find((player) => player.seatId === activeSeatId)?.character.scars.length ?? 0
          : 0;

      return [
        { label: "Mirror Breaks", value: `${state.scenarioProgress.mirrorBreaks ?? 0}/2` },
        { label: "Scar Pressure", value: `${activeScars} on active operative` },
        { label: "Reflection Feed", value: "Contracts, artifacts, Scars" }
      ];
    },
    onContractCompleted: ({ seatId }) => ({
      updater: (state) => ({
        ...state,
        scenarioProgress: {
          ...state.scenarioProgress,
          mirrorPressure: (state.scenarioProgress.mirrorPressure ?? 0) + 1
        }
      }),
      summary: "The mirror feeds on selfish praise. Mirror pressure rises by 1."
    }),
    onGearGained: ({ seatId, gainedGearCount }) => ({
      updater: (state) => ({
        ...state,
        scenarioProgress: {
          ...state.scenarioProgress,
          mirrorPressure: (state.scenarioProgress.mirrorPressure ?? 0) + gainedGearCount
        }
      }),
      summary: `The mirror strains around fresh artifact power. Mirror pressure rises by ${gainedGearCount}.`
    })
  },
  scenario_devourer_beneath: {
    initialProgress: { doomTokens: 0, devourerIndex: 0 },
    describePressure: (state) => {
      const outerRing = getOuterRingSectors(state);
      const index = state.scenarioProgress.devourerIndex ?? 0;
      const sector = outerRing.length > 0 ? outerRing[index % outerRing.length] ?? null : null;
      const doom = state.scenarioProgress.doomTokens ?? 0;
      return `Doom stands at ${doom}/8. The Devourer circles ${sector?.name ?? "the outer ring"} and devours local threats as it moves.`;
    },
    buildTelemetry: (state) => {
      const outerRing = getOuterRingSectors(state);
      const devourerIndex = state.scenarioProgress.devourerIndex ?? 0;
      const devourerSector = outerRing.length > 0 ? outerRing[devourerIndex % outerRing.length] ?? null : null;

      return [
        { label: "Doom Tokens", value: String(state.scenarioProgress.doomTokens ?? 0) },
        { label: "Devourer", value: devourerSector?.name ?? "Outer ring" },
        { label: "Collapse Pulse", value: "At 8 doom, then reset by 4" }
      ];
    },
    onTurnEnd: ({ state, getCounter, getOuterRingSectorIds }) => {
      if (!Object.hasOwn(state.scenarioProgress, "devourerIndex")) {
        return null;
      }

      const outerRing = getOuterRingSectorIds();

      if (outerRing.length === 0) {
        return null;
      }

      const currentDoom = getCounter("doomTokens", 0);
      const movement = currentDoom >= 4 ? 2 : 1;
      const nextIndex = (getCounter("devourerIndex", 0) + movement) % outerRing.length;
      const nextSectorId = outerRing[nextIndex]!;
      const sector = state.sectors.find((entry) => entry.id === nextSectorId);
      const consumedThreats = sector?.encounterDecks.threat.length ?? 0;
      const nextDoom = currentDoom + (consumedThreats > 0 ? 1 : 0);
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
                  wounds: player.character.wounds + 1
                }
              }))
            : currentState.players
        }),
        summary: erupted
          ? `The Devourer reached ${nextDoom} doom. Every operative takes 1 wound and doom falls back to ${Math.max(0, nextDoom - 4)}.`
          : `The Devourer moves ${movement} sector${movement === 1 ? "" : "s"} to ${nextSectorId}${consumedThreats > 0 ? " and consumes local threats, raising doom." : "."}`
      };
    },
    onSectorEntered: ({ state, seatId, sectorId, getCounter, getOuterRingSectorIds, rollDie }) => {
      const outerRing = getOuterRingSectorIds();

      if (outerRing.length === 0) {
        return null;
      }

      const devourerSectorId = outerRing[getCounter("devourerIndex", 0) % outerRing.length] ?? null;

      if (!devourerSectorId || devourerSectorId !== sectorId) {
        return null;
      }

      const player = state.players.find((entry) => entry.seatId === seatId);

      if (!player) {
        return null;
      }

      const rollTotal = rollDie() + rollDie();
      const escalationModifier = getEscalationModifier(state.escalationLevel);
      const statBonus = player.character.stats.grit + getEquippedGearBonus(player.character, "grit");
      const difficulty = 8 + escalationModifier;
      const total = rollTotal + statBonus;
      const success = total >= difficulty;
      const nextDoom = success ? Math.max(0, getCounter("doomTokens", 0) - 1) : getCounter("doomTokens", 0) + 1;

      return {
        updater: (currentState) => ({
          ...currentState,
          scenarioProgress: {
            ...currentState.scenarioProgress,
            doomTokens: nextDoom
          },
          players: currentState.players.map((entry) =>
            entry.seatId === seatId && !success
              ? {
                  ...entry,
                  character: {
                    ...entry.character,
                    wounds: entry.character.wounds + 1
                  }
                }
              : entry
          )
        }),
        summary: success
          ? `The Devourer lashes out in ${sectorId}, but the operative holds with ${total} against ${difficulty}. Doom falls to ${nextDoom}.`
          : `The Devourer catches the operative in ${sectorId}. ${total} fails against ${difficulty}; take 1 wound and doom rises to ${nextDoom}.`,
        escalationDelta: success ? 0 : 1,
        escalationReason: success ? undefined : "devourer clash"
      };
    }
  },
  scenario_labyrinth_engine: {
    initialProgress: { engineModeIndex: 0 },
    describePressure: (state) => {
      const modeIndex = state.scenarioProgress.engineModeIndex ?? 0;
      return `Engine mode is ${getEngineModeLabel(modeIndex)}. The mode rotates every turn start and sets the confrontation cadence at the Ashen Reach Core.`;
    },
    buildTelemetry: (state) => {
      const modeIndex = state.scenarioProgress.engineModeIndex ?? 0;
      return [
        { label: "Engine Mode", value: getEngineModeLabel(modeIndex) },
        { label: "Rotation", value: "Turn start" },
        { label: "Shutdown", value: `${state.scenarioProgress.shutdownMarks ?? 0}/2` }
      ];
    },
    onTurnStart: ({ state, getCounter }) => {
      if (!Object.hasOwn(state.scenarioProgress, "engineModeIndex")) {
        return null;
      }

      const nextMode = (getCounter("engineModeIndex", 0) + 1) % ENGINE_MODE_ROTATION.length;

      return {
        updater: (state) => ({
          ...state,
          scenarioProgress: {
            ...state.scenarioProgress,
            engineModeIndex: nextMode
          }
        }),
        summary: `The Labyrinth Engine shifts to ${getEngineModeLabel(nextMode)} mode.`
      };
    },
    onSkillResolved: ({ getCounter, seatId, stat, success }) => {
      const mode = ENGINE_MODE_ROTATION[getCounter("engineModeIndex", 0) % ENGINE_MODE_ROTATION.length] ?? "command";

      if (stat !== mode) {
        return null;
      }

      return success
        ? {
            updater: (state) => state,
            summary: `The ${mode} mode aligns with ${seatId}. The Labyrinth Engine stabilizes without changing persistent status.`
          }
        : {
            updater: (state) => ({
              ...state,
              scenarioProgress: {
                ...state.scenarioProgress,
                engineInstability: (state.scenarioProgress.engineInstability ?? 0) + 1
              }
            }),
            summary: `The ${mode} mode punishes ${seatId}. The Labyrinth Engine gains 1 instability after the failed test.`
          };
    }
  },
  scenario_dying_star: {
    initialProgress: { starTokens: 10 },
    describePressure: (state) => {
      const stars = state.scenarioProgress.starTokens ?? 0;
      return `${stars} Starfire tokens remain. The star burns down each turn, sheds extra tokens from wounds, and resets to five after an eruption.`;
    },
    buildTelemetry: (state) => [
      { label: "Starfire", value: String(state.scenarioProgress.starTokens ?? 0) },
      { label: "Wound Burn", value: "Fresh wounds strip extra stars" },
      { label: "Ignition", value: `${state.scenarioProgress.ignitionMarks ?? 0}/3` }
    ],
    onTurnEnd: ({ state, getCounter, rollDie }) => {
      if (!Object.hasOwn(state.scenarioProgress, "starTokens")) {
        return null;
      }

      const nextStars = Math.max(0, getCounter("starTokens", 10) - 1);
      const erupted = nextStars === 0;
      const eruptionOutcomes = erupted
        ? state.players.map((player) => {
            const rollTotal = rollDie() + rollDie();
            const signalTotal =
              rollTotal +
              player.character.stats.signal +
              getEquippedGearBonus(player.character, "signal");
            const passed = signalTotal >= 12;

            return {
              seatId: player.seatId,
              passed,
              wounds: passed ? 1 : 2
            };
          })
        : [];
      const failedSeats = eruptionOutcomes.filter((entry) => !entry.passed).map((entry) => entry.seatId);

      return {
        updater: (state) => ({
          ...state,
          scenarioProgress: {
            ...state.scenarioProgress,
            starTokens: erupted ? 5 : nextStars
          },
          players: erupted
            ? state.players.map((player) => {
                const outcome = eruptionOutcomes.find((entry) => entry.seatId === player.seatId);

                return outcome
                  ? {
                      ...player,
                      character: {
                        ...player.character,
                        wounds: player.character.wounds + outcome.wounds
                      }
                    }
                  : player;
              })
            : state.players
        }),
        summary: erupted
          ? `The Dying Star erupts. Signal tests fail for ${failedSeats.join(", ") || "no one"}; failed operatives take 2 wounds, passes still take 1 wound, and Starfire resets to 5.`
          : `The Dying Star dims to ${nextStars} remaining Starfire tokens.`
      };
    },
    onWoundsTaken: ({ getCounter, woundDelta }) => {
      if (woundDelta <= 0) {
        return null;
      }

      const currentStars = getCounter("starTokens", 10);
      const nextStars = Math.max(0, currentStars - woundDelta);
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
          ? `Fresh wounds tear away the final Starfire tokens. The Dying Star erupts, every operative takes 1 wound, and the track resets to 5.`
          : `Fresh wounds strip ${woundDelta} additional Starfire token${woundDelta === 1 ? "" : "s"} from the Dying Star.`
      };
    },
    onGearGained: ({ getCounter, gainedGearCount }) => {
      if (gainedGearCount <= 0) {
        return null;
      }

      const nextStars = Math.min(12, getCounter("starTokens", 10) + gainedGearCount * 2);

      return {
        updater: (state) => ({
          ...state,
          scenarioProgress: {
            ...state.scenarioProgress,
            starTokens: nextStars
          }
        }),
        summary: `Recovered artifact output steadies the star. ${gainedGearCount * 2} Starfire token${gainedGearCount === 1 ? "" : "s"} return to the track.`
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

function resolveScenarioWoundAmbient(
  scenarioId: string,
  context: ScenarioWoundAmbientContext
): ScenarioAmbientResolution | null {
  const rule = getScenarioRule(scenarioId);
  return rule?.onWoundsTaken?.(context) ?? null;
}

function resolveScenarioGearAmbient(
  scenarioId: string,
  context: ScenarioGearAmbientContext
): ScenarioAmbientResolution | null {
  const rule = getScenarioRule(scenarioId);
  return rule?.onGearGained?.(context) ?? null;
}

function resolveScenarioSkillAmbient(
  scenarioId: string,
  context: ScenarioSkillAmbientContext
): ScenarioAmbientResolution | null {
  const rule = getScenarioRule(scenarioId);
  return rule?.onSkillResolved?.(context) ?? null;
}

function resolveScenarioSectorAmbient(
  scenarioId: string,
  context: ScenarioSectorAmbientContext
): ScenarioAmbientResolution | null {
  const rule = getScenarioRule(scenarioId);
  return rule?.onSectorEntered?.(context) ?? null;
}

export function createInitialScenarioProgress(
  scenarioId: string,
  sessionMode: SessionMode = "multiplayer"
): Record<string, number> {
  const progress = { ...(getScenarioRule(scenarioId)?.initialProgress ?? {}) };

  return progress;
}

export function createInitialScenarioPreparation(
  scenarioId: string,
  sessionMode: SessionMode = "multiplayer"
): ScenarioPreparationState {
  const preparation: ScenarioPreparationState = createEmptyScenarioPreparationState();
  if (scenarioId === "scenario_broken_seal") {
    preparation.resources.sealIntegrity = getBrokenSealTokenLimit(sessionMode);
  }
  return preparation;
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

export function resolveScenarioWoundsTaken(context: ScenarioWoundAmbientContext): ScenarioAmbientResolution | null {
  return resolveScenarioWoundAmbient(context.state.activeScenarioId, context);
}

export function resolveScenarioGearGained(context: ScenarioGearAmbientContext): ScenarioAmbientResolution | null {
  return resolveScenarioGearAmbient(context.state.activeScenarioId, context);
}

export function resolveScenarioSkillResolved(context: ScenarioSkillAmbientContext): ScenarioAmbientResolution | null {
  return resolveScenarioSkillAmbient(context.state.activeScenarioId, context);
}

export function resolveScenarioSectorEntered(context: ScenarioSectorAmbientContext): ScenarioAmbientResolution | null {
  return resolveScenarioSectorAmbient(context.state.activeScenarioId, context);
}

export function describeScenarioPressure(state: GameState): string | null {
  return getScenarioRule(state.activeScenarioId)?.describePressure?.(state) ?? null;
}

export function buildScenarioTelemetry(state: GameState): ScenarioTelemetryView[] {
  return getScenarioRule(state.activeScenarioId)?.buildTelemetry?.(state) ?? [];
}
