import type { GameState } from "../schema/session.schema.js";
import { getEquippedGearBonus } from "../engine/gear.js";
import { getEscalationModifier } from "../engine/escalation.js";

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
  return ["Command", "Signal", "Guile"][modeIndex % 3] ?? "Command";
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
    initialProgress: { sealTokens: 6 },
    describePressure: (state) => {
      const seals = state.scenarioProgress.sealTokens ?? 0;
      return `${seals} seals remain. Turn start rolls now remove seals on 1-2, reveal a local threat on 3-4, and hold on 5-6.`;
    },
    buildTelemetry: (state) => [
      { label: "Seal Tokens", value: String(state.scenarioProgress.sealTokens ?? 0) },
      { label: "Turn Pressure", value: "1-2 weaken | 3-4 threat | 5-6 hold" },
      { label: "Restoration", value: `${state.scenarioProgress.sealRestorationMarks ?? 0}/2` }
    ],
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
      "Heat is acting as mirror pressure. Contracts and relic gains now feed the reflection before the final duel.",
    buildTelemetry: (state) => {
      const activeSeatId = getActiveSeatId(state);
      const activeHeat =
        activeSeatId
          ? state.players.find((player) => player.seatId === activeSeatId)?.character.heat ?? 0
          : 0;

      return [
        { label: "Mirror Breaks", value: `${state.scenarioProgress.mirrorBreaks ?? 0}/2` },
        { label: "Heat Proxy", value: `${activeHeat} on active operative` },
        { label: "Reflection Feed", value: "Contracts and relic gains" }
      ];
    },
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
    }),
    onGearGained: ({ seatId, gainedGearCount }) => ({
      updater: (state) => ({
        ...state,
        players: state.players.map((player) =>
          player.seatId === seatId
            ? {
                ...player,
                character: {
                  ...player.character,
                  heat: player.character.heat + gainedGearCount
                }
              }
            : player
        )
      }),
      summary: `The mirror strains around fresh relic power. ${seatId} gains ${gainedGearCount} Heat.`
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
                  wounds: player.character.wounds + 1
                }
              }))
            : currentState.players
        }),
        summary: erupted
          ? `The Devourer reached ${nextDoom} doom. Every operative takes 1 wound and doom falls back to ${Math.max(0, nextDoom - 4)}.`
          : `The Devourer moves to ${nextSectorId}${consumedThreats > 0 ? " and consumes local threats, raising doom." : "."}`
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
      return `Engine mode is ${getEngineModeLabel(modeIndex)}. The mode rotates every turn start and sets the confrontation cadence at the Cinder Gate.`;
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
    },
    onSkillResolved: ({ getCounter, seatId, stat, success }) => {
      const modes = ["command", "signal", "guile"] as const;
      const mode = modes[getCounter("engineModeIndex", 0) % modes.length] ?? "command";

      if (stat !== mode) {
        return null;
      }

      return success
        ? {
            updater: (state) => ({
              ...state,
              players: state.players.map((player) =>
                player.seatId === seatId
                  ? {
                      ...player,
                      character: {
                        ...player.character,
                        heat: Math.max(0, player.character.heat - 1)
                      }
                    }
                  : player
              )
            }),
            summary: `The ${mode} mode aligns with ${seatId}. The Labyrinth Engine bleeds off 1 Heat after the successful test.`
          }
        : {
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
            summary: `The ${mode} mode punishes ${seatId}. The Labyrinth Engine adds 1 Heat after the failed test.`
          };
    }
  },
  scenario_dying_star: {
    initialProgress: { starTokens: 10 },
    describePressure: (state) => {
      const stars = state.scenarioProgress.starTokens ?? 0;
      return `${stars} star tokens remain. The star burns down each turn, sheds extra tokens from wounds, and resets to five after an eruption.`;
    },
    buildTelemetry: (state) => [
      { label: "Star Tokens", value: String(state.scenarioProgress.starTokens ?? 0) },
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
              wounds: passed ? 1 : 2,
              heat: passed ? 0 : 1
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
                        wounds: player.character.wounds + outcome.wounds,
                        heat: player.character.heat + outcome.heat
                      }
                    }
                  : player;
              })
            : state.players
        }),
        summary: erupted
          ? `The Dying Star erupts. Signal tests fail for ${failedSeats.join(", ") || "no one"}; failed operatives take 2 wounds and 1 Heat, passes still take 1 wound, and the star track resets to 5.`
          : `The Dying Star dims to ${nextStars} remaining star tokens.`
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
          ? `Fresh wounds tear away the final star tokens. The Dying Star erupts, every operative takes 1 wound, and the track resets to 5.`
          : `Fresh wounds strip ${woundDelta} additional star token${woundDelta === 1 ? "" : "s"} from the Dying Star.`
      };
    },
    onGearGained: ({ getCounter, gainedGearCount }) => {
      if (gainedGearCount <= 0) {
        return null;
      }

      const nextStars = getCounter("starTokens", 10) + gainedGearCount * 2;

      return {
        updater: (state) => ({
          ...state,
          scenarioProgress: {
            ...state.scenarioProgress,
            starTokens: nextStars
          }
        }),
        summary: `Recovered relic output steadies the star. ${gainedGearCount * 2} star token${gainedGearCount === 1 ? "" : "s"} return to the track.`
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
